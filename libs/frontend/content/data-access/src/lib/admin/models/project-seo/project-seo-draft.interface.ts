import type { BilingualText } from '@internal/content-web-data-access/lib/admin/models/bilingual-text/bilingual-text.interface';

/**
 * Interface ProjectSeoDraft
 * @interface ProjectSeoDraft
 *
 * @description
 * Search texts and keywords as the form edits them; an empty string or list in either language means
 * "fall back" and is omitted from the revision (the French list is sent empty).
 */
export interface ProjectSeoDraft {
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
   * Keywords, by language; an empty English list is omitted from the revision.
   *
   * @type {{ fr: string[]; en: string[] }}
   */
  keywords: { fr: string[]; en: string[] };
  // #endregion
}
