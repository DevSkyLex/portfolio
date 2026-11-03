/**
 * Interface Span
 * @interface Span
 *
 * @description
 * Inclusive start and end values for one timeline step.
 */
export interface Span {
  // #region Properties
  /**
   * Property a
   * @readonly
   *
   * @description
   * Start of the step on the numeric timeline axis.
   *
   * @type {number}
   */
  readonly a: number;

  /**
   * Property b
   * @readonly
   *
   * @description
   * End of the step on the numeric timeline axis.
   *
   * @type {number}
   */
  readonly b: number;
  // #endregion
}
