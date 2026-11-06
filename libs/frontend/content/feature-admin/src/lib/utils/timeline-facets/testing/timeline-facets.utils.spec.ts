import type { AdminTimelineEntry } from '@vfortin/content-web-data-access/admin';
import { type DataTableFacet, matchesFacets } from '@vfortin/ui';
import {
  timelinePlaceOptions,
  timelineTableFacets,
  timelineTechOptions,
} from '@internal/content-web-feature-admin/lib/utils/timeline-facets/timeline-facets.utils';
import { matchesTimelineSearch } from '@internal/content-web-feature-admin/lib/utils/timeline-search/timeline-search.utils';

/**
 * Function entry
 *
 * @description
 * Timeline entry with the fields the facets read; the other fields do not matter here.
 *
 * @param {string} id - Identifier, also the French title.
 * @param {string} place - French place.
 * @param {readonly string[]} techs - Technology keys.
 * @param {boolean} [ongoing] - Whether the entry has no end.
 *
 * @returns {AdminTimelineEntry} Entry.
 */
function entry(
  id: string,
  place: string,
  techs: readonly string[],
  ongoing: boolean = false,
): AdminTimelineEntry {
  return {
    id,
    title: { fr: id, en: id },
    place: { fr: place, en: place },
    techs,
    start: { year: 2022, month: 1 },
    end: ongoing ? null : { year: 2023, month: 6 },
  } as unknown as AdminTimelineEntry;
}

/**
 * Constant ENTRIES
 *
 * @description
 * Rows with case and accent variants of a place, an entry without place and shared technologies.
 */
const ENTRIES: readonly AdminTimelineEntry[] = [
  entry('oaas', 'Ville-Exemple', ['angular', 'php'], true),
  entry('open-reading-collective', ' Cité-des-Exemples ', ['vue', 'php']),
  entry('stage', 'cite-des-exemples', ['angular']),
  entry('bts', 'Paris', ['symfony2', 'symfony10']),
  entry('sans-lieu', '  ', []),
];

/**
 * Function kept
 *
 * @description
 * Identifiers of the rows passing the search and the checked facet values, as the table filters them.
 *
 * @param {Readonly<Record<string, readonly string[]>>} checked - Checked values per facet id.
 * @param {string} [query] - Search query.
 *
 * @returns {string[]} Kept identifiers, in row order.
 */
function kept(checked: Readonly<Record<string, readonly string[]>>, query: string = ''): string[] {
  const facets: readonly DataTableFacet<AdminTimelineEntry>[] = timelineTableFacets(ENTRIES, 'fr');
  return ENTRIES.filter(
    (row: AdminTimelineEntry): boolean =>
      matchesTimelineSearch(row, query) && matchesFacets(row, facets, checked),
  ).map((row: AdminTimelineEntry): string => row.id);
}

describe('timelineTableFacets', (): void => {
  it('offers « État », « Lieu » and « Technos », the state with its two fixed options', (): void => {
    const facets: readonly DataTableFacet<AdminTimelineEntry>[] = timelineTableFacets(
      ENTRIES,
      'fr',
    );
    expect(facets.map((facet: DataTableFacet<AdminTimelineEntry>): string => facet.label)).toEqual([
      'État',
      'Lieu',
      'Technos',
    ]);
    expect(facets[0]?.options).toEqual([
      { value: 'en-cours', label: 'En cours' },
      { value: 'terminee', label: 'Terminée' },
    ]);
    expect(facets.every((facet: DataTableFacet<AdminTimelineEntry>): boolean => !!facet.icon)).toBe(
      true,
    );
  });

  it('builds the places from the rows, once per folded spelling, in collation order', (): void => {
    expect(timelinePlaceOptions(ENTRIES, 'fr')).toEqual([
      { value: 'cite-des-exemples', label: 'Cité-des-Exemples' },
      { value: 'paris', label: 'Paris' },
      { value: 'ville-exemple', label: 'Ville-Exemple' },
    ]);
    expect(timelinePlaceOptions([], 'fr')).toEqual([]);
  });

  it('builds the distinct technology keys of the rows, numbers in numeric order', (): void => {
    expect(
      timelineTechOptions(ENTRIES, 'fr').map(
        (option: { readonly value: string; readonly label: string }): string =>
          `${option.value}=${option.label}`,
      ),
    ).toEqual([
      'angular=angular',
      'php=php',
      'symfony2=symfony2',
      'symfony10=symfony10',
      'vue=vue',
    ]);
  });

  it('filters by state, by any spelling of a place and by any checked technology', (): void => {
    expect(kept({ etat: ['en-cours'] })).toEqual(['oaas']);
    expect(kept({ etat: ['terminee'] })).toEqual([
      'open-reading-collective',
      'stage',
      'bts',
      'sans-lieu',
    ]);
    expect(kept({ lieu: ['cite-des-exemples'] })).toEqual(['open-reading-collective', 'stage']);
    expect(kept({ technos: ['vue', 'symfony2'] })).toEqual(['open-reading-collective', 'bts']);
    // Across facets every one must match.
    expect(kept({ lieu: ['cite-des-exemples', 'ville-exemple'], technos: ['angular'] })).toEqual([
      'oaas',
      'stage',
    ]);
  });

  it('combines the facets with the search', (): void => {
    expect(kept({ technos: ['php'] }, 'cite')).toEqual(['open-reading-collective']);
    expect(kept({ etat: ['terminee'] }, 'angular')).toEqual(['stage']);
    expect(kept({ lieu: ['paris'] }, 'angular')).toEqual([]);
  });
});
