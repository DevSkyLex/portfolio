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

/**
 * Class PasswordMismatchError
 * @class PasswordMismatchError
 * @extends ApplicationError
 *
 * @description
 * Represents a wrong password asked again before a second-factor change; it counts towards the account
 * lock like a failed login, but is answered 422 so that the client keeps its session.
 */
export class PasswordMismatchError extends ApplicationError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Assigns the stable password-mismatch code.
   */
  public constructor() {
    super('identity.password-mismatch', 'The password is incorrect.');
    this.name = 'PasswordMismatchError';
  }
  // #endregion
}

/**
 * Class TotpInvalidError
 * @class TotpInvalidError
 * @extends ApplicationError
 *
 * @description
 * Represents a one-time code that matches neither the pending secret (enrollment) nor the active one
 * (removal), or that was already used.
 */
export class TotpInvalidError extends ApplicationError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Assigns the stable invalid-code code.
   */
  public constructor() {
    super('identity.totp-invalid', 'The code is incorrect.');
    this.name = 'TotpInvalidError';
  }
  // #endregion
}

/**
 * Class AuthorizationRequestExpiredError
 * @class AuthorizationRequestExpiredError
 * @extends ApplicationError
 *
 * @description
 * Represents a consent decision on a request that is unknown, expired, already decided or reviewed by
 * another administrator session (D45): the client must start the authorization again.
 */
export class AuthorizationRequestExpiredError extends ApplicationError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Assigns the stable expired-request code.
   */
  public constructor() {
    super(
      'identity.oauth-request-expired',
      'The authorization request expired or was already decided.',
    );
    this.name = 'AuthorizationRequestExpiredError';
  }
  // #endregion
}

/**
 * Class ConnectedApplicationNotFoundError
 * @class ConnectedApplicationNotFoundError
 * @extends ApplicationError
 *
 * @description
 * Represents the revocation of a consent that does not exist, belongs to another account or is
 * already revoked.
 */
export class ConnectedApplicationNotFoundError extends ApplicationError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Assigns the stable not-found code.
   */
  public constructor() {
    super('identity.oauth-application-not-found', 'The connected application does not exist.');
    this.name = 'ConnectedApplicationNotFoundError';
  }
  // #endregion
}
