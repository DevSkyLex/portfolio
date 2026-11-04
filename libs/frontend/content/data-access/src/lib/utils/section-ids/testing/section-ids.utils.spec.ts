import { sectionIds } from '@internal/content-web-data-access/lib/utils/section-ids/section-ids.utils';

describe('sectionIds', (): void => {
  it('keeps the slug of each distinct label', (): void => {
    expect(sectionIds(['Contexte', 'Ce que j’ai fait', 'Résultat'])).toEqual([
      'contexte',
      'ce-que-j-ai-fait',
      'resultat',
    ]);
  });

  it('suffixes the repeated slugs from 2, skipping the taken ones', (): void => {
    expect(sectionIds(['Étape', 'Etape', 'étape', 'Étape 2'])).toEqual([
      'etape',
      'etape-2',
      'etape-3',
      'etape-2-2',
    ]);
    expect(sectionIds(['Étape 2', 'Étape', 'Étape'])).toEqual(['etape-2', 'etape', 'etape-3']);
  });

  it('falls back on the position when the slug is empty', (): void => {
    expect(sectionIds(['Contexte', '', '!!!', 'Section 2'])).toEqual([
      'contexte',
      'section-2',
      'section-3',
      'section-2-2',
    ]);
    expect(sectionIds([])).toEqual([]);
  });

  it('never reuses an id of the site layout', (): void => {
    expect(sectionIds(['Content', 'Site menu', 'Contexte'])).toEqual([
      'content-2',
      'site-menu-2',
      'contexte',
    ]);
  });
});
