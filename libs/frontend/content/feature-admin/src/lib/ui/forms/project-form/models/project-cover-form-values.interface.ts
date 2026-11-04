import type { BilingualText } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/bilingual-text.interface';

/**
 * Interface ProjectCoverFormValues
 * @interface ProjectCoverFormValues
 *
 * @description
 * Cover edited in the properties panel; always present so that its alternative texts bind
 * to fields, an empty `media` meaning no cover.
 */
export interface ProjectCoverFormValues {
  // #region Properties
  /**
   * Property media
   *
   * @description
   * Identifier of the chosen media, or an empty string without cover.
   *
   * @type {string}
   */
  media: string;

  /**
   * Property alt
   *
   * @description
   * French and English alternative texts of the cover.
   *
   * @type {BilingualText}
   */
  alt: BilingualText;
  // #endregion
}
