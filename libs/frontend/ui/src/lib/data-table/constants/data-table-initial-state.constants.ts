import type { DataTableState } from '@internal/ui/lib/data-table/models/data-table/data-table-state.interface';

/**
 * Constant DATA_TABLE_INITIAL_STATE
 *
 * @description
 * State of a table nobody has touched: no search, facet or sort, first page of ten rows, every column
 * shown. Pages building their state from the URL start from it.
 *
 * @type {DataTableState}
 */
export const DATA_TABLE_INITIAL_STATE: DataTableState = {
  search: '',
  facets: {},
  sort: [],
  page: 0,
  pageSize: 10,
  hidden: [],
};
