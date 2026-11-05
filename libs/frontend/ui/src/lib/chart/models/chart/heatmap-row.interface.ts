/**
 * Interface HeatmapCell
 * @interface HeatmapCell
 *
 * @description
 * One measured cell of a heatmap.
 */
export interface HeatmapCell {
  // #region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Full name of the cell (its day, for a calendar), read with its value.
   */
  readonly label: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Magnitude, from zero, that picks the cell's step of the ramp.
   */
  readonly value: number;

  /**
   * Property display
   * @readonly
   *
   * @description
   * Formatted value.
   */
  readonly display: string;
  // #endregion
}

/**
 * Interface HeatmapRow
 * @interface HeatmapRow
 *
 * @description
 * One row of a heatmap; `null` marks a slot outside the measured window, drawn empty.
 */
export interface HeatmapRow {
  // #region Properties
  /**
   * Property key
   * @readonly
   *
   * @description
   * Stable identity of the row.
   */
  readonly key: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Short row name shown in the left gutter.
   */
  readonly label: string;

  /**
   * Property cells
   * @readonly
   *
   * @description
   * One slot per column.
   */
  readonly cells: readonly (HeatmapCell | null)[];
  // #endregion
}
