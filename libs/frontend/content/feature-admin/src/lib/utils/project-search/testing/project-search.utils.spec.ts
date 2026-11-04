import type { AdminProject } from '@vfortin/content-web-data-access/admin';
import { matchesProjectSearch } from '@internal/content-web-feature-admin/lib/utils/project-search/project-search.utils';

/**
 * Constant PROJECT
 *
 * @description
 * Project fields read by the search; the rest of the view model is irrelevant here.
 */
const PROJECT: AdminProject = {
  slug: 'movah',
  title: { fr: 'Plateforme médecins' },
  techs: ['angular', 'nestjs'],
} as unknown as AdminProject;

describe('matchesProjectSearch', (): void => {
  it('finds every word in a title, the slug or a technology, accents and case ignored', (): void => {
    expect(matchesProjectSearch(PROJECT, '  MEDECIN  ')).toBe(true);
    expect(matchesProjectSearch(PROJECT, 'movah nest')).toBe(true);
    expect(matchesProjectSearch(PROJECT, '')).toBe(true);
    expect(matchesProjectSearch(PROJECT, 'medecin react')).toBe(false);
    expect(
      matchesProjectSearch({ ...PROJECT, title: { fr: 'Plateforme', en: 'Doctors' } }, 'doctors'),
    ).toBe(true);
  });
});
