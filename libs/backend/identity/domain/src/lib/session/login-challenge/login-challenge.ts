/**
 * Constant LOGIN_CHALLENGE_TTL_MS
 *
 * @description
 * Time left to enter the one-time code after a correct password, in milliseconds.
 *
 * @type {number}
 */
export const LOGIN_CHALLENGE_TTL_MS: number = 5 * 60 * 1000;

/**
 * Constant MAX_CHALLENGE_ATTEMPTS
 *
 * @description
 * Wrong codes accepted on one challenge; the next submission must start again from the password.
 * Each wrong code also counts toward the account lockout (`MAX_FAILED_ATTEMPTS`).
 *
 * @type {number}
 */
export const MAX_CHALLENGE_ATTEMPTS = 5 as const;

/**
 * Interface LoginChallengeProps
 * @interface LoginChallengeProps
 *
 * @description
 * Persisted state of the second login step opened by a correct password.
 */
export interface LoginChallengeProps {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable identifier assigned when the challenge is opened.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property accountId
   * @readonly
   *
   * @description
   * Account whose password was verified.
   *
   * @type {string}
   */
  readonly accountId: string;

  /**
   * Property tokenHash
   * @readonly
   *
   * @description
   * Hash of the opaque challenge handed to the browser; the bearer value itself is not persisted.
   *
   * @type {string}
   */
  readonly tokenHash: string;

  /**
   * Property remember
   * @readonly
   *
   * @description
   * "Remember me" choice of the first step, applied to the session opened by the second.
   *
   * @type {boolean}
   */
  readonly remember: boolean;

  /**
   * Property expiresAt
   * @readonly
   *
   * @description
   * Instant from which the challenge is refused.
   *
   * @type {Date}
   */
  readonly expiresAt: Date;

  /**
   * Property attempts
   * @readonly
   *
   * @description
   * Wrong codes submitted on this challenge.
   *
   * @type {number}
   */
  readonly attempts: number;

  /**
   * Property consumedAt
   * @readonly
   *
   * @description
   * Instant the right code was accepted, or `null` while the challenge is open.
   *
   * @type {Date | null}
   */
  readonly consumedAt: Date | null;
  // #endregion
}

/**
 * Class LoginChallenge
 * @class LoginChallenge
 *
 * @description
 * Single-use, short-lived proof that the password was right, exchanged with the one-time code for a
 * session. It is refused once consumed, expired or out of attempts.
 */
export class LoginChallenge {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores challenge state created by `open` or restored from persistence.
   *
   * @param {LoginChallengeProps} props - Challenge state to retain.
   */
  private constructor(private readonly props: LoginChallengeProps) {}
  // #endregion

  // #region Methods
  /**
   * Method open
   * @method open
   * @static
   *
   * @description
   * Creates an unused challenge expiring `LOGIN_CHALLENGE_TTL_MS` after `now`.
   *
   * @param {Pick<LoginChallengeProps, 'id' | 'accountId' | 'tokenHash' | 'remember'>} input - Identity, owner, stored hash and "remember me" choice.
   * @param {Date} now - Opening time used as the lifetime origin.
   *
   * @returns {LoginChallenge} New challenge state.
   */
  public static open(
    input: Pick<LoginChallengeProps, 'id' | 'accountId' | 'tokenHash' | 'remember'>,
    now: Date,
  ): LoginChallenge {
    return new LoginChallenge({
      ...input,
      expiresAt: new Date(now.getTime() + LOGIN_CHALLENGE_TTL_MS),
      attempts: 0,
      consumedAt: null,
    });
  }

  /**
   * Method rehydrate
   * @method rehydrate
   * @static
   *
   * @description
   * Restores challenge state exactly as persisted.
   *
   * @param {LoginChallengeProps} props - Persisted challenge state.
   *
   * @returns {LoginChallenge} Restored challenge.
   */
  public static rehydrate(props: LoginChallengeProps): LoginChallenge {
    return new LoginChallenge(props);
  }

  /**
   * Method id
   * @method id
   *
   * @description
   * Returns the challenge identifier used by conditional repository updates.
   *
   * @returns {string} Challenge identifier.
   */
  public get id(): string {
    return this.props.id;
  }

  /**
   * Method accountId
   * @method accountId
   *
   * @description
   * Returns the account whose password opened the challenge.
   *
   * @returns {string} Owner account identifier.
   */
  public get accountId(): string {
    return this.props.accountId;
  }

  /**
   * Method remember
   * @method remember
   *
   * @description
   * Returns the "remember me" choice to apply to the session.
   *
   * @returns {boolean} Whether the session must be persistent.
   */
  public get remember(): boolean {
    return this.props.remember;
  }

  /**
   * Method expiresAt
   * @method expiresAt
   *
   * @description
   * Returns the instant from which the challenge is refused.
   *
   * @returns {Date} Challenge expiry.
   */
  public get expiresAt(): Date {
    return this.props.expiresAt;
  }

  /**
   * Method isUsable
   * @method isUsable
   *
   * @description
   * Accepts a code submission only while the challenge is unconsumed, before its expiry instant and
   * below `MAX_CHALLENGE_ATTEMPTS` wrong codes.
   *
   * @param {Date} now - Time against which expiry is evaluated.
   *
   * @returns {boolean} Whether a code may still be checked against this challenge.
   */
  public isUsable(now: Date): boolean {
    return (
      this.props.consumedAt === null &&
      this.props.expiresAt.getTime() > now.getTime() &&
      this.props.attempts < MAX_CHALLENGE_ATTEMPTS
    );
  }

  /**
   * Method failed
   * @method failed
   *
   * @description
   * Returns the state after a wrong code.
   *
   * @returns {LoginChallenge} Challenge with one more attempt counted.
   */
  public failed(): LoginChallenge {
    return new LoginChallenge({ ...this.props, attempts: this.props.attempts + 1 });
  }

  /**
   * Method consumed
   * @method consumed
   *
   * @description
   * Returns the state after the right code: the challenge cannot open a second session.
   *
   * @param {Date} now - Consumption instant.
   *
   * @returns {LoginChallenge} Consumed challenge.
   */
  public consumed(now: Date): LoginChallenge {
    return new LoginChallenge({ ...this.props, consumedAt: now });
  }

  /**
   * Method snapshot
   * @method snapshot
   *
   * @description
   * Returns a shallow copy of challenge state for persistence.
   *
   * @returns {LoginChallengeProps} Copy of the current state.
   */
  public snapshot(): LoginChallengeProps {
    return { ...this.props };
  }
  // #endregion
}
