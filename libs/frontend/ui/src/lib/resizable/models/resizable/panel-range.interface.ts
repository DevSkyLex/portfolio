/**
 * Interface PanelRange
 * @interface PanelRange
 *
 * @description
 * Bounds of one panel resolved to percentages of the group, pixel bounds converted with its measured
 * size.
 */
export interface PanelRange {
  // #region Properties
  /**
   * Property min
   * @readonly
   *
   * @description
   * Lower bound, in percent of the group.
   *
   * @type {number}
   */
  readonly min: number;

  /**
   * Property max
   * @readonly
   *
   * @description
   * Upper bound, in percent of the group, never below `min`.
   *
   * @type {number}
   */
  readonly max: number;
  // #endregion
}
