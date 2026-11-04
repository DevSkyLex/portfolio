import type { DataTableEmptyLayout } from '@internal/ui/lib/data-table/models/data-table/data-table-empty-layout.type';

/**
 * Interface DataTableEmptyContext
 * @interface DataTableEmptyContext
 *
 * @description
 * Context of an `ng-template[uiDataTableEmpty]`: the table's empty layout, for the projected
 * `uiEmpty` (`let-layout`), so that the height rule is decided once, on the table.
 */
export interface DataTableEmptyContext {
  // #region Properties
  /**
   * Property $implicit
   * @readonly
   *
   * @description
   * Layout of the empty state, the table's `emptyLayout`.
   *
   * @type {DataTableEmptyLayout}
   */
  readonly $implicit: DataTableEmptyLayout;
  // #endregion
}
