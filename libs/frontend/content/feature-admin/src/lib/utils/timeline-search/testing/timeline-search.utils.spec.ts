import type { AdminTimelineEntry } from '@vfortin/content-web-data-access/admin';
import { matchesTimelineSearch } from '@internal/content-web-feature-admin/lib/utils/timeline-search/timeline-search.utils';

/**
 * Constant ENTRY
 *
 * @description
 * Entry with bilingual texts and technologies.
 */
const ENTRY: AdminTimelineEntry = {
  title: { fr: 'Développeur web', en: 'Web developer' },
  place: { fr: 'Cité-des-Exemples', en: 'Cite-des-Exemples' },
  techs: ['angular', 'php'],
} as unknown as AdminTimelineEntry;

describe('matchesTimelineSearch', (): void => {
  it('matches every word in the titles, places or technologies, ignoring case and accents', (): void => {
    expect(matchesTimelineSearch(ENTRY, 'developpeur CITE')).toBe(true);
    expect(matchesTimelineSearch(ENTRY, 'web angular')).toBe(true);
    expect(matchesTimelineSearch(ENTRY, '  ')).toBe(true);
    expect(matchesTimelineSearch(ENTRY, 'web vue')).toBe(false);
  });
});
