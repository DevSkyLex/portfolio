/**
 * Interface ArticleFigureAttrs
 * @interface ArticleFigureAttrs
 *
 * @description
 * Attributes of an article figure as the editor holds them: the uploaded media, its texts and, for
 * display only, the URL of its WebP. `src` never reaches the API (D40): the revision drops it.
 */
export interface ArticleFigureAttrs {
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
   * Alternative text; empty while the draft still lacks it, which the completeness check reports.
   *
   * @type {string}
   */
  readonly alt: string;

  /**
   * Property caption
   * @readonly
   *
   * @description
   * Visible caption, possibly empty.
   *
   * @type {string}
   */
  readonly caption: string;

  /**
   * Property src
   * @readonly
   *
   * @description
   * URL of the full WebP resolved from the project's media list for display, `null` when unknown.
   *
   * @type {string | null | undefined}
   */
  readonly src?: string | null;
  // #endregion
}
