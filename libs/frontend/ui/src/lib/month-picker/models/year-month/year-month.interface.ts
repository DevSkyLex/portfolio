/**
 * Interface YearMonth
 *
 * @description
 * Value of `ui-month-picker`: a calendar month, counted from 1 (January) to 12.
 */
export interface YearMonth {
  /**
   * Property year
   *
   * @description
   * Four-digit calendar year.
   *
   * @type {number}
   */
  readonly year: number;

  /**
   * Property month
   *
   * @description
   * Month from 1 to 12.
   *
   * @type {number}
   */
  readonly month: number;
}
