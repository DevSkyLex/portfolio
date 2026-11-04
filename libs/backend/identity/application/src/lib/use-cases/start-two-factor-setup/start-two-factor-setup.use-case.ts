import type { AdminAccount } from '@vfortin/identity-domain';
import {
  InvalidSessionError,
  PasswordMismatchError,
} from '@internal/identity-application/lib/errors/application-error';
import type {
  Clock,
  IdentityUnitOfWork,
  PasswordHasher,
  TotpVerifier,
} from '@internal/identity-application/lib/ports/identity/identity.ports';

/**
 * Interface StartTwoFactorSetupCommand
 * @interface StartTwoFactorSetupCommand
 *
 * @description
 * Enrollment start asked by the signed-in administrator, with the password asked again.
 */
export interface StartTwoFactorSetupCommand {
  // #region Properties
  /**
   * Property accountId
   * @readonly
   *
   * @description
   * Subject of the verified access token.
   *
   * @type {string}
   */
  readonly accountId: string;

  /**
   * Property password
   * @readonly
   *
   * @description
   * Current password, so that a stolen session cannot attach another authenticator.
   *
   * @type {string}
   */
  readonly password: string;
  // #endregion
}

/**
 * Interface TwoFactorEnrollment
 * @interface TwoFactorEnrollment
 *
 * @description
 * Pending secret returned once to the administrator; the only answer that ever carries a secret.
 */
export interface TwoFactorEnrollment {
  // #region Properties
  /**
   * Property secret
   * @readonly
   *
   * @description
   * Base32 secret for manual entry in the authenticator.
   *
   * @type {string}
   */
  readonly secret: string;

  /**
   * Property provisioningUri
   * @readonly
   *
   * @description
   * `otpauth://` URI of the same secret, rendered as a QR code.
   *
   * @type {string}
   */
  readonly provisioningUri: string;
  // #endregion
}

/**
 * Class StartTwoFactorSetup
 * @class StartTwoFactorSetup
 *
 * @description
 * First enrollment step of the optional one-time code (D17). The password is checked under the account
 * row lock and a wrong one counts towards the lockout exactly like a failed login; a right one stores a
 * new pending secret, replacing the previous pending one.
 */
export class StartTwoFactorSetup {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Supplies transaction, password, secret generation and time dependencies.
   *
   * @param {IdentityUnitOfWork} unitOfWork - Transaction boundary for the account update.
   * @param {PasswordHasher} hasher - Password verifier.
   * @param {TotpVerifier} totp - Secret generator and provisioning URI builder.
   * @param {Clock} clock - Source of the attempt timestamp.
   */
  public constructor(
    private readonly unitOfWork: IdentityUnitOfWork,
    private readonly hasher: PasswordHasher,
    private readonly totp: TotpVerifier,
    private readonly clock: Clock,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * An unknown account rejects with `InvalidSessionError`; an active lock propagates `AccountLockedError`; a wrong password commits the failure and rejects with `PasswordMismatchError`; an active second factor rejects with `TwoFactorStateError`.
   *
   * @param {StartTwoFactorSetupCommand} command - Account and password.
   *
   * @returns {Promise<TwoFactorEnrollment>} New pending secret and its provisioning URI.
   */
  public async execute(command: StartTwoFactorSetupCommand): Promise<TwoFactorEnrollment> {
    const now: Date = this.clock.now();
    const enrollment: TwoFactorEnrollment | null = await this.unitOfWork.run(
      async ({ accounts }): Promise<TwoFactorEnrollment | null> => {
        const account: AdminAccount | null = await accounts.lockById(command.accountId);
        if (account === null) {
          throw new InvalidSessionError();
        }
        // Hash verified before the lock check, as in `Login`.
        const passwordOk: boolean = await this.hasher.verify(
          command.password,
          account.passwordHash,
        );
        account.assertCanAttempt(now);
        if (!passwordOk) {
          // Returned rather than thrown: the failure must be committed.
          await accounts.save(account.failed(now));
          return null;
        }
        const secret: string = this.totp.generateSecret();
        await accounts.save(account.startTwoFactorSetup(secret));
        return { secret, provisioningUri: this.totp.provisioningUri(secret, account.email) };
      },
    );
    if (enrollment === null) {
      throw new PasswordMismatchError();
    }
    return enrollment;
  }
  // #endregion
}
