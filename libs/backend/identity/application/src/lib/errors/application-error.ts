/**
 * Class ApplicationError
 * @class ApplicationError
 *
 * @description
 * Base error for expected identity use-case failures, carrying a stable code for transport mapping.
 */
export class ApplicationError extends Error {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Initializes the stable application error code and message.
   *
   * @param {string} code - Code mapped by the HTTP problem layer.
   * @param {string} message - Human-readable failure description.
   */
  public constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
  // #endregion
}

/**
 * Class InvalidCredentialsError
 * @class InvalidCredentialsError
 * @extends ApplicationError
 *
 * @description
 * Represents a failed sign-in without distinguishing whether the address, password or TOTP code was incorrect.
 */
export class InvalidCredentialsError extends ApplicationError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Assigns the stable invalid-credentials code used for authentication failures.
   */
  public constructor() {
    super('identity.invalid-credentials', 'Incorrect address, password or code.');
    this.name = 'InvalidCredentialsError';
  }
  // #endregion
}

/**
 * Class InvalidSessionError
 * @class InvalidSessionError
 * @extends ApplicationError
 *
 * @description
 * Represents a missing, expired, revoked or otherwise unusable session credential.
 */
export class InvalidSessionError extends ApplicationError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Assigns the stable invalid-session code returned for unusable refresh credentials.
   */
  public constructor() {
    super('identity.invalid-session', 'Session expired; log in again.');
    this.name = 'InvalidSessionError';
  }
  // #endregion
}

/**
 * Class ChallengeExpiredError
 * @class ChallengeExpiredError
 * @extends ApplicationError
 *
 * @description
 * Represents a second login step whose challenge is unknown, already used, expired or out of attempts:
 * the administrator must enter the password again.
 */
export class ChallengeExpiredError extends ApplicationError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Assigns the stable challenge-expired code returned by the second login step.
   */
  public constructor() {
    super('identity.challenge-expired', 'Login step expired; enter your password again.');
    this.name = 'ChallengeExpiredError';
  }
  // #endregion
}

/**
 * Class AlreadyBootstrappedError
 * @class AlreadyBootstrappedError
 * @extends ApplicationError
 *
 * @description
 * Indicates that initial administrator bootstrap cannot run because an account already exists.
 */
export class AlreadyBootstrappedError extends ApplicationError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Assigns the stable conflict code used when bootstrap has already completed.
   */
  public constructor() {
    super('identity.already-bootstrapped', 'The administrator account already exists.');
    this.name = 'AlreadyBootstrappedError';
  }
  // #endregion
}
