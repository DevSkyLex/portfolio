import {
  AccountLockedError,
  WeakPasswordError,
} from '@internal/identity-domain/lib/errors/domain-error';

/**
 * Constant MAX_FAILED_ATTEMPTS
 *
 * @description
 * Number of consecutive failed sign-ins that triggers a temporary account lock.
 *
 * @type {number}
 */
export const MAX_FAILED_ATTEMPTS = 5 as const;

/**
 * Constant LOCK_DURATION_MS
 *
 * @description
 * Temporary lock duration applied after the failed sign-in threshold, in milliseconds.
 *
 * @type {number}
 */
export const LOCK_DURATION_MS: number = 15 * 60 * 1000;

/**
 * Constant PASSWORD_MIN_LENGTH
 *
 * @description
 * Minimum number of characters accepted by the administrator password policy.
 *
 * @type {number}
 */
export const PASSWORD_MIN_LENGTH = 12 as const;

/**
 * Interface AdminAccountProps
 * @interface AdminAccountProps
 *
 * @description
 * Credential and sign-in state persisted for the site's administrator account.
 */
export interface AdminAccountProps {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable identifier used by session ownership and repository lookups.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property email
   * @readonly
   *
   * @description
   * Normalized sign-in address stored in lowercase without surrounding whitespace.
   *
   * @type {string}
   */
  readonly email: string;

  /**
   * Property passwordHash
   * @readonly
   *
   * @description
   * Password verifier output; the plain password is not retained in account state.
   *
   * @type {string}
   */
  readonly passwordHash: string;

  /**
   * Property totpSecret
   * @readonly
   *
   * @description
   * Base32 secret used to verify time-based one-time passwords.
   *
   * @type {string}
   */
  readonly totpSecret: string;

  /**
   * Property lastTotpStep
   * @readonly
   *
   * @description
   * Greatest accepted TOTP time step; equal or older steps are rejected as replay.
   *
   * @type {number}
   */
  readonly lastTotpStep: number;

  /**
   * Property failedAttempts
   * @readonly
   *
   * @description
   * Consecutive failed sign-in count, reset when authentication succeeds or locks.
   *
   * @type {number}
   */
  readonly failedAttempts: number;

  /**
   * Property lockedUntil
   * @readonly
   *
   * @description
   * Time when another sign-in may be attempted, or `null` while the account is unlocked.
   *
   * @type {Date | null}
   */
  readonly lockedUntil: Date | null;
  // #endregion
}

/**
 * Function assertPasswordPolicy
 *
 * @description
 * Enforces the minimum administrator password length before hashing or persistence.
 *
 * @param {string} password - Plain password supplied during account setup.
 *
 * @returns {void} Completes when the password meets the minimum length.
 *
 * @throws {WeakPasswordError} When the password is shorter than the configured minimum.
 */
export function assertPasswordPolicy(password: string): void {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new WeakPasswordError();
  }
}

/**
 * Class AdminAccount
 * @class AdminAccount
 *
 * @description
 * Holds the administrator's credentials and sign-in state, including lockout and TOTP replay rules.
 */
export class AdminAccount {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Keeps account state behind the domain operations that enforce sign-in invariants.
   *
   * @param {AdminAccountProps} props - Credential and sign-in state to retain.
   */
  private constructor(private readonly props: AdminAccountProps) {}
  // #endregion

  // #region Methods
  /**
   * Method create
   * @method create
   * @static
   *
   * @description
   * Creates a new account, normalizing its email and initializing the TOTP replay and lockout state.
   *
   * @param {Omit<AdminAccountProps, 'lastTotpStep' | 'failedAttempts' | 'lockedUntil'>} props - Persisted credentials before sign-in state is initialized.
   *
   * @returns {AdminAccount} New account with zero accepted TOTP steps and no active lock.
   */
  public static create(
    props: Omit<AdminAccountProps, 'lastTotpStep' | 'failedAttempts' | 'lockedUntil'>,
  ): AdminAccount {
    return new AdminAccount({
      ...props,
      email: props.email.trim().toLowerCase(),
      lastTotpStep: 0,
      failedAttempts: 0,
      lockedUntil: null,
    });
  }

  /**
   * Method rehydrate
   * @method rehydrate
   * @static
   *
   * @description
   * Reconstructs an account from persisted state without changing its stored values.
   *
   * @param {AdminAccountProps} props - Previously persisted account state.
   *
   * @returns {AdminAccount} Account restored from the supplied state.
   */
  public static rehydrate(props: AdminAccountProps): AdminAccount {
    return new AdminAccount(props);
  }

  /**
   * Method id
   * @method id
   *
   * @description
   * Returns the stable identifier used for account and session ownership.
   *
   * @returns {string} Account identifier.
   */
  public get id(): string {
    return this.props.id;
  }

  /**
   * Method email
   * @method email
   *
   * @description
   * Returns the normalized address used to identify this account at sign-in.
   *
   * @returns {string} Lowercase account email.
   */
  public get email(): string {
    return this.props.email;
  }

  /**
   * Method passwordHash
   * @method passwordHash
   *
   * @description
   * Returns the stored password verifier for authentication checks.
   *
   * @returns {string} Persisted password hash.
   */
  public get passwordHash(): string {
    return this.props.passwordHash;
  }

  /**
   * Method totpSecret
   * @method totpSecret
   *
   * @description
   * Returns the base32 secret consumed by the TOTP verifier.
   *
   * @returns {string} Account TOTP secret.
   */
  public get totpSecret(): string {
    return this.props.totpSecret;
  }

  /**
   * Method assertCanAttempt
   * @method assertCanAttempt
   *
   * @description
   * Rejects sign-in while the lock expiry is later than `now`; the account becomes eligible at the expiry instant.
   *
   * @param {Date} now - Current time used to evaluate the lock boundary.
   *
   * @returns {void} Completes when no active lock remains.
   *
   * @throws {AccountLockedError} While the account lock expiry is in the future.
   */
  public assertCanAttempt(now: Date): void {
    const until: Date | null = this.props.lockedUntil;
    if (until !== null && until.getTime() > now.getTime()) {
      throw new AccountLockedError(until);
    }
  }

  /**
   * Method isFreshTotpStep
   * @method isFreshTotpStep
   *
   * @description
   * Accepts only TOTP steps newer than the greatest previously accepted step, preventing code reuse.
   *
   * @param {number} step - Candidate step returned by the TOTP verifier.
   *
   * @returns {boolean} Whether the candidate is newer than the stored step.
   */
  public isFreshTotpStep(step: number): boolean {
    return step > this.props.lastTotpStep;
  }

  /**
   * Method failed
   * @method failed
   *
   * @description
   * Returns the next state after a failed sign-in; reaching the threshold resets the counter and starts a timed lock.
   *
   * @param {Date} now - Time from which the lock duration is measured.
   *
   * @returns {AdminAccount} New state with an incremented counter or active lock.
   */
  public failed(now: Date): AdminAccount {
    const failedAttempts: number = this.props.failedAttempts + 1;
    return failedAttempts >= MAX_FAILED_ATTEMPTS
      ? new AdminAccount({
          ...this.props,
          failedAttempts: 0,
          lockedUntil: new Date(now.getTime() + LOCK_DURATION_MS),
        })
      : new AdminAccount({ ...this.props, failedAttempts });
  }

  /**
   * Method succeeded
   * @method succeeded
   *
   * @description
   * Returns authenticated state with the accepted TOTP step recorded and lockout state cleared.
   *
   * @param {number} totpStep - Verified step that must not be accepted again.
   *
   * @returns {AdminAccount} Updated account state.
   */
  public succeeded(totpStep: number): AdminAccount {
    return new AdminAccount({
      ...this.props,
      lastTotpStep: totpStep,
      failedAttempts: 0,
      lockedUntil: null,
    });
  }

  /**
   * Method succeededOnTrustedDevice
   * @method succeededOnTrustedDevice
   *
   * @description
   * Returns authenticated state after a correct password on a trusted device: lockout state is cleared
   * like a full success, while the accepted TOTP step is left unchanged since no code was checked.
   *
   * @returns {AdminAccount} Updated account state.
   */
  public succeededOnTrustedDevice(): AdminAccount {
    return new AdminAccount({ ...this.props, failedAttempts: 0, lockedUntil: null });
  }

  /**
   * Method snapshot
   * @method snapshot
   *
   * @description
   * Returns a shallow copy of the persisted account state for repository writes.
   *
   * @returns {AdminAccountProps} Copy of the current state.
   */
  public snapshot(): AdminAccountProps {
    return { ...this.props };
  }
  // #endregion
}
