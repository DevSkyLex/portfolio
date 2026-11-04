/**
 * Interface ChartPoint
 * @interface ChartPoint
 *
 * @description
 * One position of a single-series chart: its label on the x axis (a formatted day, a month), its value
 * and that value as the reader should see it in the tooltip and the table view.
 */
export interface ChartPoint {
  // #region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Formatted x position, shown on the axis, in the tooltip and as the table row header.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Plotted value, zero or more.
   *
   * @type {number}
   */
  readonly value: number;

  /**
   * Property display
   * @readonly
   *
   * @description
   * Formatted value (`1 284`, `12,4 %`), read in the tooltip and the table view.
   *
   * @type {string}
   */
  readonly display: string;
  // #endregion
}
