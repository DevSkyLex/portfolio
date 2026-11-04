import type {
  EditableArticleBlockDto,
  EditableArticleDocumentDto,
} from '@vfortin/content-contracts';
import type { AdminMedia } from '@internal/content-web-data-access/lib/admin/models/admin-media/admin-media.interface';
import type { ArticleBlockDraft } from '@internal/content-web-data-access/lib/admin/models/article-document/article-block-draft.type';
import type { ArticleDocumentDraft } from '@internal/content-web-data-access/lib/admin/models/article-document/article-document-draft.interface';

/**
 * Interface WalkedNode
 *
 * @description
 * Structural view of any document node, enough to look for text.
 */
interface WalkedNode {
  readonly type: string;
  readonly text?: string | undefined;
  readonly content?: readonly WalkedNode[] | undefined;
}

/**
 * Function hasText
 *
 * @description
 * Whether a node or one of its descendants holds non-whitespace text.
 *
 * @param {WalkedNode} node - Node inspected.
 *
 * @returns {boolean} `true` at the first visible character.
 */
function hasText(node: WalkedNode): boolean {
  if (typeof node.text === 'string' && node.text.trim() !== '') return true;
  return (node.content ?? []).some(hasText);
}

/**
 * Function emptyArticleDocument
 *
 * @description
 * Document of a language not written yet: one empty paragraph, the state of an empty editor.
 *
 * @returns {ArticleDocumentDraft} A new empty document.
 */
export function emptyArticleDocument(): ArticleDocumentDraft {
  return { type: 'doc', content: [{ type: 'paragraph' }] };
}

/**
 * Function isArticleEmpty
 *
 * @description
 * Domain rule of an empty article (D40): no non-whitespace text and no figure. An absent document is
 * empty.
 *
 * @param {ArticleDocumentDraft | null | undefined} document - Document inspected.
 *
 * @returns {boolean} Whether the document counts as not written.
 */
export function isArticleEmpty(document: ArticleDocumentDraft | null | undefined): boolean {
  if (!document) return true;
  return !document.content.some(
    (block: ArticleBlockDraft): boolean => block.type === 'figure' || hasText(block),
  );
}

/**
 * Function figuresMissingAlt
 *
 * @description
 * Counts the figures of a document whose alternative text is empty once trimmed, which the domain
 * reports as `article.<locale>.figures`.
 *
 * @param {ArticleDocumentDraft | null | undefined} document - Document inspected.
 *
 * @returns {number} Number of figures without alternative text.
 */
export function figuresMissingAlt(document: ArticleDocumentDraft | null | undefined): number {
  return (document?.content ?? []).filter(
    (block: ArticleBlockDraft): boolean => block.type === 'figure' && block.attrs.alt.trim() === '',
  ).length;
}

/**
 * Function withFigureSources
 *
 * @description
 * Copies a document and gives each figure the URL of its media for display; a media missing from the
 * list leaves `src` at `null`, and the editor shows a placeholder.
 *
 * @param {ArticleDocumentDraft} document - Document loaded from the API.
 * @param {readonly AdminMedia[]} media - Media referenced by the project.
 *
 * @returns {ArticleDocumentDraft} Independent copy with resolved figure URLs.
 */
export function withFigureSources(
  document: ArticleDocumentDraft,
  media: readonly AdminMedia[],
): ArticleDocumentDraft {
  const sources: ReadonlyMap<string, string> = new Map<string, string>(
    media.map((item: AdminMedia): [string, string] => [item.id, item.src]),
  );
  return {
    type: 'doc',
    content: document.content.map((block: ArticleBlockDraft): ArticleBlockDraft =>
      block.type === 'figure'
        ? {
            type: 'figure',
            attrs: { ...block.attrs, src: sources.get(block.attrs.media) ?? null },
          }
        : structuredClone(block),
    ),
  };
}

/**
 * Function withoutFigureSources
 *
 * @description
 * Revision form of a document: each figure keeps its media, alternative text and caption only, since
 * `src` is a display attribute the contract does not know.
 *
 * @param {ArticleDocumentDraft} document - Document held by the editor.
 *
 * @returns {EditableArticleDocumentDto} Independent copy without display attributes.
 */
export function withoutFigureSources(document: ArticleDocumentDraft): EditableArticleDocumentDto {
  return {
    type: 'doc',
    content: document.content.map((block: ArticleBlockDraft): EditableArticleBlockDto =>
      block.type === 'figure'
        ? {
            type: 'figure',
            attrs: { media: block.attrs.media, alt: block.attrs.alt, caption: block.attrs.caption },
          }
        : structuredClone(block),
    ),
  };
}
