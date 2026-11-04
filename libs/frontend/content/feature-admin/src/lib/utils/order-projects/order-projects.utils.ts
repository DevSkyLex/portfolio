import type { AdminProject } from '@vfortin/content-web-data-access/admin';

/**
 * Constant COLLATOR
 *
 * @description
 * French collator of the title tie-break: it compares the French titles, whatever the admin's
 * language, as the public French site orders them.
 */
const COLLATOR: Intl.Collator = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' });

/**
 * Function orderProjects
 *
 * @description
 * Default order of the project table, the one of the public site: by position, then by French title.
 * The table keeps it whenever no column is sorted.
 *
 * @param {readonly AdminProject[]} projects - Loaded projects.
 *
 * @returns {AdminProject[]} Ordered copy.
 */
export function orderProjects(projects: readonly AdminProject[]): AdminProject[] {
  return [...projects].sort(
    (a: AdminProject, b: AdminProject): number =>
      a.position - b.position || COLLATOR.compare(a.title.fr, b.title.fr),
  );
}
