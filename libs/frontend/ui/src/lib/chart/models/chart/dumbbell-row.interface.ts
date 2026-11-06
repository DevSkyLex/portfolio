/**
 * Interface DumbbellValue
 * @interface DumbbellValue
 *
 * @description
 * One end of a dumbbell row.
 */
export interface DumbbellValue {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Measure, from zero.
   */
  readonly value: number;

  /**
   * Property display
   * @readonly
   *
   * @description
   * Formatted measure.
   */
  readonly display: string;
  // #endregion
}

/**
 * Interface DumbbellRow
 * @interface DumbbellRow
 *
 * @description
 * One item compared on two measures of the same scale; a missing end is `null`.
 */
export interface DumbbellRow {
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
   * Name of the item.
   */
  readonly label: string;

  /**
   * Property start
   * @readonly
   *
   * @description
   * Measure of the first series.
   */
  readonly start: DumbbellValue | null;

  /**
   * Property end
   * @readonly
   *
   * @description
   * Measure of the second series.
   */
  readonly end: DumbbellValue | null;
  // #endregion
}
