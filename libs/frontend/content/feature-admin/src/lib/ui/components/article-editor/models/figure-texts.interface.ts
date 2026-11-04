/**
 * Interface FigureTexts
 * @interface FigureTexts
 *
 * @description
 * Texts of an article figure edited in its dialog.
 */
export interface FigureTexts {
  // #region Properties
  /**
   * Property alt
   *
   * @description
   * Alternative text read by screen readers; required before publication.
   *
   * @type {string}
   */
  alt: string;

  /**
   * Property caption
   *
   * @description
   * Visible caption below the image, possibly empty.
   *
   * @type {string}
   */
  caption: string;
  // #endregion
}
