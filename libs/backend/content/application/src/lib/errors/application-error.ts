/**
 * Class ApplicationError
 * @class ApplicationError
 *
 * @description
 * Carries a stable application error code for failures that controllers map to HTTP responses.
 */
export class ApplicationError extends Error {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates an application rejection with its transport-neutral code and message.
   *
   * @param {string} code - Stable identifier used by the problem mapper.
   * @param {string} message - Human-readable failure detail.
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
 * Class NotFoundError
 * @class NotFoundError
 *
 * @description
 * Identifies a requested content resource that the repository could not find.
 */
export class NotFoundError extends ApplicationError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Builds the stable not-found error for the requested resource kind.
   *
   * @param {string} what - Resource name included in the error message.
   */
  public constructor(what: string) {
    super('content.not-found', `${what} not found.`);
    this.name = 'NotFoundError';
  }
  // #endregion
}

/**
 * Class VersionMismatchError
 * @class VersionMismatchError
 *
 * @description
 * Signals that optimistic locking rejected a write because the stored project version changed.
 */
export class VersionMismatchError extends ApplicationError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates the version-conflict error instructing the editor to reload before retrying.
   */
  public constructor() {
    super('content.version-mismatch', 'The project was modified in the meantime; reload it.');
    this.name = 'VersionMismatchError';
  }
  // #endregion
}
