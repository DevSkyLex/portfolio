import { figuresMissingAlt, isArticleEmpty } from '@vfortin/content-web-data-access/admin';
import { PROJECT_SHORT_FIELDS } from '@internal/content-web-feature-admin/lib/constants/project-short-fields.constants';
import type { ContentLocale } from '@internal/content-web-feature-admin/lib/models/content-locale/content-locale.type';
import type { ProjectFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/project-form-values.model';

/**
 * Function incompleteFields
 *
 * @description
 * Lists the localized fields of the form values still to complete in one language, with the paths and
 * the rule of the API's `missing` list (`Project.missingFor`, D40): an empty presentation text, an
 * article without text nor figure (`article.<locale>`), an article figure without alternative text
 * (`article.<locale>.figures`), a cover without alternative text (`cover.alt.<locale>`). It follows the
 * edits, unlike the `missing` list of the last answer.
 *
 * @param {ProjectFormValues} values - Current form values.
 * @param {ContentLocale} locale - Language inspected.
 *
 * @returns {string[]} Field paths such as `title.en` or `article.en`, in form order.
 */
export function incompleteFields(values: ProjectFormValues, locale: ContentLocale): string[] {
  const paths: string[] = PROJECT_SHORT_FIELDS.filter(
    (field): boolean => values[field.key][locale].trim() === '',
  ).map((field): string => `${field.key}.${locale}`);
  if (isArticleEmpty(values.article[locale])) paths.push(`article.${locale}`);
  else if (figuresMissingAlt(values.article[locale]) > 0) paths.push(`article.${locale}.figures`);
  if (values.cover.media !== '' && values.cover.alt[locale].trim() === '')
    paths.push(`cover.alt.${locale}`);
  return paths;
}
