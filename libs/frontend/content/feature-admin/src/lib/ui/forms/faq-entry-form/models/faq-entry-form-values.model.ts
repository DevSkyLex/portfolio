import type { BilingualText } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/bilingual-text.interface';

/**
 * Interface FaqEntryFormValues
 * @interface FaqEntryFormValues
 *
 * @description
 * Values of the FAQ entry form, the shape of `FaqEntryDraft` that the data access converts to a
 * request: one text per language.
 */
export interface FaqEntryFormValues {
  // #region Properties
  /**
   * Property question
   *
   * @description
   * « Question » per language.
   *
   * @type {BilingualText}
   */
  question: BilingualText;

  /**
   * Property answer
   *
   * @description
   * « Réponse » per language, plain text whose line breaks are kept.
   *
   * @type {BilingualText}
   */
  answer: BilingualText;
  // #endregion
}
