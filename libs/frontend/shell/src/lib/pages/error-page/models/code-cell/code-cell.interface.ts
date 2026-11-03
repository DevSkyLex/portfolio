/**
 * Interface CodeCell
 * @interface CodeCell
 *
 * @description
 * One row-major bitmap cell with its reveal state and aurora animation coordinates.
 */
export interface CodeCell {
  // #region Properties
  /**
   * Property state
   * @readonly
   *
   * @description
   * Whether the grid cell is lit, faint, or the empty separator between digits.
   *
   * @type {'on' | 'off' | 'gap'}
   */
  readonly state: 'on' | 'off' | 'gap';

  /**
   * Property tint
   * @readonly
   *
   * @description
   * Horizontal aurora coordinate, from zero at the left edge to one at the right edge.
   *
   * @type {number}
   */
  readonly tint: number;

  /**
   * Property rank
   * @readonly
   *
   * @description
   * Diagonal reveal rank calculated from the cell's column and row.
   *
   * @type {number}
   */
  readonly rank: number;
  // #endregion
}
