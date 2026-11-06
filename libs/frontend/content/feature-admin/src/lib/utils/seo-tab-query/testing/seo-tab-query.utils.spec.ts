import {
  SEO_TABS,
  seoTabFromParam,
  seoTabParam,
} from '@internal/content-web-feature-admin/lib/utils/seo-tab-query/seo-tab-query.utils';

describe('seoTabParam', (): void => {
  it('drops the parameter for the first tab and names the others', (): void => {
    expect(SEO_TABS.map(seoTabParam)).toEqual([null, 'audience', 'vitals', 'audit']);
  });
});

describe('seoTabFromParam', (): void => {
  it('reads a known tab and falls back to the first one', (): void => {
    expect(seoTabFromParam('audit')).toBe('audit');
    expect(seoTabFromParam(null)).toBe('search-console');
    expect(seoTabFromParam('nope')).toBe('search-console');
  });
});
