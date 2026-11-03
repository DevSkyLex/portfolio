/**
 * Class DomainError
 * @class DomainError
 *
 * @description
 * Reports a content business-rule violation with a stable code and optional field details for
 * transport adapters.
 */
export class DomainError extends Error {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates a domain failure while retaining its response code and affected field paths.
   *
   * @param {string} code - Stable content error identifier.
   * @param {string} message - Human-readable rule failure.
   * @param {readonly string[]} details - Field paths associated with the failure.
   */
  public constructor(
    public readonly code: string,
    message: string,
    public readonly details: readonly string[] = [],
  ) {
    super(message);
    this.name = 'DomainError';
  }
  // #endregion
}

/**
 * Class InvalidValueError
 * @class InvalidValueError
 *
 * @description
 * Identifies a content value that violates a field-specific validation rule.
 */
export class InvalidValueError extends DomainError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates the common invalid-value failure and associates it with its field.
   *
   * @param {string} field - Invalid field name.
   * @param {string} reason - Validation failure detail appended to the field name.
   */
  public constructor(field: string, reason: string) {
    super('content.invalid-value', `${field}: ${reason}`, [field]);
    this.name = 'InvalidValueError';
  }
  // #endregion
}
