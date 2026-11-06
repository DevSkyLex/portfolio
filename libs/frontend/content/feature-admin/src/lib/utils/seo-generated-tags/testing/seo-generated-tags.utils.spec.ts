import {
  type PageSeo,
  type ProjectPageSeoSource,
  pageSeoMetaTags,
  projectPageSeo,
} from '@vfortin/content-web-data-access/admin';
import type { SeoGeneratedTag } from '@internal/content-web-feature-admin/lib/models/seo-generated-tag/seo-generated-tag.interface';
import { seoGeneratedTags } from '@internal/content-web-feature-admin/lib/utils/seo-generated-tags/seo-generated-tags.utils';

/**
 * Constant SOURCE
 *
 * @description
 * French case study without cover nor custom search values.
 */
const SOURCE: ProjectPageSeoSource = {
  slug: 'library-trails',
  title: 'Library Trails',
  summary: 'Une application mobile.',
  techs: ['flutter', 'supabase'],
  cover: null,
  seo: { title: null, description: null, keywords: [] },
};

describe('seoGeneratedTags', (): void => {
  it('lists the title, links, every meta tag of the public page and the JSON-LD summary', (): void => {
    const page: PageSeo = projectPageSeo(SOURCE, 'fr', 'https://valentin-fortin.pro');
    const rows: readonly SeoGeneratedTag[] = seoGeneratedTags(page);
    expect(rows.map((tag: SeoGeneratedTag): string => tag.name)).toEqual([
      'title',
      'canonical',
      'hreflang fr',
      'hreflang en',
      'hreflang x-default',
      ...pageSeoMetaTags(page).map((tag): string => tag.key),
      'JSON-LD',
    ]);
    expect(rows.find((tag: SeoGeneratedTag): boolean => tag.name === 'keywords')?.value).toBe(
      'flutter, supabase',
    );
    expect(rows.find((tag: SeoGeneratedTag): boolean => tag.name === 'hreflang en')?.value).toBe(
      'https://valentin-fortin.pro/en/projects/library-trails',
    );
    const jsonLd: SeoGeneratedTag | undefined = rows.at(-1);
    expect(jsonLd?.value).toBe(
      'CreativeWork : headline, description, url, inLanguage, keywords, author',
    );
    expect(JSON.parse(jsonLd?.full ?? '{}')).toEqual(page.structuredData);
  });

  it('omits the JSON-LD row of a page without structured data', (): void => {
    const page: PageSeo = {
      ...projectPageSeo(SOURCE, 'en', 'https://valentin-fortin.pro'),
      structuredData: null,
    };
    expect(
      seoGeneratedTags(page).some((tag: SeoGeneratedTag): boolean => tag.name === 'JSON-LD'),
    ).toBe(false);
  });
});
