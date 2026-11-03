/**
 * Interface PanelLimits
 * @interface PanelLimits
 *
 * @description
 * Minimum and maximum size accepted by one panel in a resizable group, expressed as percentages.
 */
export interface PanelLimits {
  // #region Properties
  /**
   * Property min
   * @readonly
   *
   * @description
   * Lower size bound for the panel, as a percentage of the group's full size.
   *
   * @type {number}
   */
  readonly min: number;

  /**
   * Property max
   * @readonly
   *
   * @description
   * Upper size bound for the panel, as a percentage of the group's full size.
   *
   * @type {number}
   */
  readonly max: number;
  // #endregion
}
