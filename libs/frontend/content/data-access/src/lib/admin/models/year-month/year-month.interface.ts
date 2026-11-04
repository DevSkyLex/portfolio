/**
 * Interface YearMonth
 * @interface YearMonth
 *
 * @description
 * Month of a timeline period: four-digit year and one-based month.
 */
export interface YearMonth {
  // #region Properties
  /**
   * Property year
   * @readonly
   *
   * @description
   * Year, 1990 to 2100.
   *
   * @type {number}
   */
  readonly year: number;

  /**
   * Property month
   * @readonly
   *
   * @description
   * Month, 1 (January) to 12.
   *
   * @type {number}
   */
  readonly month: number;
  // #endregion
}
