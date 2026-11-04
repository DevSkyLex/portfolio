import {
  seoRangeFromParam,
  seoRangeParam,
} from '@internal/content-web-feature-admin/lib/utils/seo-range-query/seo-range-query.utils';

describe('seoRangeParam', (): void => {
  it('writes the French spelling and nothing for the default window', (): void => {
    expect(seoRangeParam('7d')).toBe('7j');
    expect(seoRangeParam('90d')).toBe('90j');
    expect(seoRangeParam('28d')).toBeNull();
  });
});

describe('seoRangeFromParam', (): void => {
  it('reads a window, an unknown or missing value being the default one', (): void => {
    expect(seoRangeFromParam('7j')).toBe('7d');
    expect(seoRangeFromParam('90j')).toBe('90d');
    expect(seoRangeFromParam('28j')).toBe('28d');
    expect(seoRangeFromParam('7d')).toBe('28d');
    expect(seoRangeFromParam(null)).toBe('28d');
  });
});
