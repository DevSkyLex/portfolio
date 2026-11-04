import type { AdminProject } from '@vfortin/content-web-data-access/admin';
import type { ProjectBulkAction } from '@internal/content-web-feature-admin/lib/models/project-bulk-action/project-bulk-action.type';

/**
 * Function isBulkEligible
 *
 * @description
 * Whether an action changes a project, under the row menu's rules: publication of a complete draft,
 * unpublication of a published project, featuring of a project not featured, and the reverse.
 *
 * @param {ProjectBulkAction} action - Bulk action.
 * @param {AdminProject} project - Selected project.
 *
 * @returns {boolean} Whether the action applies.
 */
export function isBulkEligible(action: ProjectBulkAction, project: AdminProject): boolean {
  switch (action) {
    case 'publish':
      return project.status === 'draft' && project.missing.length === 0;
    case 'unpublish':
      return project.status === 'published';
    case 'feature':
      return !project.featured;
    case 'unfeature':
      return project.featured;
  }
}

/**
 * Function bulkTargets
 *
 * @description
 * Selected projects an action applies to, in selection order.
 *
 * @param {ProjectBulkAction} action - Bulk action.
 * @param {readonly AdminProject[]} projects - Selected projects.
 *
 * @returns {AdminProject[]} Eligible projects.
 */
export function bulkTargets(
  action: ProjectBulkAction,
  projects: readonly AdminProject[],
): AdminProject[] {
  return projects.filter((project: AdminProject): boolean => isBulkEligible(action, project));
}

/**
 * Function changesPublicSite
 *
 * @description
 * Whether a bulk action on these projects changes the public site: publication and unpublication
 * always do, the home-page feature only for a published project. Read on the eligible targets before
 * confirming, and on the written ones before announcing the rebuild.
 *
 * @param {ProjectBulkAction} action - Bulk action.
 * @param {readonly AdminProject[]} projects - Projects in their version before the action.
 *
 * @returns {boolean} Whether the public site changes.
 */
export function changesPublicSite(
  action: ProjectBulkAction,
  projects: readonly AdminProject[],
): boolean {
  if (projects.length === 0) return false;
  if (action === 'publish' || action === 'unpublish') return true;
  return projects.some((project: AdminProject): boolean => project.status === 'published');
}

/**
 * Function projectCount
 *
 * @description
 * Localized count of projects ("1 projet", "3 projets"): the `one` message takes the French
 * singular, for 0 and 1; the pages only count two projects or more with it.
 *
 * @param {number} count - Number of projects.
 *
 * @returns {string} Count with its noun.
 */
export function projectCount(count: number): string {
  return count < 2
    ? $localize`:@@admin.projects.count.one:${count}:count: projet`
    : $localize`:@@admin.projects.count.other:${count}:count: projets`;
}
