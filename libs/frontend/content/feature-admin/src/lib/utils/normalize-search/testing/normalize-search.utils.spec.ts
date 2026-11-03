import { normalizeSearch } from '@internal/content-web-feature-admin/lib/utils/normalize-search/normalize-search.utils';

describe('normalizeSearch', (): void => {
  it('removes accents and lowers the case', (): void => {
    expect(normalizeSearch('Médecin ÎLE Noël')).toBe('medecin ile noel');
  });

  it('keeps text without accents unchanged apart from the case', (): void => {
    expect(normalizeSearch('Angular-22 SSR')).toBe('angular-22 ssr');
  });

  it('returns an empty string for an empty text', (): void => {
    expect(normalizeSearch('')).toBe('');
  });
});
