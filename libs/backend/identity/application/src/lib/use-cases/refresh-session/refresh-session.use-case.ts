import type { AdminAccount, RefreshToken, SessionFamily } from '@vfortin/identity-domain';
import { InvalidSessionError } from '@internal/identity-application/lib/errors/application-error';
import type {
  Clock,
  IdentityUnitOfWork,
} from '@internal/identity-application/lib/ports/identity/identity.ports';
import {
  type Session,
  type SessionServices,
  openSession,
} from '@internal/identity-application/lib/use-cases/open-session/open-session';

/**
 * Class RefreshSession
 * @class RefreshSession
 *
 * @description
 * Exchanges a refresh token under its family lock. Reuse of a spent token revokes the full family so concurrent replay cannot leave a descendant session active.
 */
export class RefreshSession {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Supplies the transaction boundary, credential services and clock used for token exchange.
   *
   * @param {IdentityUnitOfWork} unitOfWork - Transaction boundary for rotation and family revocation.
   * @param {SessionServices} services - Token signing, hashing, generation and identifier services.
   * @param {Clock} clock - Source of the shared exchange timestamp.
   */
  public constructor(
    private readonly unitOfWork: IdentityUnitOfWork,
    private readonly services: SessionServices,
    private readonly clock: Clock,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Looks up and locks the token family, rereads state under the lock, then rotates the token and opens a replacement session in the same family. Expired (including past the family's 90-day cap) or unknown tokens reject with `InvalidSessionError`; replay revokes the family before returning the same error.
   *
   * @param {string} refreshToken - Opaque credential presented for exchange.
   *
   * @returns {Promise<Session>} Replacement access and refresh credentials.
   */
  public async execute(refreshToken: string): Promise<Session> {
    const now: Date = this.clock.now();
    const hash: string = this.services.codec.hash(refreshToken);
    const session: Session | null = await this.unitOfWork.run(
      async ({ accounts, tokens }): Promise<Session | null> => {
        const found: RefreshToken | null = await tokens.findByHash(hash);
        if (found === null) {
          throw new InvalidSessionError();
        }
        const family: SessionFamily | null = await tokens.lockFamily(found.familyId);
        if (family === null) {
          throw new InvalidSessionError();
        }

        // Read again under the lock: a concurrent exchange may have rotated it in the meantime.
        const token: RefreshToken = (await tokens.findByHash(hash)) ?? found;

        // Replay checked before expiry: an old stolen token still revokes a live session.
        if (!token.isSpent() && token.isExpired(now)) {
          throw new InvalidSessionError();
        }
        if (token.isSpent() || !(await tokens.markRotated(hash, now))) {
          // Returned rather than thrown: the revocation must be committed.
          await tokens.revokeFamily(token.familyId, now);
          return null;
        }
        const account: AdminAccount | null = await accounts.findById(token.accountId);
        if (account === null) {
          throw new InvalidSessionError();
        }
        // Same family: its "remember me" flag and 90-day cap carry over to the new token.
        return openSession(this.services, tokens, family, now);
      },
    );
    if (session === null) {
      throw new InvalidSessionError();
    }
    return session;
  }
  // #endregion
}
