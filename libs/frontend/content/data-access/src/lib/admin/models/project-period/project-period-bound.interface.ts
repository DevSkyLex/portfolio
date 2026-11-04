/**
 * Interface ProjectPeriodBound
 * @interface ProjectPeriodBound
 *
 * @description
 * One end of a project period (D46): a year, with a one-based month or `null` for the whole year.
 */
export interface ProjectPeriodBound {
  // #region Properties
  /**
   * Property year
   * @readonly
   *
   * @description
   * Four-digit year, from 1990 to 2100.
   */
  readonly year: number;

  /**
   * Property month
   * @readonly
   *
   * @description
   * One-based month, or `null` when the bound is the whole year.
   */
  readonly month: number | null;
  // #endregion
}
