import { slugify } from '@internal/content-web-data-access/lib/utils/slugify/slugify.utils';

describe('slugify', (): void => {
  it('strips the diacritics and joins the words with hyphens', (): void => {
    expect(slugify('Contexte')).toBe('contexte');
    expect(slugify('Ce que j’ai fait')).toBe('ce-que-j-ai-fait');
    expect(slugify('Choix techniques à Écully')).toBe('choix-techniques-a-ecully');
    expect(slugify('Résultat : 2 × plus rapide')).toBe('resultat-2-plus-rapide');
  });

  it('spells out the ligatures and trims the edge separators', (): void => {
    expect(slugify('  Œuvre & cœur… ')).toBe('oeuvre-coeur');
    expect(slugify('« Ex æquo »')).toBe('ex-aequo');
  });

  it('returns an empty slug for a label without letters or digits', (): void => {
    expect(slugify('')).toBe('');
    expect(slugify('— ? !')).toBe('');
    expect(slugify('日本語')).toBe('');
  });
});
