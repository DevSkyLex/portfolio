/**
 * Interface StackedBarSegment
 * @interface StackedBarSegment
 *
 * @description
 * One part of a stacked bar, named and coloured by the legend entry of the same key.
 */
export interface StackedBarSegment {
  // #region Properties
  /**
   * Property key
   * @readonly
   *
   * @description
   * Key of the legend entry of this part.
   */
  readonly key: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Amount of the part, from zero.
   */
  readonly value: number;

  /**
   * Property display
   * @readonly
   *
   * @description
   * Formatted amount.
   */
  readonly display: string;
  // #endregion
}

/**
 * Interface StackedBarRow
 * @interface StackedBarRow
 *
 * @description
 * One whole of a stacked bar chart and its parts.
 */
export interface StackedBarRow {
  // #region Properties
  /**
   * Property key
   * @readonly
   *
   * @description
   * Stable identity of the whole.
   */
  readonly key: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Name of the whole.
   */
  readonly label: string;

  /**
   * Property display
   * @readonly
   *
   * @description
   * Formatted total printed beside the name.
   */
  readonly display: string;

  /**
   * Property segments
   * @readonly
   *
   * @description
   * Parts of the whole; a part missing from the list is zero.
   */
  readonly segments: readonly StackedBarSegment[];
  // #endregion
}
