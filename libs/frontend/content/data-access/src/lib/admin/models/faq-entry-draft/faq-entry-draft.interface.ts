import type { BilingualText } from '@internal/content-web-data-access/lib/admin/models/bilingual-text/bilingual-text.interface';

/**
 * Interface FaqEntryDraft
 * @interface FaqEntryDraft
 *
 * @description
 * Question as the administration form edits it: one text per language, an empty English text meaning
 * none.
 */
export interface FaqEntryDraft {
  // #region Properties
  /**
   * Property question
   *
   * @description
   * Question per language.
   *
   * @type {BilingualText}
   */
  question: BilingualText;

  /**
   * Property answer
   *
   * @description
   * Plain-text answer per language.
   *
   * @type {BilingualText}
   */
  answer: BilingualText;
  // #endregion
}
