import {
  type AuthorizationCode,
  type AuthorizationCodeProps,
  OAuthError,
  type OAuthGrant,
  type OAuthTokenFamily,
  openTokenFamily,
} from '@vfortin/identity-domain';
import type { Clock } from '@internal/identity-application/lib/ports/identity/identity.ports';
import type {
  OAuthUnitOfWork,
  PkceVerifier,
} from '@internal/identity-application/lib/ports/oauth/oauth.ports';
import {
  type IssuedTokens,
  type OAuthTokenServices,
  issueResourceTokens,
} from '@internal/identity-application/lib/use-cases/issue-resource-tokens/issue-resource-tokens';
import { matchesResource } from '@internal/identity-application/lib/use-cases/resource-indicator/resource-indicator';

/**
 * Constant CODE_VERIFIER
 *
 * @description
 * Shape of a PKCE verifier (RFC 7636 §4.1): 43 to 128 unreserved characters.
 *
 * @type {RegExp}
 */
const CODE_VERIFIER: RegExp = /^[A-Za-z0-9._~-]{43,128}$/;

/**
 * Constant CODE_RETENTION_MS
 *
 * @description
 * How long a code row outlives its expiry, in milliseconds, so that a late replay of a consumed code
 * still revokes the tokens it gave.
 *
 * @type {number}
 */
export const CODE_RETENTION_MS: number = 24 * 60 * 60 * 1000;

/**
 * Interface ExchangeAuthorizationCodeCommand
 * @interface ExchangeAuthorizationCodeCommand
 *
 * @description
 * `authorization_code` grant of the token endpoint, for a public client.
 */
export interface ExchangeAuthorizationCodeCommand {
  // #region Properties
  /** Presented code. */
  readonly code: string;
  /** PKCE verifier. */
  readonly codeVerifier: string;
  /** Presenting client. */
  readonly clientId: string;
  /** Redirect URI, identical to the authorization request's. */
  readonly redirectUri: string;
  /** Resource (RFC 8707), `null` when omitted. */
  readonly resource: string | null;
  // #endregion
}

/**
 * Function invalidGrant
 *
 * @description
 * Builds the single refusal of a code that is unknown, expired, consumed, issued to another client
 * or redirect URI, or whose verifier does not match: the cases are not told apart.
 *
 * @returns {OAuthError} `invalid_grant`.
 */
function invalidGrant(): OAuthError {
  return new OAuthError('invalid_grant', 'The authorization code is invalid or expired.');
}

/**
 * Class ExchangeAuthorizationCode
 * @class ExchangeAuthorizationCode
 *
 * @description
 * Redeems an authorization code (D45, OAuth 2.1 §4.1.3) under its row lock: checks client, redirect
 * URI, PKCE `S256` verifier, resource and the grant (locked, so a concurrent revocation is seen), then
 * opens a refresh-token family and issues the first tokens. A second redemption is a replay: it is
 * refused and revokes the family the first one opened. A failed check does not consume the code.
 */
export class ExchangeAuthorizationCode {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Supplies the transaction boundary, token services, PKCE verifier and clock.
   *
   * @param {OAuthUnitOfWork} unitOfWork - Transaction boundary.
   * @param {OAuthTokenServices} services - Signer, codec and identifiers.
   * @param {PkceVerifier} pkce - `S256` comparison.
   * @param {Clock} clock - Redemption time.
   */
  public constructor(
    private readonly unitOfWork: OAuthUnitOfWork,
    private readonly services: OAuthTokenServices,
    private readonly pkce: PkceVerifier,
    private readonly clock: Clock,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Exchanges the code for an access token and a refresh token.
   *
   * @param {ExchangeAuthorizationCodeCommand} command - Token request fields.
   *
   * @returns {Promise<IssuedTokens>} First credentials of the family.
   *
   * @throws {OAuthError} `invalid_request` for a malformed verifier, `invalid_target` for another
   * resource, `invalid_grant` otherwise.
   */
  public async execute(command: ExchangeAuthorizationCodeCommand): Promise<IssuedTokens> {
    if (!CODE_VERIFIER.test(command.codeVerifier)) {
      throw new OAuthError('invalid_request', 'code_verifier must hold 43 to 128 characters.');
    }
    const now: Date = this.clock.now();
    const hash: string = this.services.codec.hash(command.code);
    const issued: IssuedTokens | null = await this.unitOfWork.run(
      async ({ codes, grants, tokens }): Promise<IssuedTokens | null> => {
        await codes.deleteExpired(new Date(now.getTime() - CODE_RETENTION_MS));
        const code: AuthorizationCode | null = await codes.lockByHash(hash);
        if (code === null) {
          throw invalidGrant();
        }
        const values: AuthorizationCodeProps = code.values;
        if (code.isConsumed) {
          // Returned rather than thrown: the revocation must be committed.
          if (values.familyId !== null) {
            await tokens.revokeFamily(values.familyId, now, 'replay');
          }
          return null;
        }
        if (
          code.isExpired(now) ||
          values.clientId !== command.clientId ||
          values.redirectUri !== command.redirectUri ||
          !this.pkce.matches(command.codeVerifier, values.codeChallenge)
        ) {
          throw invalidGrant();
        }
        if (command.resource !== null && !matchesResource(command.resource, values.resource)) {
          throw new OAuthError('invalid_target', 'The resource differs from the authorized one.');
        }
        const grant: OAuthGrant | null = await grants.lockById(values.grantId);
        if (grant === null || !grant.isActive) {
          throw invalidGrant();
        }
        const family: OAuthTokenFamily = openTokenFamily(
          {
            id: this.services.ids.next(),
            grantId: grant.id,
            accountId: values.accountId,
            clientId: values.clientId,
            resource: values.resource,
            scopes: values.scopes,
          },
          now,
        );
        if (!(await codes.consume(values.id, family.id, now))) {
          throw invalidGrant();
        }
        await tokens.deleteExpiredFamilies(now);
        await tokens.addFamily(family);
        return issueResourceTokens(this.services, tokens, family, family.scopes, now);
      },
    );
    if (issued === null) {
      throw invalidGrant();
    }
    return issued;
  }
  // #endregion
}
