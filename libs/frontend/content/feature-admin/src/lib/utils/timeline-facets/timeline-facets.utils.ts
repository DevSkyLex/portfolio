import { lucideCircleDashed, lucideCode, lucideGlobe } from '@ng-icons/lucide';
import type { AdminTimelineEntry } from '@vfortin/content-web-data-access/admin';
import type { DataTableFacet, DataTableFacetOption } from '@vfortin/ui';
import { normalizeSearch } from '@internal/content-web-feature-admin/lib/utils/normalize-search/normalize-search.utils';

/**
 * Function placeText
 *
 * @description
 * French place of an entry as an option shows it: trimmed, inner spaces collapsed.
 *
 * @param {AdminTimelineEntry} entry - Row.
 *
 * @returns {string} Place, empty when the entry has none.
 */
function placeText(entry: AdminTimelineEntry): string {
  return entry.place.fr.trim().replace(/\s+/g, ' ');
}

/**
 * Function placeKey
 *
 * @description
 * Value of the « Lieu » facet for an entry: its French place folded (case and accents ignored), so
 * that « Joué-lès-Tours » and « joue-les-tours » are one option.
 *
 * @param {AdminTimelineEntry} entry - Row.
 *
 * @returns {string} Folded place, empty when the entry has none.
 */
function placeKey(entry: AdminTimelineEntry): string {
  return normalizeSearch(placeText(entry));
}

/**
 * Function timelinePlaceOptions
 *
 * @description
 * Options of the « Lieu » facet: the distinct French places of the rows (the first spelling kept,
 * entries without a place left out), in the collation of the build locale.
 *
 * @param {readonly AdminTimelineEntry[]} entries - Rows of the table.
 * @param {string} locale - Build locale (`LOCALE_ID`).
 *
 * @returns {readonly DataTableFacetOption[]} Options, folded place as the value.
 */
export function timelinePlaceOptions(
  entries: readonly AdminTimelineEntry[],
  locale: string,
): readonly DataTableFacetOption[] {
  const collator: Intl.Collator = new Intl.Collator(locale, { numeric: true });
  const labels: Map<string, string> = new Map<string, string>();
  for (const entry of entries) {
    const key: string = placeKey(entry);
    if (key && !labels.has(key)) labels.set(key, placeText(entry));
  }
  return [...labels]
    .map(([value, label]: [string, string]): DataTableFacetOption => ({ value, label }))
    .sort((a: DataTableFacetOption, b: DataTableFacetOption): number =>
      collator.compare(a.label, b.label),
    );
}

/**
 * Function timelineTechOptions
 *
 * @description
 * Options of the « Technos » facet: the distinct technology keys of the rows, labelled by themselves
 * as their badges are, in the collation of the build locale (numbers in numeric order).
 *
 * @param {readonly AdminTimelineEntry[]} entries - Rows of the table.
 * @param {string} locale - Build locale (`LOCALE_ID`).
 *
 * @returns {readonly DataTableFacetOption[]} Options.
 */
export function timelineTechOptions(
  entries: readonly AdminTimelineEntry[],
  locale: string,
): readonly DataTableFacetOption[] {
  const collator: Intl.Collator = new Intl.Collator(locale, { numeric: true });
  const keys: Set<string> = new Set<string>(
    entries.flatMap((entry: AdminTimelineEntry): readonly string[] => entry.techs),
  );
  return [...keys]
    .sort((a: string, b: string): number => collator.compare(a, b))
    .map((key: string): DataTableFacetOption => ({ value: key, label: key }));
}

/**
 * Function timelineTableFacets
 *
 * @description
 * Faceted filters of the experience and education tables, like the project table's: « État »
 * (« En cours » for an entry without end, else « Terminée »), « Lieu » and « Technos », whose options
 * come from the rows; an entry matches « Technos » when one of its keys is checked. The ids and values
 * stay in the table's in-memory state (the timeline list keeps no table state in its URL), and the
 * icons are glyphs the admin already ships.
 *
 * @param {readonly AdminTimelineEntry[]} entries - Rows of the table.
 * @param {string} locale - Build locale (`LOCALE_ID`).
 *
 * @returns {readonly DataTableFacet<AdminTimelineEntry>[]} Facets in toolbar order.
 */
export function timelineTableFacets(
  entries: readonly AdminTimelineEntry[],
  locale: string,
): readonly DataTableFacet<AdminTimelineEntry>[] {
  return [
    {
      id: 'etat',
      label: $localize`:@@admin.timeline.facet.state:État`,
      icon: lucideCircleDashed,
      value: (entry: AdminTimelineEntry): string => (entry.end === null ? 'en-cours' : 'terminee'),
      options: [
        { value: 'en-cours', label: $localize`:@@admin.timeline.facet.ongoing:En cours` },
        { value: 'terminee', label: $localize`:@@admin.timeline.facet.ended:Terminée` },
      ],
    },
    {
      id: 'lieu',
      label: $localize`:@@admin.timeline.facet.place:Lieu`,
      icon: lucideGlobe,
      value: (entry: AdminTimelineEntry): readonly string[] => {
        const key: string = placeKey(entry);
        return key ? [key] : [];
      },
      options: timelinePlaceOptions(entries, locale),
    },
    {
      id: 'technos',
      label: $localize`:@@admin.timeline.facet.techs:Technos`,
      icon: lucideCode,
      value: (entry: AdminTimelineEntry): readonly string[] => entry.techs,
      options: timelineTechOptions(entries, locale),
    },
  ];
}
