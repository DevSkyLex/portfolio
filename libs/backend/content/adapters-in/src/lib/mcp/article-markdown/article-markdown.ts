import markdownIt, { type MarkdownIt, type Token } from 'markdown-it';

/**
 * Constant ARTICLE_MARKDOWN_GUIDE
 *
 * @description
 * The Markdown dialect of the rich documents in the MCP tools (D54), as the AI reads it in the tool
 * schemas. It names every construct of the admin editor and nothing else.
 *
 * @type {string}
 */
export const ARTICLE_MARKDOWN_GUIDE: string = [
  'Rich document, as Markdown (CommonMark subset of the site editor) or as the editor JSON document a read returned.',
  'Blocks, separated by a blank line: paragraph; heading "## " (level 2) or "### " (level 3) only;',
  'bullet list "- item" and ordered list "1. item" (any start number), nested up to three levels by indenting',
  'under the item text; blockquote "> " holding paragraphs and lists; fenced code block ```language',
  '(typescript, javascript, html, xml, css, scss, json, bash, python, php, sql, yaml, markdown, java, csharp,',
  'go, rust, dockerfile, nginx, or none); horizontal rule "---";',
  'figure: a paragraph holding only ![alt text](media:<media id> "caption"), the id from upload_media or the',
  'media of the project (caption optional, alt text describes the image). Inline: **bold**, *italic*,',
  '`code` (never combined with bold, italic or a link), [text](https://… or mailto:…), hard line break',
  'with a backslash at the end of the line. A list item holds one paragraph, then nested lists only.',
  'Not available: other heading levels, tables, raw HTML, strikethrough, external image URLs.',
  'Empty paragraphs are not kept. Escape a literal * _ ` [ ] < # with a backslash.',
].join(' ');

/**
 * Class ArticleMarkdownError
 * @class ArticleMarkdownError
 *
 * @description
 * A Markdown construct the editor cannot hold, with the 1-based line where it starts.
 */
export class ArticleMarkdownError extends Error {
  // #region Constructor
  public constructor(
    message: string,
    public readonly line: number | null,
  ) {
    super(line === null ? message : `${message} (line ${line})`);
    this.name = 'ArticleMarkdownError';
  }
  // #endregion
}

/** Editor mark, as stored (`bold`, `italic`, `code`, `link` with its `href`). */
interface Mark {
  readonly type: string;
  readonly attrs?: { readonly href: string };
}

/** Editor node, as stored: the documents are checked against the contract after conversion. */
export interface DocNode {
  readonly type: string;
  readonly attrs?: Readonly<Record<string, unknown>>;
  readonly content?: readonly DocNode[];
  readonly text?: string;
  readonly marks?: readonly Mark[];
}

/**
 * Constant parser
 *
 * @description
 * CommonMark without HTML, linkify, typographic replacements, tables or strikethrough. Links keep the
 * URL as written (no percent-encoding), so a stored address reads back unchanged.
 *
 * @type {MarkdownIt}
 */
const parser: MarkdownIt = markdownIt('commonmark', {
  html: false,
  linkify: false,
  typographer: false,
});
parser.normalizeLink = (url: string): string => url;
parser.normalizeLinkText = (text: string): string => text;

/** Order in which marks nest, outermost first; `code` is written as a code span inside them. */
const MARK_ORDER: readonly string[] = ['link', 'bold', 'italic', 'code'];

const MEDIA_SOURCE: RegExp = /^media:([0-9a-fA-F-]{36})$/;

function lineOf(token: Token): number | null {
  return token.map === null ? null : token.map[0] + 1;
}

function sameMark(left: Mark, right: Mark): boolean {
  return left.type === right.type && left.attrs?.href === right.attrs?.href;
}

function sortMarks(marks: readonly Mark[]): Mark[] {
  return [...marks].sort(
    (left: Mark, right: Mark): number =>
      MARK_ORDER.indexOf(left.type) - MARK_ORDER.indexOf(right.type),
  );
}

function sameMarks(left: readonly Mark[], right: readonly Mark[]): boolean {
  return (
    left.length === right.length &&
    sortMarks(left).every((mark: Mark, index: number): boolean =>
      sameMark(mark, sortMarks(right)[index] as Mark),
    )
  );
}

/** Appends a text node, merged with the previous one when their marks match. */
function pushText(nodes: DocNode[], text: string, marks: readonly Mark[]): void {
  if (text === '') return;
  const last: DocNode | undefined = nodes.at(-1);
  if (last?.type === 'text' && sameMarks(last.marks ?? [], marks)) {
    nodes[nodes.length - 1] = { ...last, text: `${last.text ?? ''}${text}` };
    return;
  }
  nodes.push(
    marks.length > 0 ? { type: 'text', text, marks: sortMarks(marks) } : { type: 'text', text },
  );
}

// --- Markdown to document -------------------------------------------------------------------------

function inlineNodes(children: readonly Token[], line: number | null): DocNode[] {
  const nodes: DocNode[] = [];
  const marks: Mark[] = [];
  const close = (type: string): void => {
    const index: number = marks.map((mark: Mark): string => mark.type).lastIndexOf(type);
    if (index >= 0) marks.splice(index, 1);
  };
  for (const token of children) {
    switch (token.type) {
      case 'text':
        pushText(nodes, token.content, marks);
        break;
      case 'code_inline':
        if (marks.length > 0) {
          throw new ArticleMarkdownError(
            'Inline code cannot also be bold, italic or a link in the editor',
            line,
          );
        }
        pushText(nodes, token.content, [{ type: 'code' }]);
        break;
      case 'softbreak':
        pushText(nodes, ' ', marks);
        break;
      case 'hardbreak':
        nodes.push({ type: 'hardBreak' });
        break;
      case 'strong_open':
        marks.push({ type: 'bold' });
        break;
      case 'strong_close':
        close('bold');
        break;
      case 'em_open':
        marks.push({ type: 'italic' });
        break;
      case 'em_close':
        close('italic');
        break;
      case 'link_open':
        marks.push({ type: 'link', attrs: { href: String(token.attrGet('href') ?? '') } });
        break;
      case 'link_close':
        close('link');
        break;
      case 'image':
        throw new ArticleMarkdownError(
          'An image must be alone in its paragraph, written ![alt](media:<id> "caption")',
          line,
        );
      default:
        throw new ArticleMarkdownError(`Unsupported inline Markdown (${token.type})`, line);
    }
  }
  return nodes;
}

function figureOf(children: readonly Token[], line: number | null): DocNode | null {
  const meaningful: Token[] = children.filter(
    (token: Token): boolean =>
      !(token.type === 'softbreak' || (token.type === 'text' && token.content.trim() === '')),
  );
  const image: Token | undefined = meaningful[0];
  if (meaningful.length !== 1 || image?.type !== 'image') return null;
  const source: RegExpExecArray | null = MEDIA_SOURCE.exec(String(image.attrGet('src') ?? ''));
  if (source === null) {
    throw new ArticleMarkdownError(
      'Images come from upload_media: write ![alt](media:<media id> "caption"), not an external URL',
      line,
    );
  }
  return {
    type: 'figure',
    attrs: {
      media: (source[1] as string).toLowerCase(),
      // `content` keeps the raw label (escapes included); the children carry the decoded text.
      alt: (image.children ?? []).map((child: Token): string => child.content).join(''),
      caption: String(image.attrGet('title') ?? ''),
    },
  };
}

/** Reads blocks from `tokens[cursor.index]` until the closing token `close` (or the end). */
function blockNodes(
  tokens: readonly Token[],
  cursor: { index: number },
  close: string | null,
): DocNode[] {
  const nodes: DocNode[] = [];
  while (cursor.index < tokens.length) {
    const token: Token = tokens[cursor.index] as Token;
    const line: number | null = lineOf(token);
    if (close !== null && token.type === close) {
      cursor.index++;
      return nodes;
    }
    switch (token.type) {
      case 'paragraph_open': {
        const inline: Token = tokens[cursor.index + 1] as Token;
        const children: readonly Token[] = inline.children ?? [];
        const figure: DocNode | null = figureOf(children, line);
        if (figure !== null) {
          nodes.push(figure);
        } else {
          const content: DocNode[] = inlineNodes(children, line);
          nodes.push(content.length > 0 ? { type: 'paragraph', content } : { type: 'paragraph' });
        }
        cursor.index += 3;
        break;
      }
      case 'heading_open': {
        const level: number = Number(token.tag.slice(1));
        if (level !== 2 && level !== 3) {
          throw new ArticleMarkdownError('Headings are "## " (level 2) or "### " (level 3)', line);
        }
        const content: DocNode[] = inlineNodes(
          (tokens[cursor.index + 1] as Token).children ?? [],
          line,
        );
        nodes.push(
          content.length > 0
            ? { type: 'heading', attrs: { level }, content }
            : { type: 'heading', attrs: { level } },
        );
        cursor.index += 3;
        break;
      }
      case 'bullet_list_open':
      case 'ordered_list_open': {
        const ordered: boolean = token.type === 'ordered_list_open';
        const start: number = Number(token.attrGet('start') ?? 1);
        cursor.index++;
        const items: DocNode[] = [];
        const end: string = ordered ? 'ordered_list_close' : 'bullet_list_close';
        while ((tokens[cursor.index] as Token | undefined)?.type === 'list_item_open') {
          const itemLine: number | null = lineOf(tokens[cursor.index] as Token);
          cursor.index++;
          const content: DocNode[] = blockNodes(tokens, cursor, 'list_item_close');
          // The editor's list item: one paragraph, then nested lists only.
          if (
            content[0]?.type !== 'paragraph' ||
            content
              .slice(1)
              .some(
                (child: DocNode): boolean =>
                  child.type !== 'bulletList' && child.type !== 'orderedList',
              )
          ) {
            throw new ArticleMarkdownError(
              'A list item holds one paragraph, optionally followed by nested lists',
              itemLine,
            );
          }
          items.push({ type: 'listItem', content });
        }
        if ((tokens[cursor.index] as Token | undefined)?.type === end) cursor.index++;
        nodes.push(
          ordered
            ? { type: 'orderedList', attrs: { start }, content: items }
            : { type: 'bulletList', content: items },
        );
        break;
      }
      case 'blockquote_open':
        cursor.index++;
        nodes.push({ type: 'blockquote', content: blockNodes(tokens, cursor, 'blockquote_close') });
        break;
      case 'fence':
      case 'code_block': {
        const language: string | null =
          token.type === 'fence' ? (token.info.trim().split(/\s+/)[0] ?? '') || null : null;
        const text: string = token.content.replace(/\n$/, '');
        nodes.push({
          type: 'codeBlock',
          attrs: { language },
          ...(text === '' ? {} : { content: [{ type: 'text', text }] }),
        });
        cursor.index++;
        break;
      }
      case 'hr':
        nodes.push({ type: 'horizontalRule' });
        cursor.index++;
        break;
      default:
        throw new ArticleMarkdownError(`Unsupported Markdown block (${token.type})`, line);
    }
  }
  return nodes;
}

/**
 * Function markdownToArticle
 *
 * @description
 * Converts the MCP Markdown dialect (`ARTICLE_MARKDOWN_GUIDE`) to an editor document. The result is
 * checked against the contract afterwards: nesting depth, sizes, link schemes and media ids.
 *
 * @param {string} markdown - Document text.
 * @returns {DocNode} Editor document (`doc`), never empty.
 * @throws {ArticleMarkdownError} On a construct the editor cannot hold, with its line.
 */
export function markdownToArticle(markdown: string): DocNode {
  const tokens: Token[] = parser.parse(markdown, {});
  const content: DocNode[] = blockNodes(tokens, { index: 0 }, null).filter(
    (node: DocNode): boolean => !(node.type === 'paragraph' && node.content === undefined),
  );
  return { type: 'doc', content: content.length > 0 ? content : [{ type: 'paragraph' }] };
}

// --- Document to Markdown -------------------------------------------------------------------------

function escapeText(text: string): string {
  return text
    .replace(/[\\`*_[\]<]/g, '\\$&')
    .replace(/!(?=\\\[)/g, '\\!')
    .replace(/&(?=#\d+;|#x[\da-f]+;|[a-z][a-z\d]*;)/gi, '\\&');
}

/** Escapes what would start a block at the beginning of a line (heading, list, quote, rule, code). */
function escapeLineStart(line: string): string {
  return line.replace(/^(\s*)([#>+=~-])/, '$1\\$2').replace(/^(\s*\d+)([.)])/, '$1\\$2');
}

function codeSpan(text: string): string {
  const longest: number = Math.max(
    0,
    ...(text.match(/`+/g) ?? []).map((run: string) => run.length),
  );
  const fence: string = '`'.repeat(longest + 1);
  const pad: boolean = /^[` ]|[` ]$/.test(text) && text.trim() !== '';
  return pad ? `${fence} ${text} ${fence}` : `${fence}${text}${fence}`;
}

function linkTarget(href: string): string {
  return /[\s()<>]/.test(href) ? `<${href.replace(/[<>]/g, encodeURIComponent)}>` : href;
}

function openMark(mark: Mark): string {
  if (mark.type === 'link') return '[';
  return mark.type === 'bold' ? '**' : '*';
}

function closeMark(mark: Mark): string {
  if (mark.type === 'link') return `](${linkTarget(mark.attrs?.href ?? '')})`;
  return mark.type === 'bold' ? '**' : '*';
}

/** Writes inline nodes, opening and closing marks as a stack and keeping edge spaces outside them. */
function inlineMarkdown(nodes: readonly DocNode[]): string {
  let out: string = '';
  let open: Mark[] = [];
  const closeTo = (depth: number): void => {
    while (open.length > depth) out += closeMark(open.pop() as Mark);
  };
  for (const node of nodes) {
    if (node.type === 'hardBreak') {
      closeTo(0);
      out += '\\\n';
      continue;
    }
    const text: string = node.text ?? '';
    const marks: Mark[] = sortMarks(node.marks ?? []);
    const wrapping: Mark[] = marks.filter((mark: Mark): boolean => mark.type !== 'code');
    const code: boolean = marks.length !== wrapping.length;
    const [, lead = '', core = '', trail = ''] = /^(\s*)(.*?)(\s*)$/s.exec(text) ?? [];
    if (core === '') {
      closeTo(0);
      out += text;
      continue;
    }
    let shared: number = 0;
    while (
      shared < open.length &&
      shared < wrapping.length &&
      sameMark(open[shared] as Mark, wrapping[shared] as Mark)
    )
      shared++;
    closeTo(shared);
    if (lead !== '') {
      closeTo(0);
      shared = 0;
    }
    out += lead;
    for (const mark of wrapping.slice(open.length)) {
      out += openMark(mark);
      open.push(mark);
    }
    out += code ? codeSpan(core) : escapeText(core);
    if (trail !== '') {
      closeTo(0);
      out += trail;
    }
  }
  closeTo(0);
  open = [];
  // Every line start (paragraph start, after a hard break) is escaped against block syntax.
  return out
    .split('\n')
    .map((line: string): string => escapeLineStart(line))
    .join('\n');
}

function indent(text: string, width: number): string {
  return text
    .split('\n')
    .map((line: string, index: number): string =>
      index === 0 || line === '' ? line : `${' '.repeat(width)}${line}`,
    )
    .join('\n');
}

function blocksMarkdown(nodes: readonly DocNode[]): string[] {
  const out: string[] = [];
  let previous: string | null = null;
  let bullet: '-' | '*' = '-';
  let delimiter: '.' | ')' = '.';
  for (const node of nodes) {
    // Two lists in a row would merge: the second one switches its marker.
    if (node.type === 'bulletList')
      bullet = previous === 'bulletList' && bullet === '-' ? '*' : '-';
    if (node.type === 'orderedList')
      delimiter = previous === 'orderedList' && delimiter === '.' ? ')' : '.';
    const written: string | null = blockMarkdown(node, bullet, delimiter);
    if (written !== null) {
      out.push(written);
      previous = node.type;
    }
  }
  return out;
}

function blockMarkdown(node: DocNode, bullet: string, delimiter: string): string | null {
  switch (node.type) {
    case 'paragraph': {
      const text: string = inlineMarkdown(node.content ?? []);
      return text === '' ? null : text;
    }
    case 'heading':
      return `${'#'.repeat(Number(node.attrs?.['level'] ?? 2))} ${inlineMarkdown(node.content ?? [])}`;
    case 'bulletList':
    case 'orderedList': {
      const start: number = Number(node.attrs?.['start'] ?? 1);
      return (node.content ?? [])
        .map((item: DocNode, index: number): string => {
          const marker: string =
            node.type === 'bulletList' ? `${bullet} ` : `${start + index}${delimiter} `;
          const children: readonly DocNode[] = item.content ?? [];
          // A blank line between the blocks of an item: an ordered list not starting at 1 cannot
          // interrupt a paragraph (CommonMark), it would read as text.
          const body: string = blocksMarkdown(children).join('\n\n');
          return `${marker}${indent(body, marker.length)}`;
        })
        .join('\n');
    }
    case 'blockquote':
      return blocksMarkdown(node.content ?? [])
        .join('\n\n')
        .split('\n')
        .map((line: string): string => (line === '' ? '>' : `> ${line}`))
        .join('\n');
    case 'codeBlock': {
      const text: string = (node.content ?? [])
        .map((child: DocNode): string => child.text ?? '')
        .join('');
      const longest: number = Math.max(
        0,
        ...(text.match(/`{3,}/g) ?? []).map((run: string) => run.length),
      );
      const fence: string = '`'.repeat(Math.max(3, longest + 1));
      const language: unknown = node.attrs?.['language'];
      return `${fence}${typeof language === 'string' ? language : ''}\n${text === '' ? '' : `${text}\n`}${fence}`;
    }
    case 'horizontalRule':
      return '---';
    case 'figure': {
      const alt: string = String(node.attrs?.['alt'] ?? '').replace(/[\\[\]]/g, '\\$&');
      const caption: string = String(node.attrs?.['caption'] ?? '');
      const title: string = caption === '' ? '' : ` "${caption.replace(/[\\"]/g, '\\$&')}"`;
      return `![${alt}](media:${String(node.attrs?.['media'] ?? '')}${title})`;
    }
    default:
      return null;
  }
}

/**
 * Function articleToMarkdown
 *
 * @description
 * Writes an editor document in the MCP Markdown dialect. Empty paragraphs are left out.
 *
 * @param {DocNode} document - Stored editor document.
 * @returns {string} Markdown text ending with a newline.
 */
export function articleToMarkdown(document: DocNode): string {
  return `${blocksMarkdown(document.content ?? []).join('\n\n')}\n`;
}

// --- Exactness ------------------------------------------------------------------------------------

/** Splits edge spaces out of marked text, so that equal documents compare equal. */
function normalizeInline(nodes: readonly DocNode[]): DocNode[] {
  const out: DocNode[] = [];
  for (const node of nodes) {
    if (node.type !== 'text') {
      out.push({ type: node.type });
      continue;
    }
    const [, lead = '', core = '', trail = ''] = /^(\s*)(.*?)(\s*)$/s.exec(node.text ?? '') ?? [];
    pushText(out, lead, []);
    pushText(out, core, node.marks ?? []);
    pushText(out, trail, []);
  }
  return out;
}

function normalize(node: DocNode): DocNode | null {
  switch (node.type) {
    case 'paragraph':
    case 'heading': {
      const content: DocNode[] = normalizeInline(node.content ?? []);
      if (node.type === 'paragraph' && content.length === 0) return null;
      return {
        type: node.type,
        ...(node.type === 'heading' ? { attrs: { level: node.attrs?.['level'] } } : {}),
        content,
      };
    }
    case 'orderedList':
      return {
        type: node.type,
        attrs: { start: Number(node.attrs?.['start'] ?? 1) },
        content: normalizeAll(node.content ?? []),
      };
    case 'codeBlock': {
      const language: unknown = node.attrs?.['language'];
      return {
        type: node.type,
        attrs: { language: typeof language === 'string' ? language : null },
        text: (node.content ?? []).map((child: DocNode): string => child.text ?? '').join(''),
      };
    }
    case 'figure':
      return {
        type: node.type,
        attrs: {
          media: String(node.attrs?.['media'] ?? '').toLowerCase(),
          alt: String(node.attrs?.['alt'] ?? ''),
          caption: String(node.attrs?.['caption'] ?? ''),
        },
      };
    default:
      return node.content === undefined
        ? { type: node.type }
        : { type: node.type, content: normalizeAll(node.content) };
  }
}

function normalizeAll(nodes: readonly DocNode[]): DocNode[] {
  return nodes.map(normalize).filter((node: DocNode | null): node is DocNode => node !== null);
}

/**
 * Function exactMarkdown
 *
 * @description
 * Writes the document as Markdown when reading that Markdown back gives the same document (empty
 * paragraphs aside), so that an AI editing the text loses nothing it did not change. Returns `null`
 * otherwise: the caller then hands out the editor JSON.
 *
 * @param {DocNode} document - Stored editor document.
 * @returns {string | null} Exact Markdown, or `null`.
 */
export function exactMarkdown(document: DocNode): string | null {
  const markdown: string = articleToMarkdown(document);
  try {
    const back: DocNode = markdownToArticle(markdown);
    return JSON.stringify(normalizeAll(back.content ?? [])) ===
      JSON.stringify(normalizeAll(document.content ?? []))
      ? markdown
      : null;
  } catch {
    return null;
  }
}
