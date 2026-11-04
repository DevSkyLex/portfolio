import type { AdminMedia, ProjectPageSeoSource } from '@vfortin/content-web-data-access/admin';
import type { ContentLocale } from '@internal/content-web-feature-admin/lib/models/content-locale/content-locale.type';
import type { ProjectFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/project-form-values.model';

/**
 * Function projectSeoSource
 *
 * @description
 * One language's case study as the snapshot would carry it once saved, from the current form values,
 * for the public `projectPageSeo` (D42): texts trimmed, blank search texts as `null`, keywords trimmed
 * and the cover resolved from the media known to the page (`null` without cover or when its media is
 * unknown). The editor thus lists and previews the tags of the public page with the same function.
 *
 * @param {ProjectFormValues} values - Current form values.
 * @param {ContentLocale} locale - Language of the page.
 * @param {string} slug - Public slug of the project.
 * @param {ReadonlyMap<string, AdminMedia>} media - Media known to the page, by id.
 *
 * @returns {ProjectPageSeoSource} Source of the page metadata.
 */
export function projectSeoSource(
  values: ProjectFormValues,
  locale: ContentLocale,
  slug: string,
  media: ReadonlyMap<string, AdminMedia>,
): ProjectPageSeoSource {
  const cover: AdminMedia | undefined = media.get(values.cover.media);
  return {
    slug,
    title: values.title[locale].trim(),
    summary: values.summary[locale].trim(),
    techs: values.techs,
    cover: cover
      ? {
          src: cover.src,
          small: null,
          width: cover.width,
          height: cover.height,
          alt: values.cover.alt[locale].trim(),
        }
      : null,
    seo: {
      title: values.seo.title[locale].trim() || null,
      description: values.seo.description[locale].trim() || null,
      keywords: values.seo.keywords[locale]
        .map((keyword: string): string => keyword.trim())
        .filter((keyword: string): boolean => keyword !== ''),
    },
  };
}
