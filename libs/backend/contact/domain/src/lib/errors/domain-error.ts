/**
 * Class DomainError
 * @class DomainError
 *
 * @description
 * Represents a contact-domain invariant failure with a stable code and affected field details.
 */
export class DomainError extends Error {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates a domain failure for transport mapping and validation feedback.
   * @param {string} code - Stable domain error identifier.
   * @param {string} message - Diagnostic describing the violated rule.
   * @param {readonly string[]} details - Fields associated with the violation.
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
 * Signals that a supplied domain value does not satisfy its format or bounds.
 */
export class InvalidValueError extends DomainError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates a domain validation error naming the invalid field and its violated constraint.
   * @param {string} field - Name of the invalid input field.
   * @param {string} reason - Constraint explanation included in the error message.
   */
  public constructor(field: string, reason: string) {
    super('contact.invalid-value', `${field}: ${reason}`, [field]);
    this.name = 'InvalidValueError';
  }
  // #endregion
}
