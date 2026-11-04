import {
  type OAuthGrant,
  type OAuthScope,
  OAuthError,
  type RefreshToken,
  includesScopes,
  parseScopes,
} from '@vfortin/identity-domain';
import type { Clock } from '@internal/identity-application/lib/ports/identity/identity.ports';
import type {
  LockedTokenFamily,
  OAuthUnitOfWork,
} from '@internal/identity-application/lib/ports/oauth/oauth.ports';
import {
  type IssuedTokens,
  type OAuthTokenServices,
  issueResourceTokens,
} from '@internal/identity-application/lib/use-cases/issue-resource-tokens/issue-resource-tokens';
import { matchesResource } from '@internal/identity-application/lib/use-cases/resource-indicator/resource-indicator';

/**
 * Interface RefreshResourceTokenCommand
 * @interface RefreshResourceTokenCommand
 *
 * @description
 * `refresh_token` grant of the token endpoint, for a public client.
 */
export interface RefreshResourceTokenCommand {
  // #region Properties
  /** Presented refresh token. */
  readonly refreshToken: string;
  /** Presenting client. */
  readonly clientId: string;
  /** Narrower scope asked for, `null` to keep the family's. */
  readonly scope: string | null;
  /** Resource (RFC 8707), `null` when omitted. */
  readonly resource: string | null;
  // #endregion
}

/**
 * Function invalidGrant
 *
 * @description
 * Builds the single refusal of an unusable refresh token.
 *
 * @returns {OAuthError} `invalid_grant`.
 */
function invalidGrant(): OAuthError {
  return new OAuthError('invalid_grant', 'The refresh token is invalid or expired.');
}

/**
 * Class RefreshResourceToken
 * @class RefreshResourceToken
 *
 * @description
 * Rotates an MCP refresh token under its family lock, as `RefreshSession` does for administrator
 * sessions (D27): a spent token, even an expired one, is a replay and revokes the whole family. The
 * grant is read without a lock (a revocation locks it before the families) and must be active; a
 * scope may narrow, never widen, and the resource cannot change.
 */
export class RefreshResourceToken {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Supplies the transaction boundary, token services and clock.
   *
   * @param {OAuthUnitOfWork} unitOfWork - Transaction boundary.
   * @param {OAuthTokenServices} services - Signer, codec and identifiers.
   * @param {Clock} clock - Refresh time.
   */
  public constructor(
    private readonly unitOfWork: OAuthUnitOfWork,
    private readonly services: OAuthTokenServices,
    private readonly clock: Clock,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Exchanges the refresh token for new credentials in the same family.
   *
   * @param {RefreshResourceTokenCommand} command - Token request fields.
   *
   * @returns {Promise<IssuedTokens>} New credentials.
   *
   * @throws {OAuthError} `invalid_scope`, `invalid_target` or `invalid_grant`.
   */
  public async execute(command: RefreshResourceTokenCommand): Promise<IssuedTokens> {
    const now: Date = this.clock.now();
    const hash: string = this.services.codec.hash(command.refreshToken);
    const issued: IssuedTokens | null = await this.unitOfWork.run(
      async ({ tokens, grants }): Promise<IssuedTokens | null> => {
        const found: RefreshToken | null = await tokens.findByHash(hash);
        if (found === null) {
          throw invalidGrant();
        }
        const family: LockedTokenFamily | null = await tokens.lockFamily(found.familyId);
        if (family === null || family.clientId !== command.clientId) {
          throw invalidGrant();
        }
        // Read again under the lock: a concurrent exchange may have rotated it in the meantime.
        const token: RefreshToken = (await tokens.findByHash(hash)) ?? found;
        // Replay checked before expiry: an old stolen token still revokes a live family.
        if (!token.isSpent() && token.isExpired(now)) {
          throw invalidGrant();
        }
        if (token.isSpent() || !(await tokens.markRotated(hash, now))) {
          await tokens.revokeFamily(family.id, now, 'replay');
          return null;
        }
        const grant: OAuthGrant | null = await grants.findById(family.grantId);
        if (grant === null || !grant.isActive) {
          throw invalidGrant();
        }
        const scopes: readonly OAuthScope[] =
          command.scope === null ? family.scopes : parseScopes(command.scope);
        if (!includesScopes(family.scopes, scopes)) {
          throw new OAuthError('invalid_scope', 'A refresh cannot widen the granted scopes.');
        }
        if (command.resource !== null && !matchesResource(command.resource, family.resource)) {
          throw new OAuthError('invalid_target', 'The resource differs from the authorized one.');
        }
        return issueResourceTokens(this.services, tokens, family, scopes, now);
      },
    );
    if (issued === null) {
      throw invalidGrant();
    }
    return issued;
  }
  // #endregion
}
