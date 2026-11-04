/**
 * Interface DateRange
 * @interface DateRange
 *
 * @description
 * Inclusive range of local days chosen with `ui-date-range-picker`; both ends fall on the same day
 * for a one-day range.
 */
export interface DateRange {
  // #region Properties
  /**
   * Property start
   * @readonly
   *
   * @description
   * First day of the range, at local midnight.
   *
   * @type {Date}
   */
  readonly start: Date;

  /**
   * Property end
   * @readonly
   *
   * @description
   * Last day of the range, inclusive, at local midnight; never before `start`.
   *
   * @type {Date}
   */
  readonly end: Date;
  // #endregion
}
