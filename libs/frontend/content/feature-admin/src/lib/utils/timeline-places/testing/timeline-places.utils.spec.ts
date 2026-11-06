import type { AdminTimelineEntry } from '@vfortin/content-web-data-access/admin';
import { timelinePlaces } from '@internal/content-web-feature-admin/lib/utils/timeline-places/timeline-places.utils';

/**
 * Function entry
 *
 * @description
 * Timeline entry with the given places; the other fields do not matter here.
 *
 * @param {string} fr - French place.
 * @param {string} [en] - English place.
 * @returns {AdminTimelineEntry} Entry.
 */
function entry(fr: string, en?: string): AdminTimelineEntry {
  return { place: en === undefined ? { fr } : { fr, en } } as unknown as AdminTimelineEntry;
}

describe('timelinePlaces', (): void => {
  it('offers each written place once per language, with the defaults, in French order', (): void => {
    const places: ReturnType<typeof timelinePlaces> = timelinePlaces([
      entry('Ville-Exemple', 'Ville-Exemple'),
      entry(' Cité-des-Exemples ', 'Cite-des-Exemples'),
      entry('ville-exemple'),
      entry('Paris', ''),
      entry('Cite-des-Exemples'),
    ]);
    expect(places.fr).toEqual(['À distance', 'Cité-des-Exemples', 'Paris', 'Ville-Exemple']);
    expect(places.en).toEqual(['Cite-des-Exemples', 'Remote', 'Ville-Exemple']);
  });

  it('keeps the defaults when no entry exists yet', (): void => {
    expect(timelinePlaces([])).toEqual({ fr: ['À distance'], en: ['Remote'] });
  });
});
