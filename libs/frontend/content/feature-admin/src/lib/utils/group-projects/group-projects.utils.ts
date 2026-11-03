import type { AdminProject } from '@vfortin/content-web-data-access/admin';
import { PROJECT_GROUPS } from '@internal/content-web-feature-admin/lib/constants/project-groups.constants';
import type { ProjectGroup } from '@internal/content-web-feature-admin/lib/models/project-group/project-group.interface';
import type { ProjectView } from '@internal/content-web-feature-admin/lib/models/project-view/project-view.type';
import { normalizeSearch } from '@internal/content-web-feature-admin/lib/utils/normalize-search/normalize-search.utils';

/**
 * Function groupProjects
 *
 * @description
 * Groups projects by status in `PROJECT_GROUPS` order, keeping those whose French title, English title
 * or slug contains every searched word (case and accents ignored), within the status filter; empty
 * groups are dropped.
 *
 * @param {readonly AdminProject[]} projects - Loaded project collection.
 * @param {string} query - Search typed in the title bar; blank keeps every project.
 * @param {ProjectView} view - Status filter in use.
 *
 * @returns {ProjectGroup[]} Non-empty groups in display order.
 */
export function groupProjects(
  projects: readonly AdminProject[],
  query: string,
  view: ProjectView,
): ProjectGroup[] {
  const words: string[] = normalizeSearch(query).split(/\s+/).filter(Boolean);
  const matching: AdminProject[] = projects.filter((project: AdminProject): boolean => {
    const text: string = normalizeSearch(
      `${project.title.fr} ${project.title.en ?? ''} ${project.slug}`,
    );
    return words.every((word: string): boolean => text.includes(word));
  });
  return PROJECT_GROUPS.filter((group): boolean => view === 'all' || view === group.status)
    .map((group): { projects: AdminProject[]; status: AdminProject['status']; label: string } => ({
      ...group,
      projects: matching.filter(
        (project: AdminProject): boolean => project.status === group.status,
      ),
    }))
    .filter(
      (group: {
        projects: AdminProject[];
        status: AdminProject['status'];
        label: string;
      }): boolean => group.projects.length > 0,
    );
}
