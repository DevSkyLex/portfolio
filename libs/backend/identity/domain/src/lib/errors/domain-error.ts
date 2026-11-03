/**
 * Class DomainError
 * @class DomainError
 *
 * @description
 * Represents an identity business-rule failure with a stable code consumed by transport mapping.
 */
export class DomainError extends Error {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Sets the stable identity error code and message used by application and transport layers.
   *
   * @param {string} code - Stable code identifying the failed business rule.
   * @param {string} message - Human-readable explanation of the failure.
   */
  public constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
  // #endregion
}

/**
 * Class AccountLockedError
 * @class AccountLockedError
 * @extends DomainError
 *
 * @description
 * Indicates that repeated failed sign-ins temporarily prevent further authentication attempts.
 */
export class AccountLockedError extends DomainError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Records the instant when authentication can resume and assigns the stable lock error code.
   *
   * @param {Date} until - Instant when the account lock expires.
   */
  public constructor(public readonly until: Date) {
    super('identity.locked', 'Account locked after several failures; try again later.');
    this.name = 'AccountLockedError';
  }
  // #endregion
}

/**
 * Class WeakPasswordError
 * @class WeakPasswordError
 * @extends DomainError
 *
 * @description
 * Indicates that a password is shorter than the minimum length required for administrator credentials.
 */
export class WeakPasswordError extends DomainError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Assigns the stable weak-password code used by identity error mapping.
   */
  public constructor() {
    super('identity.weak-password', 'The password must be at least 12 characters long.');
    this.name = 'WeakPasswordError';
  }
  // #endregion
}
