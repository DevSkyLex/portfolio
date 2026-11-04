import type { BilingualText } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/bilingual-text.interface';

/**
 * Interface ProjectSeoFormValues
 * @interface ProjectSeoFormValues
 *
 * @description
 * Search texts and keywords edited in the "Référencement" section of each language tab; an empty
 * value falls back on the project title, summary or technologies of that language.
 */
export interface ProjectSeoFormValues {
  // #region Properties
  /**
   * Property title
   *
   * @description
   * Search titles, by language.
   *
   * @type {BilingualText}
   */
  title: BilingualText;

  /**
   * Property description
   *
   * @description
   * Search descriptions, by language.
   *
   * @type {BilingualText}
   */
  description: BilingualText;

  /**
   * Property keywords
   *
   * @description
   * Keywords, by language; an empty list falls back on the project technologies.
   *
   * @type {{ fr: string[]; en: string[] }}
   */
  keywords: { fr: string[]; en: string[] };
  // #endregion
}
