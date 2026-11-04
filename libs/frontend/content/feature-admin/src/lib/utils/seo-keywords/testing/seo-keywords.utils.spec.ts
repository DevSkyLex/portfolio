import {
  keywordsError,
  mergeKeywords,
} from '@internal/content-web-feature-admin/lib/utils/seo-keywords/seo-keywords.utils';

describe('keywordsError', (): void => {
  it('accepts keywords within the contract bounds', (): void => {
    expect(keywordsError([])).toBeNull();
    expect(keywordsError(['go', 'k'.repeat(40)])).toBeNull();
  });

  it.each([
    [
      Array.from({ length: 11 }, (_: unknown, index: number): string => `mot ${index}`),
      'maxLength',
    ],
    [['Flutter', ' x '], 'keywordLength'],
    [['k'.repeat(41)], 'keywordLength'],
    [['Flutter', ' flutter '], 'duplicate'],
  ])('refuses %j (%s)', (keywords: string[], kind: string): void => {
    expect(keywordsError(keywords)?.kind).toBe(kind);
  });

  it('says what to fix in French', (): void => {
    expect(keywordsError(['x'])?.message).toBe('Chaque mot clé compte de 2 à 40 caractères.');
  });
});

describe('mergeKeywords', (): void => {
  it('appends the missing technologies after the written keywords', (): void => {
    expect(mergeKeywords(['Flutter', 'covoiturage'], ['flutter', 'supabase', 'c'])).toEqual([
      'Flutter',
      'covoiturage',
      'supabase',
    ]);
  });

  it('stops at ten keywords', (): void => {
    const nine: string[] = Array.from(
      { length: 9 },
      (_: unknown, index: number): string => `k${index}`,
    );
    expect(mergeKeywords(nine, ['angular', 'ngrx'])).toEqual([...nine, 'angular']);
  });
});
