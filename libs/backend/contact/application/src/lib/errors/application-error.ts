/**
 * Class ApplicationError
 * @class ApplicationError
 *
 * @description
 * Represents an application boundary failure with a stable code for transport mapping.
 */
export class ApplicationError extends Error {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates an application failure and preserves its public code and message.
   * @param {string} code - Stable error identifier exposed by the API.
   * @param {string} message - Human-readable diagnostic message.
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
 * Class RateLimitedError
 * @class RateLimitedError
 *
 * @description
 * Signals that the origin has exhausted the contact submission allowance.
 */
export class RateLimitedError extends ApplicationError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates the stable rate-limit failure returned for excess submissions.
   */
  public constructor() {
    super('contact.rate-limited', 'Too many messages sent; try again later.');
    this.name = 'RateLimitedError';
  }
  // #endregion
}

/**
 * Class NotFoundError
 * @class NotFoundError
 *
 * @description
 * Signals that the requested contact message does not exist.
 */
export class NotFoundError extends ApplicationError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates the stable missing-message failure.
   */
  public constructor() {
    super('contact.not-found', 'Message not found.');
    this.name = 'NotFoundError';
  }
  // #endregion
}

/**
 * Class VersionMismatchError
 * @class VersionMismatchError
 *
 * @description
 * Signals that optimistic locking rejected a write because the message version has changed.
 */
export class VersionMismatchError extends ApplicationError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates the version conflict failure so the caller can reload current message state.
   */
  public constructor() {
    super('contact.version-mismatch', 'The message was modified in the meantime; reload the list.');
    this.name = 'VersionMismatchError';
  }
  // #endregion
}
