/**
 * Interface SeoFormatter
 * @interface SeoFormatter
 *
 * @description
 * Formatters of the « Tableau de bord » figures in one build locale (`LOCALE_ID`), each built once
 * on `Intl`. Days (`YYYY-MM-DD`) are calendar days, formatted in UTC so that no time zone shifts them;
 * instants follow the viewer's time zone.
 */
export interface SeoFormatter {
  // #region Properties
  /**
   * Property count
   * @readonly
   *
   * @description
   * Whole number with grouping (`12 345`).
   */
  readonly count: (value: number) => string;

  /**
   * Property compact
   * @readonly
   *
   * @description
   * Compact number for axis ticks (`1,2 k`).
   */
  readonly compact: (value: number) => string;

  /**
   * Property percent
   * @readonly
   *
   * @description
   * Ratio from 0 to 1 as a percentage with at most one decimal (`4,2 %`).
   */
  readonly percent: (ratio: number) => string;

  /**
   * Property signedPercent
   * @readonly
   *
   * @description
   * Signed change ratio as a percentage (`+12 %`, `−3,5 %`).
   */
  readonly signedPercent: (ratio: number) => string;

  /**
   * Property decimal
   * @readonly
   *
   * @description
   * Number with one decimal (`8,3`), for average positions.
   */
  readonly decimal: (value: number) => string;

  /**
   * Property signedDecimal
   * @readonly
   *
   * @description
   * Signed number with one decimal (`−1,2`).
   */
  readonly signedDecimal: (value: number) => string;

  /**
   * Property duration
   * @readonly
   *
   * @description
   * Seconds as minutes and seconds (`1 min 23 s`, `42 s`).
   */
  readonly duration: (seconds: number) => string;

  /**
   * Property seconds
   * @readonly
   *
   * @description
   * Milliseconds as seconds with one decimal (`2,4 s`), for LCP.
   */
  readonly seconds: (milliseconds: number) => string;

  /**
   * Property milliseconds
   * @readonly
   *
   * @description
   * Whole milliseconds (`180 ms`), for INP and TBT.
   */
  readonly milliseconds: (milliseconds: number) => string;

  /**
   * Property shift
   * @readonly
   *
   * @description
   * Unitless layout shift with two decimals (`0,05`), for CLS.
   */
  readonly shift: (value: number) => string;

  /**
   * Property day
   * @readonly
   *
   * @description
   * Calendar day, short (`4 nov.`).
   */
  readonly day: (isoDay: string) => string;

  /**
   * Property span
   * @readonly
   *
   * @description
   * Range of calendar days (`8 oct. – 4 nov. 2026`).
   */
  readonly span: (start: string, end: string) => string;

  /**
   * Property dateTime
   * @readonly
   *
   * @description
   * Instant with its date and time (`4 nov. 2026, 10:32`).
   */
  readonly dateTime: (iso: string) => string;

  /**
   * Property time
   * @readonly
   *
   * @description
   * Time of an instant (`10:32`).
   */
  readonly time: (iso: string) => string;
  // #endregion
}
