import type { AdminTimelineEntry } from '@vfortin/content-web-data-access/admin';
import { normalizeSearch } from '@internal/content-web-feature-admin/lib/utils/normalize-search/normalize-search.utils';

/**
 * Function matchesTimelineSearch
 *
 * @description
 * Search of the experience and education tables: every word of the query (case and accents ignored)
 * appears in the title, the place or the technologies, in either language.
 *
 * @param {AdminTimelineEntry} entry - Row.
 * @param {string} query - Typed query.
 *
 * @returns {boolean} Whether the row matches.
 */
export function matchesTimelineSearch(entry: AdminTimelineEntry, query: string): boolean {
  const words: string[] = normalizeSearch(query).split(/\s+/).filter(Boolean);
  const text: string = normalizeSearch(
    `${entry.title.fr} ${entry.title.en ?? ''} ${entry.place.fr} ${entry.place.en ?? ''} ${entry.techs.join(' ')}`,
  );
  return words.every((word: string): boolean => text.includes(word));
}
