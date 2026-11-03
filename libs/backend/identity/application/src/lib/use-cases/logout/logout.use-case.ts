import type { RefreshToken } from '@vfortin/identity-domain';
import type {
  Clock,
  IdentityUnitOfWork,
  RefreshTokenCodec,
} from '@internal/identity-application/lib/ports/identity/identity.ports';

/**
 * Class Logout
 * @class Logout
 *
 * @description
 * Revokes the complete refresh-token family associated with a presented refresh token.
 */
export class Logout {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Supplies the transaction, token hashing and current-time services used for family revocation.
   *
   * @param {IdentityUnitOfWork} unitOfWork - Transaction boundary for token lookup and revocation.
   * @param {RefreshTokenCodec} codec - Hashes the presented opaque token for lookup.
   * @param {Clock} clock - Source of the revocation timestamp.
   */
  public constructor(
    private readonly unitOfWork: IdentityUnitOfWork,
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
   * Looks up the token by hash and, when found, locks and revokes its entire family. An unknown token is an idempotent no-op; repository failures reject the promise.
   *
   * @param {string} refreshToken - Opaque refresh credential supplied for logout.
   *
   * @returns {Promise<void>} Completion after the family has been revoked or the unknown token ignored.
   */
  public async execute(refreshToken: string): Promise<void> {
    const now: Date = this.clock.now();
    const hash: string = this.codec.hash(refreshToken);
    await this.unitOfWork.run(async ({ tokens }): Promise<void> => {
      const token: RefreshToken | null = await tokens.findByHash(hash);
      if (token !== null) {
        await tokens.lockFamily(token.familyId);
        await tokens.revokeFamily(token.familyId, now);
      }
    });
  }
  // #endregion
}
