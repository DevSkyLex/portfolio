import type { AdminProject } from '@vfortin/content-web-data-access/admin';
import { type DataTableState, hasActiveFilters, matchesFacets } from '@vfortin/ui';
import { PROJECT_TABLE_FACETS } from '@internal/content-web-feature-admin/lib/constants/project-table-facets.constants';
import { matchesProjectSearch } from '@internal/content-web-feature-admin/lib/utils/project-search/project-search.utils';

/**
 * Function visibleProjectCount
 *
 * @description
 * Number of projects the project table keeps across its pages, through the same search predicate and
 * facets as the table, for the "N sur M" count of the page title.
 *
 * @param {readonly AdminProject[]} projects - Every loaded project.
 * @param {DataTableState} state - Search and facets of the table.
 *
 * @returns {number | null} The narrowed count, or `null` while no search or facet is active.
 */
export function visibleProjectCount(
  projects: readonly AdminProject[],
  state: DataTableState,
): number | null {
  if (!hasActiveFilters(state)) return null;
  return projects.filter(
    (project: AdminProject): boolean =>
      matchesProjectSearch(project, state.search) &&
      matchesFacets(project, PROJECT_TABLE_FACETS, state.facets),
  ).length;
}
