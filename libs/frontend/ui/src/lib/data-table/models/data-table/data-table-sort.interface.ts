import type { SortDirection } from '@internal/ui/lib/data-table/models/data-table/sort-direction.type';

/**
 * Interface DataTableSort
 * @interface DataTableSort
 *
 * @description
 * Active sort column and direction selected by the table header.
 */
export interface DataTableSort {
  // #region Properties
  /**
   * Property column
   * @readonly
   *
   * @description
   * Identifier of the currently sorted column.
   *
   * @type {string}
   */
  readonly column: string;

  /**
   * Property direction
   * @readonly
   *
   * @description
   * Whether values are ordered from low to high or high to low.
   *
   * @type {SortDirection}
   */
  readonly direction: SortDirection;
  // #endregion
}
