/**
 * Interface DataTableCellContext
 * @interface DataTableCellContext
 *
 * @description
 * Context supplied to a custom table cell template for the row and its position in the page.
 *
 * @template T - Row type rendered by the table.
 */
export interface DataTableCellContext<T> {
  // #region Properties
  /**
   * Property $implicit
   * @readonly
   *
   * @description
   * Row exposed as the template's default `let-row` variable.
   *
   * @type {T}
   */
  readonly $implicit: T;

  /**
   * Property index
   * @readonly
   *
   * @description
   * Zero-based position of the row within the currently rendered page.
   *
   * @type {number}
   */
  readonly index: number;
  // #endregion
}
