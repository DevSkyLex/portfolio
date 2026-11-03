import { UNTRANSLATED } from '@vfortin/content-web-data-access/admin';
import { PROJECT_SHORT_FIELDS } from '@internal/content-web-feature-admin/lib/constants/project-short-fields.constants';
import type { ContentLocale } from '@internal/content-web-feature-admin/lib/models/content-locale/content-locale.type';
import { ARTICLE_SECTIONS } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/article-section.model';
import type { ProjectFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/project-form-values.model';

/**
 * Function paragraphsOf
 *
 * @description
 * Splits a flat article value into its trimmed, non-empty paragraphs (blank-line separated).
 *
 * @param {string} value - Flat article text.
 *
 * @returns {string[]} The paragraphs, in order.
 */
function paragraphsOf(value: string): string[] {
  return value
    .split(/\n\s*\n/)
    .map((paragraph: string): string => paragraph.trim())
    .filter(Boolean);
}

/**
 * Function incompleteFields
 *
 * @description
 * Lists the localized fields of the form values still to complete in one language, with the paths and
 * the rule of the API's `missing` list (`Project.missingFor`): an empty presentation text, an article
 * section without French paragraph, or an English section where a French paragraph has no translation
 * (absent or still `[à traduire]`). It follows the edits, unlike the `missing` list of the last answer.
 *
 * @param {ProjectFormValues} values - Current form values.
 * @param {ContentLocale} locale - Language inspected.
 *
 * @returns {string[]} Field paths such as `title.en` or `article.context.en`, in form order.
 */
export function incompleteFields(values: ProjectFormValues, locale: ContentLocale): string[] {
  const short: string[] = PROJECT_SHORT_FIELDS.filter(
    (field): boolean => values[field.key][locale].trim() === '',
  ).map((field): string => `${field.key}.${locale}`);
  const article: string[] = ARTICLE_SECTIONS.filter((section): boolean => {
    const french: string[] = paragraphsOf(values.article[section].fr);
    if (french.length === 0) return true;
    if (locale === 'fr') return false;
    const english: string[] = paragraphsOf(values.article[section].en);
    return french.some((_: string, index: number): boolean => {
      const translation: string | undefined = english[index];
      return translation === undefined || translation === UNTRANSLATED;
    });
  }).map((section): string => `article.${section}.${locale}`);
  return [...short, ...article];
}
