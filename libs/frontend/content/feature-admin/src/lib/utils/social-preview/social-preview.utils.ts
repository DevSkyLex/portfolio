import type { PageSeo, ProjectPageSeoSource } from '@vfortin/content-web-data-access/admin';
import type { SocialPreview } from '@internal/content-web-feature-admin/lib/models/social-preview/social-preview.interface';

/**
 * Function socialPreview
 *
 * @description
 * Link card of a case study: the domain of the site origin, the Open Graph title and description
 * resolved by `projectPageSeo`, and the cover of the source when the page has a share image.
 *
 * @param {PageSeo} page - Resolved metadata of the page.
 * @param {ProjectPageSeoSource} source - Values the metadata were resolved from.
 * @param {string} origin - Site origin, such as `https://valentin-fortin.pro`.
 *
 * @returns {SocialPreview} The card.
 */
export function socialPreview(
  page: PageSeo,
  source: ProjectPageSeoSource,
  origin: string,
): SocialPreview {
  return {
    domain: new URL(origin).host,
    title: page.title,
    description: page.description,
    image: page.image && source.cover ? { src: source.cover.src, alt: source.cover.alt } : null,
  };
}
