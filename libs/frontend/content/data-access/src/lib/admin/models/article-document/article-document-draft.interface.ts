import type { ArticleBlockDraft } from '@internal/content-web-data-access/lib/admin/models/article-document/article-block-draft.type';

/**
 * Interface ArticleDocumentDraft
 * @interface ArticleDocumentDraft
 *
 * @description
 * Article of one language as the editor reads and writes it (D40): the ProseMirror JSON subset of the
 * administrator contract, figures carrying their display-only URL.
 */
export interface ArticleDocumentDraft {
  // #region Properties
  /**
   * Property type
   * @readonly
   *
   * @description
   * Root node name.
   *
   * @type {'doc'}
   */
  readonly type: 'doc';

  /**
   * Property content
   * @readonly
   *
   * @description
   * Top-level blocks, at least one: an empty editor holds one empty paragraph.
   *
   * @type {readonly ArticleBlockDraft[]}
   */
  readonly content: readonly ArticleBlockDraft[];
  // #endregion
}
