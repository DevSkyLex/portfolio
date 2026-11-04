import { OAuthError, type RefreshToken } from '@vfortin/identity-domain';
import type {
  Clock,
  RefreshTokenCodec,
} from '@internal/identity-application/lib/ports/identity/identity.ports';
import type {
  LockedTokenFamily,
  OAuthUnitOfWork,
} from '@internal/identity-application/lib/ports/oauth/oauth.ports';

/**
 * Interface RevokeOAuthTokenCommand
 * @interface RevokeOAuthTokenCommand
 *
 * @description
 * Revocation request (RFC 7009) of a public client.
 */
export interface RevokeOAuthTokenCommand {
  // #region Properties
  /** Presented token. */
  readonly token: string;
  /** Presenting client, `null` when omitted. */
  readonly clientId: string | null;
  // #endregion
}

/**
 * Class RevokeOAuthToken
 * @class RevokeOAuthToken
 *
 * @description
 * Token revocation endpoint (D45, RFC 7009): a refresh token revokes its whole family. An unknown
 * token, including an access token (a JWT that cannot be revoked and expires within minutes), is
 * answered as a success; a token of another client is refused.
 */
export class RevokeOAuthToken {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Supplies the transaction boundary, hashing and clock.
   *
   * @param {OAuthUnitOfWork} unitOfWork - Transaction boundary.
   * @param {RefreshTokenCodec} codec - Hashes the presented token.
   * @param {Clock} clock - Revocation time.
   */
  public constructor(
    private readonly unitOfWork: OAuthUnitOfWork,
    private readonly codec: RefreshTokenCodec,
    private readonly clock: Clock,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Revokes the family of a known refresh token under its lock.
   *
   * @param {RevokeOAuthTokenCommand} command - Token and client.
   *
   * @returns {Promise<void>} Completion, also for an unknown token.
   *
   * @throws {OAuthError} `invalid_request` when the token belongs to another client.
   */
  public async execute(command: RevokeOAuthTokenCommand): Promise<void> {
    const now: Date = this.clock.now();
    const hash: string = this.codec.hash(command.token);
    await this.unitOfWork.run(async ({ tokens }): Promise<void> => {
      const found: RefreshToken | null = await tokens.findByHash(hash);
      if (found === null) {
        return;
      }
      const family: LockedTokenFamily | null = await tokens.lockFamily(found.familyId);
      if (family === null) {
        return;
      }
      if (command.clientId !== null && family.clientId !== command.clientId) {
        throw new OAuthError('invalid_request', 'The token was not issued to this client.');
      }
      await tokens.revokeFamily(family.id, now, 'client');
    });
  }
  // #endregion
}
