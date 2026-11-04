import type { BilingualText } from '@internal/content-web-data-access/lib/admin/models/bilingual-text/bilingual-text.interface';

/**
 * Interface ProjectCoverDraft
 * @interface ProjectCoverDraft
 *
 * @description
 * Cover as the form edits it: always present so that its alternative texts bind to fields; an empty
 * `media` means the project has no cover and serializes to `null`.
 */
export interface ProjectCoverDraft {
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
   * French and English alternative texts; an empty English text means no translation yet.
   *
   * @type {BilingualText}
   */
  alt: BilingualText;
  // #endregion
}
