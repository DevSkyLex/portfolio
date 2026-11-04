import {
  AuthorizationCode,
  type AuthorizationRequest,
  type AuthorizationRequestProps,
  type OAuthClient,
  OAuthGrant,
} from '@vfortin/identity-domain';
import { AuthorizationRequestExpiredError } from '@internal/identity-application/lib/errors/application-error';
import type {
  Clock,
  IdGenerator,
  RefreshTokenCodec,
} from '@internal/identity-application/lib/ports/identity/identity.ports';
import type {
  OAuthServerSettings,
  OAuthUnitOfWork,
} from '@internal/identity-application/lib/ports/oauth/oauth.ports';
import { authorizationRedirect } from '@internal/identity-application/lib/use-cases/oauth-redirect/oauth-redirect';

/**
 * Interface AuthorizationDecisionCommand
 * @interface AuthorizationDecisionCommand
 *
 * @description
 * Decision of an administrator session on a pending request.
 */
export interface AuthorizationDecisionCommand {
  // #region Properties
  /** Pending request identifier. */
  readonly requestId: string;
  /** Subject of the administrator access token. */
  readonly accountId: string;
  /** Session (`sid`) of the administrator access token. */
  readonly sessionId: string;
  // #endregion
}

/**
 * Class ApproveAuthorizationRequest
 * @class ApproveAuthorizationRequest
 *
 * @description
 * « Autoriser » on the consent screen (D45): records or extends the grant, issues a single-use
 * authorization code bound to the client, redirect URI, PKCE challenge, scopes and resource, stored
 * hashed, and returns the redirect carrying it with `state` and `iss`.
 */
export class ApproveAuthorizationRequest {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Supplies the transaction boundary, settings and credential services.
   *
   * @param {OAuthUnitOfWork} unitOfWork - Transaction boundary.
   * @param {OAuthServerSettings} settings - Issuer.
   * @param {RefreshTokenCodec} codec - Generates and hashes the code.
   * @param {IdGenerator} ids - Grant and code identifiers.
   * @param {Clock} clock - Decision time.
   */
  public constructor(
    private readonly unitOfWork: OAuthUnitOfWork,
    private readonly settings: OAuthServerSettings,
    private readonly codec: RefreshTokenCodec,
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
   * Locks the request, then the client's active grant, and commits the grant, the code and the
   * decision together.
   *
   * @param {AuthorizationDecisionCommand} command - Request and deciding session.
   *
   * @returns {Promise<string>} Redirect URL with `code`, `state` and `iss`.
   *
   * @throws {AuthorizationRequestExpiredError} When the request cannot be decided by this session.
   */
  public async execute(command: AuthorizationDecisionCommand): Promise<string> {
    const now: Date = this.clock.now();
    const code: string = this.codec.generate();
    return this.unitOfWork.run(async ({ requests, grants, codes, clients }): Promise<string> => {
      const request: AuthorizationRequest | null = await requests.lockById(command.requestId);
      if (request === null || !request.isDecidableBy(command.accountId, command.sessionId, now)) {
        throw new AuthorizationRequestExpiredError();
      }
      const values: AuthorizationRequestProps = request.values;
      const client: OAuthClient | null = await clients.findById(values.clientId);
      if (client === null) {
        throw new AuthorizationRequestExpiredError();
      }
      const existing: OAuthGrant | null = await grants.lockActive(values.accountId, client.id);
      const grant: OAuthGrant = existing
        ? existing.extended(values.scopes, now)
        : OAuthGrant.create(
            {
              id: this.ids.next(),
              accountId: values.accountId,
              clientId: client.id,
              scopes: values.scopes,
            },
            now,
          );
      await (existing ? grants.save(grant) : grants.add(grant));
      await codes.add(
        AuthorizationCode.issue(
          {
            id: this.ids.next(),
            codeHash: this.codec.hash(code),
            accountId: values.accountId,
            clientId: client.id,
            grantId: grant.id,
            redirectUri: values.redirectUri,
            scopes: values.scopes,
            resource: values.resource,
            codeChallenge: values.codeChallenge,
          },
          now,
        ),
      );
      await requests.save(request.decided(now));
      return authorizationRedirect(
        values.redirectUri,
        { code, state: values.state },
        this.settings.issuer,
      );
    });
  }
  // #endregion
}
