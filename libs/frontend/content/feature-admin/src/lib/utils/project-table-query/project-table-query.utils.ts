import type { ParamMap, Params } from '@angular/router';
import type { AdminProject } from '@vfortin/content-web-data-access/admin';
import type { DataTableColumn, DataTableSort, DataTableState } from '@vfortin/ui';
import { PROJECT_TABLE_COLUMNS } from '@internal/content-web-feature-admin/lib/constants/project-table-columns.constants';
import { PROJECT_TABLE_FACETS } from '@internal/content-web-feature-admin/lib/constants/project-table-facets.constants';

/**
 * Function projectTableState
 *
 * @description
 * Table state read from the list URL (`?q=&statut=publie&accueil=oui&completude=complet&tri=titre&ordre=asc&page=2`):
 * unknown facet values and sort columns are dropped, `page` is one-based; the page size and the hidden
 * columns, absent from the URL, come from `base`.
 *
 * @param {ParamMap} params - Query parameters of the list route.
 * @param {DataTableState} base - State supplying the values the URL does not carry.
 *
 * @returns {DataTableState} Table state.
 */
export function projectTableState(params: ParamMap, base: DataTableState): DataTableState {
  const facets: Record<string, readonly string[]> = {};
  for (const facet of PROJECT_TABLE_FACETS) {
    const known: readonly string[] = (facet.options ?? []).map(
      (option: { readonly value: string }): string => option.value,
    );
    const values: string[] = (params.get(facet.id) ?? '')
      .split(',')
      .filter((value: string): boolean => known.includes(value));
    if (values.length) facets[facet.id] = [...new Set(values)];
  }
  const column: string | null = params.get('tri');
  const sortable: boolean = PROJECT_TABLE_COLUMNS.some(
    (candidate: DataTableColumn<AdminProject>): boolean =>
      candidate.id === column && candidate.sortable === true,
  );
  const sort: DataTableSort[] =
    column && sortable
      ? [{ column, direction: params.get('ordre') === 'desc' ? 'desc' : 'asc' }]
      : [];
  const page: number = Number.parseInt(params.get('page') ?? '', 10);
  return {
    ...base,
    search: params.get('q') ?? '',
    facets,
    sort,
    page: Number.isFinite(page) && page > 1 ? page - 1 : 0,
  };
}

/**
 * Function projectTableQuery
 *
 * @description
 * Query parameters of a table state, the inverse of `projectTableState`; a default value is `null`, so
 * that the URL only carries what narrows or orders the list. Only the first sort key is kept.
 *
 * @param {DataTableState} state - Table state.
 *
 * @returns {Params} Query parameters to navigate with.
 */
export function projectTableQuery(state: DataTableState): Params {
  const query: Params = {
    q: state.search.trim() ? state.search : null,
    tri: state.sort[0]?.column ?? null,
    ordre: state.sort[0]?.direction ?? null,
    page: state.page > 0 ? String(state.page + 1) : null,
  };
  for (const facet of PROJECT_TABLE_FACETS) {
    const values: readonly string[] = state.facets[facet.id] ?? [];
    query[facet.id] = values.length ? values.join(',') : null;
  }
  return query;
}
