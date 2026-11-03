/**
 * Interface RelativeDateStep
 * @interface RelativeDateStep
 *
 * @description
 * One unit of the inbox's relative date scale.
 */
export interface RelativeDateStep {
  // #region Properties
  /**
   * Property unit
   * @readonly
   *
   * @description
   * Unit passed to `Intl.RelativeTimeFormat`.
   *
   * @type {Intl.RelativeTimeFormatUnit}
   */
  readonly unit: Intl.RelativeTimeFormatUnit;

  /**
   * Property size
   * @readonly
   *
   * @description
   * Number of previous units in one of this unit (60 seconds in a minute).
   *
   * @type {number}
   */
  readonly size: number;

  /**
   * Property limit
   * @readonly
   *
   * @description
   * Count from which the next unit takes over (24 hours become days).
   *
   * @type {number}
   */
  readonly limit: number;
  // #endregion
}
