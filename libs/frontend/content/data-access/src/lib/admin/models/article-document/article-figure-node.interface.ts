import type { ArticleFigureAttrs } from '@internal/content-web-data-access/lib/admin/models/article-document/article-figure-attrs.interface';

/**
 * Interface ArticleFigureNode
 * @interface ArticleFigureNode
 *
 * @description
 * Top-level figure block of an article document draft.
 */
export interface ArticleFigureNode {
  // #region Properties
  /**
   * Property type
   * @readonly
   *
   * @description
   * Node name of the figure.
   *
   * @type {'figure'}
   */
  readonly type: 'figure';

  /**
   * Property attrs
   * @readonly
   *
   * @description
   * Media reference, texts and display-only URL.
   *
   * @type {ArticleFigureAttrs}
   */
  readonly attrs: ArticleFigureAttrs;
  // #endregion
}
