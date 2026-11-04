import type { SiteLocale } from '@vfortin/content-web-model';
import { SITE_IDENTITY } from '@internal/content-web-data-access/lib/constants/site-identity.constants';
import type { PageSeo } from '@internal/content-web-data-access/lib/models/page-seo/page-seo.interface';
import type { ProjectPageSeoSource } from '@internal/content-web-data-access/lib/models/page-seo/project-page-seo-source.type';
import { localizedUrl } from '@internal/content-web-data-access/lib/utils/localized-url/localized-url.utils';
import { pageSeo } from '@internal/content-web-data-access/lib/utils/page-seo/page-seo.utils';
import { seoDescription } from '@internal/content-web-data-access/lib/utils/seo-description/seo-description.utils';

/**
 * Function projectPageSeo
 *
 * @description
 * Head metadata of a case study (D42): the administrator's search title or `<title> — Valentin Fortin`,
 * the search description or the summary cut near 160 characters, the administrator's keywords or,
 * without any, the project's technology keys, the cover as share image and a schema.org
 * `CreativeWork` carrying the keywords joined with commas. The snapshot carries no publication date,
 * so none is written.
 *
 * @param {ProjectPageSeoSource} project - Case study in the page locale.
 * @param {SiteLocale} locale - Locale of the rendered page.
 * @param {string} origin - Site origin without a trailing slash.
 *
 * @returns {PageSeo} Metadata written by `PageSeoService`.
 */
export function projectPageSeo(
  project: ProjectPageSeoSource,
  locale: SiteLocale,
  origin: string,
): PageSeo {
  const path: string = `/projects/${encodeURIComponent(project.slug)}`;
  const title: string = project.seo.title ?? `${project.title} — ${SITE_IDENTITY.name}`;
  const description: string = project.seo.description ?? seoDescription(project.summary);
  const keywords: readonly string[] =
    project.seo.keywords.length > 0 ? project.seo.keywords : project.techs;
  const url: string = localizedUrl(origin, locale, path);
  return pageSeo(
    {
      title,
      description,
      keywords,
      path,
      type: 'article',
      image: project.cover,
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        headline: project.title,
        description,
        url,
        inLanguage: locale,
        ...(keywords.length > 0 ? { keywords: keywords.join(', ') } : {}),
        ...(project.cover ? { image: `${origin}${project.cover.src}` } : {}),
        author: {
          '@type': 'Person',
          name: SITE_IDENTITY.author,
          url: localizedUrl(origin, locale, '/'),
        },
      },
    },
    locale,
    origin,
  );
}
