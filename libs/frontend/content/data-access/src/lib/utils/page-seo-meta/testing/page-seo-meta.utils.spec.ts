import type { PageSeo } from '@internal/content-web-data-access/lib/models/page-seo/page-seo.interface';
import {
  PAGE_SEO_REMOVABLE_TAGS,
  metaTagSelector,
  pageSeoMetaTags,
} from '@internal/content-web-data-access/lib/utils/page-seo-meta/page-seo-meta.utils';

/**
 * Function page
 *
 * @description
 * Resolved metadata of a French case study with optional overrides.
 */
const page = (overrides: Partial<PageSeo> = {}): PageSeo => ({
  title: 'Movah — Valentin Fortin',
  description: 'Une application mobile.',
  keywords: ['Flutter', 'suivi de séries'],
  canonical: 'https://valentin-fortin.pro/projects/movah',
  alternates: [],
  type: 'article',
  locale: 'fr_FR',
  alternateLocale: 'en_GB',
  image: {
    url: 'https://valentin-fortin.pro/media/cover.webp',
    width: 2400,
    height: 1350,
    alt: 'Accueil de Movah',
  },
  structuredData: null,
  ...overrides,
});

describe('pageSeoMetaTags', (): void => {
  it('lists every tag of a page with an image and keywords, in document order', (): void => {
    expect(
      pageSeoMetaTags(page()).map((tag): [string, string] => [metaTagSelector(tag), tag.content]),
    ).toEqual([
      ['name="description"', 'Une application mobile.'],
      ['name="keywords"', 'Flutter, suivi de séries'],
      ['property="og:type"', 'article'],
      ['property="og:title"', 'Movah — Valentin Fortin'],
      ['property="og:description"', 'Une application mobile.'],
      ['property="og:url"', 'https://valentin-fortin.pro/projects/movah'],
      ['property="og:site_name"', 'Valentin Fortin'],
      ['property="og:locale"', 'fr_FR'],
      ['property="og:locale:alternate"', 'en_GB'],
      ['property="og:image"', 'https://valentin-fortin.pro/media/cover.webp'],
      ['property="og:image:width"', '2400'],
      ['property="og:image:height"', '1350'],
      ['property="og:image:alt"', 'Accueil de Movah'],
      ['name="twitter:card"', 'summary_large_image'],
      ['name="twitter:title"', 'Movah — Valentin Fortin'],
      ['name="twitter:description"', 'Une application mobile.'],
      ['name="twitter:image"', 'https://valentin-fortin.pro/media/cover.webp'],
      ['name="twitter:image:alt"', 'Accueil de Movah'],
    ]);
  });

  it('leaves out the keywords and image tags a page does not have', (): void => {
    const selectors: string[] = pageSeoMetaTags(page({ keywords: [], image: null })).map(
      metaTagSelector,
    );
    expect(selectors).not.toContain('name="keywords"');
    expect(selectors.filter((selector: string): boolean => selector.includes(':image'))).toEqual(
      [],
    );
    expect(
      pageSeoMetaTags(page({ image: null })).find((tag): boolean => tag.key === 'twitter:card')
        ?.content,
    ).toBe('summary');
  });

  it('only writes tags the service knows how to remove, besides the description', (): void => {
    for (const selector of pageSeoMetaTags(page()).map(metaTagSelector)) {
      if (selector !== 'name="description"') expect(PAGE_SEO_REMOVABLE_TAGS).toContain(selector);
    }
  });
});
