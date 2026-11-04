/**
 * Interface BarListItem
 * @interface BarListItem
 *
 * @description
 * One row of a ranked bar list: a name, its value (the bar length, relative to the largest row) and
 * the value as printed at the row's end.
 */
export interface BarListItem {
  // #region Properties
  /**
   * Property key
   * @readonly
   *
   * @description
   * Stable identity of the row, used to track it across updates.
   *
   * @type {string}
   */
  readonly key: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Name of the row (a channel, a country, a page path).
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Measured value, zero or more.
   *
   * @type {number}
   */
  readonly value: number;

  /**
   * Property display
   * @readonly
   *
   * @description
   * Formatted value printed at the row's end (`1 284 · 42 %`).
   *
   * @type {string}
   */
  readonly display: string;
  // #endregion
}
