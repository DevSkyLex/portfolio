import {
  type PageSeo,
  type PageSeoMetaTag,
  pageSeoMetaTags,
} from '@vfortin/content-web-data-access/admin';
import type { SeoGeneratedTag } from '@internal/content-web-feature-admin/lib/models/seo-generated-tag/seo-generated-tag.interface';

/**
 * Function row
 *
 * @description
 * Row whose displayed value is the complete one.
 *
 * @param {string} name - Element name.
 * @param {string} value - Element value.
 *
 * @returns {SeoGeneratedTag} The row.
 */
const row = (name: string, value: string): SeoGeneratedTag => ({ name, value, full: value });

/**
 * Function jsonLdSummary
 *
 * @description
 * One-line summary of a JSON-LD block: its type, then its properties without the `@` keywords
 * (« CreativeWork : name, description »).
 *
 * @param {NonNullable<PageSeo['structuredData']>} data - Structured data of the page.
 *
 * @returns {string} The summary.
 */
const jsonLdSummary = (data: NonNullable<PageSeo['structuredData']>): string => {
  const type: string = String(data['@type']);
  const properties: string = Object.keys(data)
    .filter((key: string): boolean => !key.startsWith('@'))
    .join(', ');
  return $localize`:@@admin.project.seo.jsonLdSummary:${type}:type: : ${properties}:properties:`;
};

/**
 * Function seoGeneratedTags
 *
 * @description
 * Head elements of a public case study, from the metadata `projectPageSeo` resolves for it (D42): the
 * document title, the canonical link and the `hreflang` alternates, then every `<meta>` tag exactly as
 * `pageSeoMetaTags` gives them to `PageSeoService` (description, keywords, Open Graph, Twitter), and
 * the JSON-LD data block summarized by its type and properties (punctuated in the admin's language),
 * the whole JSON in `full`.
 *
 * @param {PageSeo} page - Resolved metadata of the page.
 *
 * @returns {readonly SeoGeneratedTag[]} Rows in document order.
 */
export function seoGeneratedTags(page: PageSeo): readonly SeoGeneratedTag[] {
  const data: PageSeo['structuredData'] = page.structuredData;
  return [
    row('title', page.title),
    row('canonical', page.canonical),
    ...page.alternates.map((alternate: PageSeo['alternates'][number]): SeoGeneratedTag =>
      row(`hreflang ${alternate.hreflang}`, alternate.href),
    ),
    ...pageSeoMetaTags(page).map((tag: PageSeoMetaTag): SeoGeneratedTag =>
      row(tag.key, tag.content),
    ),
    ...(data
      ? [
          {
            name: 'JSON-LD',
            value: jsonLdSummary(data),
            full: JSON.stringify(data, null, 2),
          },
        ]
      : []),
  ];
}
