/**
 * Interface ScatterPoint
 * @interface ScatterPoint
 *
 * @description
 * One item placed by two measures of a scatter chart, with both values already formatted.
 */
export interface ScatterPoint {
  // #region Properties
  /**
   * Property key
   * @readonly
   *
   * @description
   * Stable identity of the item.
   */
  readonly key: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Name of the item, shown on hover and in the table view.
   */
  readonly label: string;

  /**
   * Property x
   * @readonly
   *
   * @description
   * Horizontal measure, from zero.
   */
  readonly x: number;

  /**
   * Property y
   * @readonly
   *
   * @description
   * Vertical measure, from zero.
   */
  readonly y: number;

  /**
   * Property xDisplay
   * @readonly
   *
   * @description
   * Formatted horizontal measure.
   */
  readonly xDisplay: string;

  /**
   * Property yDisplay
   * @readonly
   *
   * @description
   * Formatted vertical measure.
   */
  readonly yDisplay: string;
  // #endregion
}
