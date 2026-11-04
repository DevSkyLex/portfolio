import type { AdminAccount } from '@vfortin/identity-domain';
import { InvalidSessionError } from '@internal/identity-application/lib/errors/application-error';
import type { IdentityUnitOfWork } from '@internal/identity-application/lib/ports/identity/identity.ports';

/**
 * Interface TwoFactorStatus
 * @interface TwoFactorStatus
 *
 * @description
 * State of the optional one-time code; a pending enrollment is not reported, it stays inactive.
 */
export interface TwoFactorStatus {
  // #region Properties
  /**
   * Property enabled
   * @readonly
   *
   * @description
   * Whether the login asks for a one-time code.
   *
   * @type {boolean}
   */
  readonly enabled: boolean;
  // #endregion
}

/**
 * Class GetTwoFactorStatus
 * @class GetTwoFactorStatus
 *
 * @description
 * Reads whether the signed-in administrator's account has the second factor on (D17).
 */
export class GetTwoFactorStatus {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Supplies the repositories, read without a row lock.
   *
   * @param {IdentityUnitOfWork} unitOfWork - Transaction boundary of the read.
   */
  public constructor(private readonly unitOfWork: IdentityUnitOfWork) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * An unknown account rejects with `InvalidSessionError`.
   *
   * @param {string} accountId - Subject of the verified access token.
   *
   * @returns {Promise<TwoFactorStatus>} Current state.
   */
  public async execute(accountId: string): Promise<TwoFactorStatus> {
    const account: AdminAccount | null = await this.unitOfWork.run(
      ({ accounts }): Promise<AdminAccount | null> => accounts.findById(accountId),
    );
    if (account === null) {
      throw new InvalidSessionError();
    }
    return { enabled: account.isTwoFactorEnabled };
  }
  // #endregion
}
