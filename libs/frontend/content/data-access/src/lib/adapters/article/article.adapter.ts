import type {
  ArticleInlineDto,
  ArticleMarkDto,
  ArticleParagraphDto,
  CodeLanguageDto,
  CodeTokenDto,
  PublicArticleBlockDto,
  PublicArticleDocumentDto,
  PublicCodeBlockDto,
} from '@vfortin/content-contracts';
import type {
  ArticleBlock,
  ArticleCode,
  ArticleCodeToken,
  ArticleFlowBlock,
  ArticleInline,
  ArticleList,
  ArticleParagraph,
  ArticleSection,
  ProjectArticle,
} from '@vfortin/content-web-model';
import { CODE_LANGUAGE_LABELS } from '@internal/content-web-data-access/lib/constants/code-language-labels.constants';
import { sectionIds } from '@internal/content-web-data-access/lib/utils/section-ids/section-ids.utils';

/**
 * Interface ListNode
 * @interface ListNode
 *
 * @description
 * Structural view shared by the three list levels of the contract, so one function maps them all.
 */
interface ListNode {
  readonly type: 'bulletList' | 'orderedList';
  readonly attrs?: { readonly start?: number | undefined } | undefined;
  readonly content: readonly { readonly content: readonly (ArticleParagraphDto | ListNode)[] }[];
}

/**
 * Interface MarkedLeaf
 * @interface MarkedLeaf
 *
 * @description
 * Text or line break with the marks still to wrap it in, outermost first.
 */
interface MarkedLeaf {
  readonly node: ArticleInline;
  readonly marks: readonly ArticleMarkDto[];
}

/**
 * Constant MARK_ORDER
 *
 * @description
 * Nesting order of the marks, outermost first: a link wraps the whole formatted run it covers.
 */
const MARK_ORDER: readonly ArticleMarkDto['type'][] = ['link', 'bold', 'italic', 'code'];

/**
 * Function sameMark
 *
 * @description
 * Whether two marks wrap neighbouring text in the same element (same kind, and same target for links).
 */
function sameMark(a: ArticleMarkDto, b: ArticleMarkDto): boolean {
  if (a.type === 'link' || b.type === 'link') {
    return a.type === 'link' && b.type === 'link' && a.attrs.href === b.attrs.href;
  }
  return a.type === b.type;
}

/**
 * Function nest
 *
 * @description
 * Groups consecutive leaves sharing their outermost mark under one mark node, recursively.
 */
function nest(leaves: readonly MarkedLeaf[]): ArticleInline[] {
  const result: ArticleInline[] = [];
  let index: number = 0;
  while (index < leaves.length) {
    const leaf: MarkedLeaf = leaves[index] as MarkedLeaf;
    const mark: ArticleMarkDto | undefined = leaf.marks[0];
    if (!mark) {
      result.push(leaf.node);
      index++;
      continue;
    }
    let end: number = index + 1;
    while (end < leaves.length) {
      const next: ArticleMarkDto | undefined = leaves[end]?.marks[0];
      if (!next || !sameMark(next, mark)) break;
      end++;
    }
    const content: ArticleInline[] = nest(
      leaves
        .slice(index, end)
        .map((item: MarkedLeaf): MarkedLeaf => ({ node: item.node, marks: item.marks.slice(1) })),
    );
    result.push(
      mark.type === 'link'
        ? {
            kind: 'link',
            href: mark.attrs.href,
            external: mark.attrs.href.startsWith('https://'),
            content,
          }
        : { kind: mark.type, content },
    );
    index = end;
  }
  return result;
}

/**
 * Function toInline
 *
 * @description
 * Maps the flat inline content of the contract into the nested mark tree of the view model; duplicate
 * marks are dropped.
 *
 * @param {readonly ArticleInlineDto[] | undefined} content - Inline nodes of a paragraph or heading.
 *
 * @returns {ArticleInline[]} Inline tree, empty for an empty node.
 */
function toInline(content: readonly ArticleInlineDto[] | undefined): ArticleInline[] {
  return nest(
    (content ?? []).map((node: ArticleInlineDto): MarkedLeaf => {
      if (node.type === 'hardBreak') return { node: { kind: 'break' }, marks: [] };
      const marks: ArticleMarkDto[] = [];
      for (const type of MARK_ORDER) {
        const mark: ArticleMarkDto | undefined = node.marks?.find(
          (item: ArticleMarkDto): boolean => item.type === type,
        );
        if (mark) marks.push(mark);
      }
      return { node: { kind: 'text', text: node.text }, marks };
    }),
  );
}

/**
 * Function plainText
 *
 * @description
 * Reads the text of a heading, a line break counting as a space, with whitespace collapsed.
 */
function plainText(content: readonly ArticleInlineDto[] | undefined): string {
  return (content ?? [])
    .map((node: ArticleInlineDto): string => (node.type === 'text' ? node.text : ' '))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Function toParagraph
 *
 * @description
 * Maps a paragraph of the contract.
 */
function toParagraph(paragraph: ArticleParagraphDto): ArticleParagraph {
  return { kind: 'paragraph', content: toInline(paragraph.content) };
}

/**
 * Function toList
 *
 * @description
 * Maps a list of any level with its items and nested lists.
 */
function toList(list: ListNode): ArticleList {
  return {
    kind: 'list',
    ordered: list.type === 'orderedList',
    start: list.type === 'orderedList' ? (list.attrs?.start ?? 1) : 1,
    items: list.content.map((item: ListNode['content'][number]): ArticleFlowBlock[] =>
      item.content.map(toFlowBlock),
    ),
  };
}

/**
 * Function toFlowBlock
 *
 * @description
 * Maps a block of a list item or a quotation.
 */
function toFlowBlock(block: ArticleParagraphDto | ListNode): ArticleFlowBlock {
  return block.type === 'paragraph' ? toParagraph(block) : toList(block);
}

/**
 * Function toCode
 *
 * @description
 * Projects Mermaid source as a diagram and other languages as code. A snapshot written before
 * languages has no `attrs` or runs and reads as plain text.
 *
 * @param {PublicCodeBlockDto} block - Code block of the published document.
 *
 * @returns {ArticleCode | Extract<ArticleBlock, { kind: 'diagram' }>} Display block.
 */
function toCode(
  block: PublicCodeBlockDto,
): ArticleCode | Extract<ArticleBlock, { kind: 'diagram' }> {
  const language: CodeLanguageDto | null = block.attrs?.language ?? null;
  const text: string = (block.content ?? [])
    .map((node: { text: string }): string => node.text)
    .join('');
  if (language === 'mermaid') return { kind: 'diagram', source: text };
  return {
    kind: 'code',
    text,
    language: language === null ? null : CODE_LANGUAGE_LABELS[language],
    tokens: (block.tokens ?? []).map((token: CodeTokenDto): ArticleCodeToken => ({
      text: token.text,
      kind: token.kind,
    })),
  };
}

/**
 * Function toBlock
 *
 * @description
 * Maps a top-level block other than a level-2 heading; empty paragraphs and subheadings are dropped
 * because they would only render as blank space.
 *
 * @param {PublicArticleBlockDto} block - Block of the published document.
 *
 * @returns {ArticleBlock | null} View-model block, or `null` when there is nothing to show.
 */
function toBlock(block: PublicArticleBlockDto): ArticleBlock | null {
  switch (block.type) {
    case 'paragraph':
      return block.content?.length ? toParagraph(block) : null;
    case 'heading':
      return block.content?.length
        ? { kind: 'subheading', content: toInline(block.content) }
        : null;
    case 'bulletList':
    case 'orderedList':
      return toList(block);
    case 'blockquote':
      return { kind: 'blockquote', blocks: block.content.map(toFlowBlock) };
    case 'codeBlock':
      return toCode(block);
    case 'horizontalRule':
      return { kind: 'rule' };
    case 'figure':
      return {
        kind: 'figure',
        image: {
          src: block.attrs.src,
          small: block.attrs.small,
          width: block.attrs.width,
          height: block.attrs.height,
          alt: block.attrs.alt,
        },
        caption: block.attrs.caption,
      };
  }
}

/**
 * Function toArticle
 *
 * @description
 * Splits a published document at its level-2 headings (D40): the blocks before the first one form the
 * introduction, each heading opens a section labelled by its plain text and identified by a unique slug.
 *
 * @param {PublicArticleDocumentDto} document - Published article in the snapshot locale.
 *
 * @returns {Pick<ProjectArticle, 'intro' | 'sections'>} Introduction and sections in document order.
 */
export function toArticle(
  document: PublicArticleDocumentDto,
): Pick<ProjectArticle, 'intro' | 'sections'> {
  const intro: ArticleBlock[] = [];
  const parts: { label: string; blocks: ArticleBlock[] }[] = [];
  for (const block of document.content) {
    if (block.type === 'heading' && block.attrs.level === 2) {
      parts.push({ label: plainText(block.content), blocks: [] });
      continue;
    }
    const mapped: ArticleBlock | null = toBlock(block);
    if (mapped) (parts.at(-1)?.blocks ?? intro).push(mapped);
  }
  const ids: string[] = sectionIds(parts.map((part: { label: string }): string => part.label));
  return {
    intro,
    sections: parts.map(
      (part: { label: string; blocks: ArticleBlock[] }, index: number): ArticleSection => ({
        id: ids[index] as string,
        label: part.label,
        blocks: part.blocks,
      }),
    ),
  };
}
