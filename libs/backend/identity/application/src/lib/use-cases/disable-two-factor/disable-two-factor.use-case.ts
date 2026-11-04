import { TwoFactorStateError, type AdminAccount } from '@vfortin/identity-domain';
import {
  InvalidSessionError,
  PasswordMismatchError,
  TotpInvalidError,
} from '@internal/identity-application/lib/errors/application-error';
import type {
  Clock,
  IdentityUnitOfWork,
  PasswordHasher,
  TotpVerifier,
} from '@internal/identity-application/lib/ports/identity/identity.ports';

/**
 * Interface DisableTwoFactorCommand
 * @interface DisableTwoFactorCommand
 *
 * @description
 * Removal of the second factor, proven by both factors.
 */
export interface DisableTwoFactorCommand {
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
   * Current password.
   *
   * @type {string}
   */
  readonly password: string;

  /**
   * Property totp
   * @readonly
   *
   * @description
   * Current one-time code of the active secret.
   *
   * @type {string}
   */
  readonly totp: string;
  // #endregion
}

/**
 * Type DisableOutcome
 * @type DisableOutcome
 *
 * @description
 * Result of the transaction: refusals that must commit their failure are returned, not thrown.
 */
type DisableOutcome = 'disabled' | 'password-mismatch' | 'totp-invalid';

/**
 * Class DisableTwoFactor
 * @class DisableTwoFactor
 *
 * @description
 * Turns the one-time code off (D17). Under the account row lock, the password then the code of the
 * active secret are checked, each failure counting towards the lockout like at login; success removes
 * the secret and deletes every trusted device of the account, so that none skips a code enrolled later.
 */
export class DisableTwoFactor {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Supplies transaction, password, code and time dependencies.
   *
   * @param {IdentityUnitOfWork} unitOfWork - Transaction boundary for the account and device updates.
   * @param {PasswordHasher} hasher - Password verifier.
   * @param {TotpVerifier} totp - Time-based code verifier.
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
   * An unknown account rejects with `InvalidSessionError`; an active lock propagates `AccountLockedError`; a wrong password rejects with `PasswordMismatchError` and an inactive second factor with `TwoFactorStateError`; a wrong or replayed code rejects with `TotpInvalidError`. Both mismatches commit one more failure.
   *
   * @param {DisableTwoFactorCommand} command - Account, password and code.
   *
   * @returns {Promise<void>} Completion once the second factor is off.
   */
  public async execute(command: DisableTwoFactorCommand): Promise<void> {
    const now: Date = this.clock.now();
    const outcome: DisableOutcome = await this.unitOfWork.run(
      async ({ accounts, devices }): Promise<DisableOutcome> => {
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
          await accounts.save(account.failed(now));
          return 'password-mismatch';
        }
        const secret: string | null = account.totpSecret;
        if (secret === null) {
          throw new TwoFactorStateError();
        }
        const step: number | null = this.totp.verify(secret, command.totp, now);
        if (step === null || !account.isFreshTotpStep(step)) {
          await accounts.save(account.failed(now));
          return 'totp-invalid';
        }
        await accounts.save(account.disableTwoFactor());
        await devices.deleteByAccount(account.id);
        return 'disabled';
      },
    );
    if (outcome === 'password-mismatch') {
      throw new PasswordMismatchError();
    }
    if (outcome === 'totp-invalid') {
      throw new TotpInvalidError();
    }
  }
  // #endregion
}
