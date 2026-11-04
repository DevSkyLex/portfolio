import type { ArticleDocumentDraft } from '@vfortin/content-web-data-access/admin';
import { ARTICLE_LIMITS } from '@internal/content-web-feature-admin/lib/constants/article-limits.constants';

/**
 * Interface CountedNode
 *
 * @description
 * Structural view of any document node, enough to count it.
 */
interface CountedNode {
  readonly type: string;
  readonly text?: string | undefined;
  readonly content?: readonly CountedNode[] | undefined;
}

/**
 * Function exceedsArticleLimits
 *
 * @description
 * Whether a document goes past the contract bounds the API would refuse: more text, nodes or figures
 * than `ARTICLE_LIMITS`, counted like the contract's check (the root included).
 *
 * @param {ArticleDocumentDraft} document - Document inspected.
 *
 * @returns {boolean} `true` when the document is too large.
 */
export function exceedsArticleLimits(document: ArticleDocumentDraft): boolean {
  let nodes: number = 0;
  let text: number = 0;
  let figures: number = 0;
  const walk = (node: CountedNode): void => {
    nodes++;
    if (node.type === 'figure') figures++;
    if (typeof node.text === 'string') text += node.text.length;
    for (const child of node.content ?? []) walk(child);
  };
  walk(document);
  return (
    nodes > ARTICLE_LIMITS.nodes || text > ARTICLE_LIMITS.text || figures > ARTICLE_LIMITS.figures
  );
}
