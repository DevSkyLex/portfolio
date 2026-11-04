import type { EditableArticleBlockDto } from '@vfortin/content-contracts';
import type { ArticleFigureNode } from '@internal/content-web-data-access/lib/admin/models/article-document/article-figure-node.interface';

/**
 * Type ArticleBlockDraft
 * @type ArticleBlockDraft
 *
 * @description
 * Top-level block of an article document draft: a contract block, or the figure carrying its
 * display-only URL.
 */
export type ArticleBlockDraft =
  Exclude<EditableArticleBlockDto, { type: 'figure' }> | ArticleFigureNode;
