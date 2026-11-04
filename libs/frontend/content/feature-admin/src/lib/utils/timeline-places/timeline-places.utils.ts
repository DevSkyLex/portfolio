import type { AdminTimelineEntry } from '@vfortin/content-web-data-access/admin';
import type { ContentLocale } from '@internal/content-web-feature-admin/lib/models/content-locale/content-locale.type';

/**
 * Constant TIMELINE_PLACE_DEFAULTS
 *
 * @description
 * Places offered even before any entry uses them, per language.
 *
 * @type {Readonly<Record<ContentLocale, readonly string[]>>}
 */
export const TIMELINE_PLACE_DEFAULTS: Readonly<Record<ContentLocale, readonly string[]>> = {
  fr: ['À distance'],
  en: ['Remote'],
};

/**
 * Function timelinePlaces
 *
 * @description
 * Suggestions of the « Lieu » field: the places already written in the timeline entries of every kind,
 * plus the defaults, per language, trimmed, without duplicates (case and accents ignored, the first
 * spelling kept) and sorted in French collation. The field stays free text.
 *
 * @param {readonly AdminTimelineEntry[]} entries - Entries of every kind.
 * @returns {Readonly<Record<ContentLocale, readonly string[]>>} Suggestions per language.
 */
export function timelinePlaces(
  entries: readonly AdminTimelineEntry[],
): Readonly<Record<ContentLocale, readonly string[]>> {
  const collator: Intl.Collator = new Intl.Collator('fr', { sensitivity: 'base' });
  const unique = (values: readonly (string | undefined)[]): readonly string[] => {
    const kept: string[] = [];
    for (const value of values) {
      const place: string = value?.trim() ?? '';
      if (place && !kept.some((other: string): boolean => collator.compare(other, place) === 0)) {
        kept.push(place);
      }
    }
    return kept.sort(collator.compare);
  };
  return {
    fr: unique([
      ...entries.map((entry: AdminTimelineEntry): string => entry.place.fr),
      ...TIMELINE_PLACE_DEFAULTS.fr,
    ]),
    en: unique([
      ...entries.map((entry: AdminTimelineEntry): string | undefined => entry.place.en),
      ...TIMELINE_PLACE_DEFAULTS.en,
    ]),
  };
}
