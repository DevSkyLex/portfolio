import type { ProjectImage, SiteLocale } from '@vfortin/content-web-model';
import type { PageSeo } from '@internal/content-web-data-access/lib/models/page-seo/page-seo.interface';
import { localizedUrl } from '@internal/content-web-data-access/lib/utils/localized-url/localized-url.utils';

/**
 * Function pageSeo
 *
 * @description
 * Resolves the locale-dependent head metadata of a public page (D42): canonical address in the page
 * locale, `fr` / `en` alternates with `x-default` on the French page, Open Graph locales (`fr_FR`,
 * `en_GB`) and the absolute share image. Every published page exists in both locales.
 *
 * @param {{ title: string; description: string; keywords?: readonly string[]; path: string; type: PageSeo['type']; image: ProjectImage | null; structuredData: PageSeo['structuredData'] }} page - Texts, keywords (none by default), locale-independent path, type, image and structured data of the page.
 * @param {SiteLocale} locale - Locale of the rendered page.
 * @param {string} origin - Site origin without a trailing slash.
 *
 * @returns {PageSeo} Metadata written by `PageSeoService`.
 */
export function pageSeo(
  page: {
    readonly title: string;
    readonly description: string;
    readonly path: string;
    readonly type: PageSeo['type'];
    readonly image: ProjectImage | null;
    readonly structuredData: PageSeo['structuredData'];
    readonly keywords?: readonly string[];
  },
  locale: SiteLocale,
  origin: string,
): PageSeo {
  const french: string = localizedUrl(origin, 'fr', page.path);
  const english: string = localizedUrl(origin, 'en', page.path);
  return {
    title: page.title,
    description: page.description,
    keywords: page.keywords ?? [],
    canonical: locale === 'en' ? english : french,
    alternates: [
      { hreflang: 'fr', href: french },
      { hreflang: 'en', href: english },
      { hreflang: 'x-default', href: french },
    ],
    type: page.type,
    locale: locale === 'en' ? 'en_GB' : 'fr_FR',
    alternateLocale: locale === 'en' ? 'fr_FR' : 'en_GB',
    image: page.image
      ? {
          url: `${origin}${page.image.src}`,
          width: page.image.width,
          height: page.image.height,
          alt: page.image.alt,
        }
      : null,
    structuredData: page.structuredData,
  };
}
