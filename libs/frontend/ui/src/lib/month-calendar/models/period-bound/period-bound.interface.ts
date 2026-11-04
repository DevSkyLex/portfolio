/**
 * Interface PeriodBound
 *
 * @description
 * A calendar month, or a whole year when `month` is `null`. Months count from 1 (January) to 12,
 * as in the content contracts, unlike `Date.getMonth()`.
 */
export interface PeriodBound {
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
   * Month from 1 to 12, or `null` for the whole year.
   *
   * @type {number | null}
   */
  readonly month: number | null;
}
