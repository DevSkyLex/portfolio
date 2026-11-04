import { SITE_IDENTITY } from '@internal/content-web-data-access/lib/constants/site-identity.constants';
import type { PageSeoMetaTag } from '@internal/content-web-data-access/lib/models/page-seo/page-seo-meta-tag.interface';
import type { PageSeo } from '@internal/content-web-data-access/lib/models/page-seo/page-seo.interface';

/**
 * Constant PAGE_SEO_REMOVABLE_TAGS
 *
 * @description
 * Selectors of the page-specific `<meta>` tags, removed when a page does not write them (no keywords,
 * no image) or leaves; the description stays, restored to the site description.
 */
export const PAGE_SEO_REMOVABLE_TAGS: readonly string[] = [
  'name="keywords"',
  'property="og:type"',
  'property="og:title"',
  'property="og:description"',
  'property="og:url"',
  'property="og:site_name"',
  'property="og:locale"',
  'property="og:locale:alternate"',
  'property="og:image"',
  'property="og:image:width"',
  'property="og:image:height"',
  'property="og:image:alt"',
  'name="twitter:card"',
  'name="twitter:title"',
  'name="twitter:description"',
  'name="twitter:image"',
  'name="twitter:image:alt"',
];

/**
 * Function metaTagSelector
 *
 * @description
 * Attribute selector of a tag, in the form of `PAGE_SEO_REMOVABLE_TAGS` and `Meta.removeTag`.
 *
 * @param {PageSeoMetaTag} tag - Meta tag.
 *
 * @returns {string} Selector such as `property="og:title"`.
 */
export function metaTagSelector(tag: PageSeoMetaTag): string {
  return `${tag.attribute}="${tag.key}"`;
}

/**
 * Function pageSeoMetaTags
 *
 * @description
 * `<meta>` tags of a page (D42), in document order: description and keywords (left out when empty),
 * Open Graph (type, title, description, url, site name, locales, then the image with its size and
 * alternative text when there is one) and the Twitter card (`summary_large_image` with an image,
 * `summary` otherwise). `PageSeoService` writes exactly these, and the administrator editor lists them.
 *
 * @param {PageSeo} page - Resolved metadata of the page.
 *
 * @returns {readonly PageSeoMetaTag[]} Tags to write.
 */
export function pageSeoMetaTags(page: PageSeo): readonly PageSeoMetaTag[] {
  const name = (key: string, content: string): PageSeoMetaTag => ({
    attribute: 'name',
    key,
    content,
  });
  const property = (key: string, content: string): PageSeoMetaTag => ({
    attribute: 'property',
    key,
    content,
  });
  const image: PageSeo['image'] = page.image;
  return [
    name('description', page.description),
    ...(page.keywords.length > 0 ? [name('keywords', page.keywords.join(', '))] : []),
    property('og:type', page.type),
    property('og:title', page.title),
    property('og:description', page.description),
    property('og:url', page.canonical),
    property('og:site_name', SITE_IDENTITY.name),
    property('og:locale', page.locale),
    property('og:locale:alternate', page.alternateLocale),
    ...(image
      ? [
          property('og:image', image.url),
          property('og:image:width', String(image.width)),
          property('og:image:height', String(image.height)),
          property('og:image:alt', image.alt),
        ]
      : []),
    name('twitter:card', image ? 'summary_large_image' : 'summary'),
    name('twitter:title', page.title),
    name('twitter:description', page.description),
    ...(image ? [name('twitter:image', image.url), name('twitter:image:alt', image.alt)] : []),
  ];
}
