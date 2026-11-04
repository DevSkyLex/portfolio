/**
 * Interface DataTableLabels
 * @interface DataTableLabels
 *
 * @description
 * User-visible texts of the data table. The catalogue defaults are French `$localize` messages
 * (`DATA_TABLE_LABELS`); a consumer overrides any of them through the `labels` input.
 */
export interface DataTableLabels {
  // #region Properties
  /** Placeholder of the search field. */
  readonly searchPlaceholder: string;
  /** Accessible name of the search field. */
  readonly searchLabel: string;
  /** Toolbar button clearing the search and every facet. */
  readonly reset: string;
  /** Action of the no-result state. */
  readonly resetFilters: string;
  /** Accessible name of an active filter chip's remove button. */
  readonly removeFilter: (facet: string, value: string) => string;
  /** Column visibility button. */
  readonly columns: string;
  /** Heading of the column visibility menu. */
  readonly columnsMenu: string;
  /** Message when the table has no row at all. */
  readonly empty: string;
  /** Message when the search and facets leave no row. */
  readonly noResults: string;
  /** Description of the no-result state, under `noResults`. */
  readonly noResultsHint: string;
  /** Status announced while the rows load. */
  readonly loading: string;
  /** Label of the page size select. */
  readonly rowsPerPage: string;
  /** Range of the rendered rows, "1–10 sur 42". */
  readonly range: (from: number, to: number, total: number) => string;
  /** Current page among the pages, "Page 2 sur 5". */
  readonly pageStatus: (page: number, total: number) => string;
  /** Accessible names of the page buttons. */
  readonly firstPage: string;
  readonly previousPage: string;
  readonly nextPage: string;
  readonly lastPage: string;
  /** Accessible name of the page selection checkbox. */
  readonly selectAll: string;
  /** Accessible name of a row checkbox, from the row label or its position. */
  readonly selectRow: (name: string | number) => string;
  /** Button of a facet popover clearing its checked options. */
  readonly facetClear: string;
  /** Accessible name of a facet popover. */
  readonly facetPanel: (facet: string) => string;
  /** Accessible name of a column's resize handle. */
  readonly resizeColumn: (column: string) => string;
  // #endregion
}
