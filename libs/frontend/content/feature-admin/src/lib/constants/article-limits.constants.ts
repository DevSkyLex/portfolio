/**
 * Constant ARTICLE_LIMITS
 *
 * @description
 * Browser copy of `ARTICLE_DOCUMENT_LIMITS` (`article-document.contract.ts`, D40): text characters,
 * nodes and figures of one article document. The browser imports no value from the contracts (D10), so
 * this copy changes with the contract.
 */
export const ARTICLE_LIMITS: {
  readonly text: number;
  readonly nodes: number;
  readonly figures: number;
} = { text: 100_000, nodes: 5_000, figures: 40 } as const;
