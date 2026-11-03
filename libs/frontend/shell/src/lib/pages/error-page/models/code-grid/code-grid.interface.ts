import type { CodeCell } from '@internal/web-shell/lib/pages/error-page/models/code-cell/code-cell.interface';

/**
 * Interface CodeGrid
 * @interface CodeGrid
 *
 * @description
 * Bitmap of an error code: its column count and its cells in row-major order.
 */
export interface CodeGrid {
  // #region Properties
  /**
   * Property columns
   * @readonly
   *
   * @description
   * Grid width: five columns per digit and one separator column between digits.
   *
   * @type {number}
   */
  readonly columns: number;

  /**
   * Property cells
   * @readonly
   *
   * @description
   * Seven rows of cells, row after row.
   *
   * @type {CodeCell[]}
   */
  readonly cells: CodeCell[];
  // #endregion
}
