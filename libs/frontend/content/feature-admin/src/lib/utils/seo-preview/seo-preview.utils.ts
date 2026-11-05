import { PROJECT_SEO_LIMITS } from '@internal/content-web-feature-admin/lib/constants/project-seo-limits.constants';
import { SEO_PREVIEW_SITE } from '@internal/content-web-feature-admin/lib/constants/seo-preview-site.constants';
import type { ContentLocale } from '@internal/content-web-feature-admin/lib/models/content-locale/content-locale.type';
import type { SeoPreview } from '@internal/content-web-feature-admin/lib/models/seo-preview/seo-preview.interface';
import type { ProjectFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/project-form-values.model';

/**
 * Function snippet
 *
 * @description
 * Cuts a description the way a search result does: beyond the warning length, at the last word that
 * fits, followed by an ellipsis.
 *
 * @param {string} text - Trimmed description.
 *
 * @returns {string} The text as displayed.
 */
const snippet: (text: string) => string = (text: string): string => {
  const max: number = PROJECT_SEO_LIMITS.descriptionWarning;
  if (text.length <= max) return text;
  const cut: string = text.slice(0, max);
  const space: number = cut.lastIndexOf(' ');
  // A single long word is cut where it stands rather than leaving a stub.
  const words: string = space > max / 2 ? cut.slice(0, space) : cut;
  return `${words.replace(/[\s.,;:!?…–—-]+$/u, '')} …`;
};

/**
 * Function seoPreview
 *
 * @description
 * One language's project page as a search result would list it: the custom search title, or the
 * project title followed by the site name; the custom description, or the summary, cut like a search
 * snippet; and the breadcrumb of the public URL (`/fr/projects/<slug>`, `/en/projects/<slug>`).
 *
 * @param {ProjectFormValues} values - Current form values.
 * @param {ContentLocale} locale - Language of the page.
 * @param {string} slug - Public slug of the project.
 *
 * @returns {SeoPreview} The preview.
 */
export function seoPreview(
  values: ProjectFormValues,
  locale: ContentLocale,
  slug: string,
): SeoPreview {
  const customTitle: string = values.seo.title[locale].trim();
  const title: string = values.title[locale].trim();
  return {
    title: customTitle || (title ? `${title} — ${SEO_PREVIEW_SITE.name}` : SEO_PREVIEW_SITE.name),
    description: snippet(values.seo.description[locale].trim() || values.summary[locale].trim()),
    breadcrumb: [SEO_PREVIEW_SITE.host, locale, 'projects', slug].join(' › '),
  };
}
