import type { DataTableState } from '@internal/ui/lib/data-table/models/data-table/data-table-state.interface';

/**
 * Function hasActiveFilters
 *
 * @description
 * Whether the search or a facet narrows the rows.
 *
 * @param {DataTableState} state - Table state.
 * @returns {boolean} Whether a filter is active.
 */
export function hasActiveFilters(state: DataTableState): boolean {
  return !!state.search.trim() || Object.values(state.facets).some((values) => values.length > 0);
}

/**
 * Function withFacet
 *
 * @description
 * State with one facet's checked values replaced, back on the first page; an empty list removes the
 * facet entry so that the state stays minimal.
 *
 * @param {DataTableState} state - Table state.
 * @param {string} id - Facet id.
 * @param {readonly string[]} values - Checked values.
 * @returns {DataTableState} New state.
 */
export function withFacet(
  state: DataTableState,
  id: string,
  values: readonly string[],
): DataTableState {
  const facets: Record<string, readonly string[]> = { ...state.facets };
  if (values.length) facets[id] = values;
  else delete facets[id];
  return { ...state, facets, page: 0 };
}

/**
 * Function withoutFilters
 *
 * @description
 * State without search nor facet, back on the first page; sort, page size and columns are kept.
 *
 * @param {DataTableState} state - Table state.
 * @returns {DataTableState} New state.
 */
export function withoutFilters(state: DataTableState): DataTableState {
  return { ...state, search: '', facets: {}, page: 0 };
}
