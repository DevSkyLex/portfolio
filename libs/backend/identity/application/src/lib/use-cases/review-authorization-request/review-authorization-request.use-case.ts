import {
  AuthorizationRequest,
  type OAuthClient,
  OAuthError,
  type OAuthGrant,
  type OAuthScope,
  parseScopes,
} from '@vfortin/identity-domain';
import type {
  Clock,
  IdGenerator,
} from '@internal/identity-application/lib/ports/identity/identity.ports';
import type {
  ClientMetadataFetcher,
  OAuthServerSettings,
  OAuthUnitOfWork,
} from '@internal/identity-application/lib/ports/oauth/oauth.ports';
import { authorizationRedirect } from '@internal/identity-application/lib/use-cases/oauth-redirect/oauth-redirect';
import { matchesResource } from '@internal/identity-application/lib/use-cases/resource-indicator/resource-indicator';
import { resolveClient } from '@internal/identity-application/lib/use-cases/resolve-client/resolve-client';

/**
 * Constant CODE_CHALLENGE
 *
 * @description
 * Shape of a PKCE challenge: 43 to 128 unreserved characters (an `S256` challenge is 43).
 *
 * @type {RegExp}
 */
const CODE_CHALLENGE: RegExp = /^[A-Za-z0-9._~-]{43,128}$/;

/**
 * Constant MAX_STATE_LENGTH
 *
 * @description
 * Longest `state` echoed back to the client, in characters.
 *
 * @type {number}
 */
export const MAX_STATE_LENGTH = 1024 as const;

/**
 * Interface AuthorizationParameters
 * @interface AuthorizationParameters
 *
 * @description
 * Query parameters received at the authorization endpoint, `null` when absent.
 */
export interface AuthorizationParameters {
  // #region Properties
  /** `response_type`. */
  readonly responseType: string | null;
  /** `client_id`. */
  readonly clientId: string | null;
  /** `redirect_uri`. */
  readonly redirectUri: string | null;
  /** `scope`. */
  readonly scope: string | null;
  /** `state`. */
  readonly state: string | null;
  /** `code_challenge`. */
  readonly codeChallenge: string | null;
  /** `code_challenge_method`. */
  readonly codeChallengeMethod: string | null;
  /** `resource` (RFC 8707). */
  readonly resource: string | null;
  /** Names of the parameters that appeared more than once. */
  readonly repeated: readonly string[];
  // #endregion
}

/**
 * Interface ReviewAuthorizationCommand
 * @interface ReviewAuthorizationCommand
 *
 * @description
 * Authorization request reviewed by a signed-in administrator session.
 */
export interface ReviewAuthorizationCommand {
  // #region Properties
  /** Subject of the administrator access token. */
  readonly accountId: string;
  /** Session (`sid`) of the administrator access token. */
  readonly sessionId: string;
  /** Request parameters. */
  readonly parameters: AuthorizationParameters;
  // #endregion
}

/**
 * Type AuthorizationReview
 * @type AuthorizationReview
 *
 * @description
 * Pending request to show on the consent screen, or the error redirect to send the browser to.
 */
export type AuthorizationReview =
  | {
      readonly kind: 'consent';
      readonly request: AuthorizationRequest;
      readonly client: OAuthClient;
      readonly grantedScopes: readonly OAuthScope[];
    }
  | { readonly kind: 'redirect'; readonly redirectTo: string };

/**
 * Interface ValidatedParameters
 * @interface ValidatedParameters
 *
 * @description
 * Parameters checked once the redirect URI is trusted.
 */
interface ValidatedParameters {
  // #region Properties
  readonly scopes: readonly OAuthScope[];
  readonly codeChallenge: string;
  readonly resource: string;
  // #endregion
}

/**
 * Class ReviewAuthorizationRequest
 * @class ReviewAuthorizationRequest
 *
 * @description
 * First step of the authorization endpoint (D45), run for the administrator signed in on the consent
 * page. Until the client and its redirect URI are established, a failure is answered to the page,
 * never redirected (no open redirect); after that, failures go back to the client as error
 * redirects with `state` and `iss`. A valid request is stored, bound to the reviewing session, and
 * always shown for consent: a previous consent never authorizes silently.
 */
export class ReviewAuthorizationRequest {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Supplies the transaction boundary, the outbound fetcher, settings and non-determinism.
   *
   * @param {OAuthUnitOfWork} unitOfWork - Transaction boundary.
   * @param {ClientMetadataFetcher} fetcher - Metadata document and logo fetches.
   * @param {OAuthServerSettings} settings - Issuer and resource.
   * @param {IdGenerator} ids - Request identifiers.
   * @param {Clock} clock - Review time.
   */
  public constructor(
    private readonly unitOfWork: OAuthUnitOfWork,
    private readonly fetcher: ClientMetadataFetcher,
    private readonly settings: OAuthServerSettings,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Validates the request, resolves its client and stores it pending.
   *
   * @param {ReviewAuthorizationCommand} command - Session and parameters.
   *
   * @returns {Promise<AuthorizationReview>} Consent to show or error redirect.
   *
   * @throws {OAuthError} `invalid_request` without a single `client_id`, `invalid_client` for an
   * unknown client, `invalid_redirect_uri` for a missing or unregistered redirect URI.
   */
  public async execute(command: ReviewAuthorizationCommand): Promise<AuthorizationReview> {
    const now: Date = this.clock.now();
    const parameters: AuthorizationParameters = command.parameters;
    if (parameters.repeated.includes('client_id') || !parameters.clientId) {
      throw new OAuthError('invalid_request', 'A single client_id is required.');
    }
    const client: OAuthClient = await resolveClient(
      this.unitOfWork,
      this.fetcher,
      parameters.clientId,
      now,
    );
    const redirectUri: string | null = parameters.redirectUri;
    if (
      parameters.repeated.includes('redirect_uri') ||
      redirectUri === null ||
      !client.allowsRedirect(redirectUri)
    ) {
      throw new OAuthError(
        'invalid_redirect_uri',
        'redirect_uri is missing or not registered for this client.',
      );
    }
    const state: string | null =
      parameters.repeated.includes('state') || (parameters.state?.length ?? 0) > MAX_STATE_LENGTH
        ? null
        : parameters.state;
    let validated: ValidatedParameters;
    try {
      validated = this.validate(parameters);
    } catch (error: unknown) {
      if (!(error instanceof OAuthError)) {
        throw error;
      }
      return {
        kind: 'redirect',
        redirectTo: authorizationRedirect(
          redirectUri,
          { error: error.error, error_description: error.description, state },
          this.settings.issuer,
        ),
      };
    }
    return this.unitOfWork.run(async ({ requests, grants }): Promise<AuthorizationReview> => {
      await requests.deleteExpired(now);
      const grant: OAuthGrant | null = await grants.lockActive(command.accountId, client.id);
      const request: AuthorizationRequest = AuthorizationRequest.open(
        {
          id: this.ids.next(),
          accountId: command.accountId,
          sessionId: command.sessionId,
          clientId: client.id,
          redirectUri,
          scopes: validated.scopes,
          resource: validated.resource,
          state,
          codeChallenge: validated.codeChallenge,
        },
        now,
      );
      await requests.add(request);
      return { kind: 'consent', request, client, grantedScopes: grant?.scopes ?? [] };
    });
  }

  /**
   * Method validate
   * @method validate
   *
   * @description
   * Checks the parameters that are answered by redirect: no repetition, the code flow, PKCE `S256`
   * (OAuth 2.1), the configured resource (RFC 8707, required) and known scopes.
   *
   * @param {AuthorizationParameters} parameters - Request parameters.
   *
   * @returns {ValidatedParameters} Scopes, challenge and resource.
   *
   * @throws {OAuthError} `invalid_request`, `unsupported_response_type`, `invalid_target` or
   * `invalid_scope`.
   */
  private validate(parameters: AuthorizationParameters): ValidatedParameters {
    if (parameters.repeated.length > 0) {
      throw new OAuthError('invalid_request', 'Request parameters must not be repeated.');
    }
    if (parameters.state !== null && parameters.state.length > MAX_STATE_LENGTH) {
      throw new OAuthError('invalid_request', 'The state parameter is too long.');
    }
    if (parameters.responseType === null) {
      throw new OAuthError('invalid_request', 'response_type is required.');
    }
    if (parameters.responseType !== 'code') {
      throw new OAuthError(
        'unsupported_response_type',
        'Only the code response type is supported.',
      );
    }
    if (
      parameters.codeChallengeMethod !== 'S256' ||
      parameters.codeChallenge === null ||
      !CODE_CHALLENGE.test(parameters.codeChallenge)
    ) {
      throw new OAuthError('invalid_request', 'PKCE with the S256 method is required.');
    }
    if (parameters.resource === null) {
      throw new OAuthError('invalid_target', 'The resource parameter is required.');
    }
    if (!matchesResource(parameters.resource, this.settings.resource)) {
      throw new OAuthError('invalid_target', 'The requested resource is not served here.');
    }
    return {
      scopes: parseScopes(parameters.scope),
      codeChallenge: parameters.codeChallenge,
      resource: this.settings.resource,
    };
  }
  // #endregion
}
