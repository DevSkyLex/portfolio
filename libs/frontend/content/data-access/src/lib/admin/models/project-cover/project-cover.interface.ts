/**
 * Interface ProjectCover
 * @interface ProjectCover
 *
 * @description
 * Cover image of a loaded project: the uploaded media and its localized alternative text.
 */
export interface ProjectCover {
  // #region Properties
  /**
   * Property media
   * @readonly
   *
   * @description
   * Identifier (UUID) of the uploaded media.
   *
   * @type {string}
   */
  readonly media: string;

  /**
   * Property alt
   * @readonly
   *
   * @description
   * French alternative text, possibly empty in a draft, and its English translation when present.
   *
   * @type {{ readonly fr: string; readonly en?: string }}
   */
  readonly alt: { readonly fr: string; readonly en?: string };
  // #endregion
}
