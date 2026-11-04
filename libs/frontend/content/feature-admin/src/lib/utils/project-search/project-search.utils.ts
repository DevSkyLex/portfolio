import type { AdminProject } from '@vfortin/content-web-data-access/admin';
import { normalizeSearch } from '@internal/content-web-feature-admin/lib/utils/normalize-search/normalize-search.utils';

/**
 * Function matchesProjectSearch
 *
 * @description
 * Search predicate of the project table: every searched word (case and accents ignored) occurs in the
 * French or English title, the slug or a technology key.
 *
 * @param {AdminProject} project - Project tested.
 * @param {string} query - Search typed in the table toolbar.
 *
 * @returns {boolean} Whether the project matches; a blank query matches every project.
 */
export function matchesProjectSearch(project: AdminProject, query: string): boolean {
  const words: string[] = normalizeSearch(query).split(/\s+/).filter(Boolean);
  const text: string = normalizeSearch(
    `${project.title.fr} ${project.title.en ?? ''} ${project.slug} ${project.techs.join(' ')}`,
  );
  return words.every((word: string): boolean => text.includes(word));
}
