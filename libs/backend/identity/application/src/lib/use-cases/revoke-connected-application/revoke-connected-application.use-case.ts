import type { OAuthGrant } from '@vfortin/identity-domain';
import { ConnectedApplicationNotFoundError } from '@internal/identity-application/lib/errors/application-error';
import type { Clock } from '@internal/identity-application/lib/ports/identity/identity.ports';
import type { OAuthUnitOfWork } from '@internal/identity-application/lib/ports/oauth/oauth.ports';

/**
 * Interface RevokeConnectedApplicationCommand
 * @interface RevokeConnectedApplicationCommand
 *
 * @description
 * « Révoquer » on a connected application.
 */
export interface RevokeConnectedApplicationCommand {
  // #region Properties
  /** Subject of the administrator access token. */
  readonly accountId: string;
  /** Grant to revoke. */
  readonly grantId: string;
  // #endregion
}

/**
 * Class RevokeConnectedApplication
 * @class RevokeConnectedApplication
 *
 * @description
 * Withdraws a consent (D45): the grant is revoked, then every refresh-token family issued under it,
 * so no refresh or pending code redemption succeeds afterwards. Access tokens already issued keep
 * working until they expire (five minutes at most): they are not introspected.
 */
export class RevokeConnectedApplication {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Supplies the transaction boundary and clock.
   *
   * @param {OAuthUnitOfWork} unitOfWork - Transaction boundary.
   * @param {Clock} clock - Revocation time.
   */
  public constructor(
    private readonly unitOfWork: OAuthUnitOfWork,
    private readonly clock: Clock,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Locks the grant, then revokes it and its families.
   *
   * @param {RevokeConnectedApplicationCommand} command - Account and grant.
   *
   * @returns {Promise<void>} Completion after revocation.
   *
   * @throws {ConnectedApplicationNotFoundError} For an unknown, foreign or already revoked grant.
   */
  public async execute(command: RevokeConnectedApplicationCommand): Promise<void> {
    const now: Date = this.clock.now();
    await this.unitOfWork.run(async ({ grants, tokens }): Promise<void> => {
      const grant: OAuthGrant | null = await grants.lockById(command.grantId);
      if (grant === null || grant.accountId !== command.accountId || !grant.isActive) {
        throw new ConnectedApplicationNotFoundError();
      }
      await grants.save(grant.revoked(now));
      await tokens.revokeByGrant(grant.id, now, 'owner');
    });
  }
  // #endregion
}
