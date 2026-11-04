import { z } from 'zod/mini';

/**
 * Constant ARTICLE_DOCUMENT_LIMITS
 *
 * @description
 * Bounds of one article document (D40), checked once on the whole tree: they keep a revision far below
 * the 1 MB JSON body limit of the administrator API and the editor responsive.
 */
export const ARTICLE_DOCUMENT_LIMITS = {
  text: 100_000,
  nodes: 5_000,
  figures: 40,
  textNode: 10_000,
  href: 2_048,
  alt: 300,
  caption: 500,
} as const;

/**
 * Constant MarkSchema
 *
 * @description
 * Inline formatting of a text node; links accept `https://` and `mailto:` targets only, and unknown
 * link attributes (`target`, `rel`, `class`) are stripped.
 */
const MarkSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('bold') }),
  z.object({ type: z.literal('italic') }),
  z.object({ type: z.literal('code') }),
  z.object({
    type: z.literal('link'),
    attrs: z.object({
      href: z
        .string()
        .check(z.maxLength(ARTICLE_DOCUMENT_LIMITS.href), z.regex(/^(https:\/\/\S+|mailto:\S+)$/)),
    }),
  }),
]);

/**
 * Constant InlineSchema
 *
 * @description
 * Non-empty text with at most four marks (ProseMirror forbids empty text nodes), or a hard line break.
 */
const InlineSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    text: z.string().check(z.minLength(1), z.maxLength(ARTICLE_DOCUMENT_LIMITS.textNode)),
    marks: z.optional(z.array(MarkSchema).check(z.maxLength(4))),
  }),
  z.object({ type: z.literal('hardBreak') }),
]);

/**
 * Constant ParagraphSchema
 *
 * @description
 * Paragraph; an empty paragraph has no `content`.
 */
const ParagraphSchema = z.object({
  type: z.literal('paragraph'),
  content: z.optional(z.array(InlineSchema)),
});

/**
 * Constant DeepListItemSchema
 *
 * @description
 * Item of a third-level list: paragraphs only, so nesting stays bounded without a recursive schema.
 */
const DeepListItemSchema = z.object({
  type: z.literal('listItem'),
  content: z.array(ParagraphSchema).check(z.minLength(1)),
});

/**
 * Constant DeepListSchema
 *
 * @description
 * Third-level bullet or ordered list.
 */
const DeepListSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('bulletList'),
    content: z.array(DeepListItemSchema).check(z.minLength(1)),
  }),
  z.object({
    type: z.literal('orderedList'),
    attrs: z.optional(z.object({ start: z.optional(z.int().check(z.minimum(1))) })),
    content: z.array(DeepListItemSchema).check(z.minLength(1)),
  }),
]);

/**
 * Constant NestedListItemSchema
 *
 * @description
 * Item of a second-level list: paragraphs and third-level lists.
 */
const NestedListItemSchema = z.object({
  type: z.literal('listItem'),
  content: z.array(z.union([ParagraphSchema, DeepListSchema])).check(z.minLength(1)),
});

/**
 * Constant NestedListSchema
 *
 * @description
 * Second-level bullet or ordered list.
 */
const NestedListSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('bulletList'),
    content: z.array(NestedListItemSchema).check(z.minLength(1)),
  }),
  z.object({
    type: z.literal('orderedList'),
    attrs: z.optional(z.object({ start: z.optional(z.int().check(z.minimum(1))) })),
    content: z.array(NestedListItemSchema).check(z.minLength(1)),
  }),
]);

/**
 * Constant ListItemSchema
 *
 * @description
 * Item of a top-level list: paragraphs and second-level lists.
 */
const ListItemSchema = z.object({
  type: z.literal('listItem'),
  content: z.array(z.union([ParagraphSchema, NestedListSchema])).check(z.minLength(1)),
});

/**
 * Constant ListSchema
 *
 * @description
 * Bullet or ordered list nested on three levels at most; an ordered list may start at another number.
 */
const ListSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('bulletList'),
    content: z.array(ListItemSchema).check(z.minLength(1)),
  }),
  z.object({
    type: z.literal('orderedList'),
    attrs: z.optional(z.object({ start: z.optional(z.int().check(z.minimum(1))) })),
    content: z.array(ListItemSchema).check(z.minLength(1)),
  }),
]);

/**
 * Constant HeadingSchema
 *
 * @description
 * Section (level 2) or subsection (level 3) title; level-2 headings form the public table of contents.
 */
const HeadingSchema = z.object({
  type: z.literal('heading'),
  attrs: z.object({ level: z.union([z.literal(2), z.literal(3)]) }),
  content: z.optional(z.array(InlineSchema)),
});

/**
 * Constant BlockquoteSchema
 *
 * @description
 * Quotation made of paragraphs and lists.
 */
const BlockquoteSchema = z.object({
  type: z.literal('blockquote'),
  content: z.array(z.union([ParagraphSchema, ListSchema])).check(z.minLength(1)),
});

/**
 * Constant CODE_BLOCK_LANGUAGES
 *
 * @description
 * Closed list of the languages a code block may declare in `codeBlock.attrs.language`, each with the
 * name of the highlight.js grammar that tokenizes it when the snapshot is built (D40 code block
 * revision); `null` is plain text. HTML has no grammar of its own: highlight.js reads it as XML.
 */
export const CODE_BLOCK_LANGUAGES = {
  typescript: 'typescript',
  javascript: 'javascript',
  html: 'xml',
  xml: 'xml',
  css: 'css',
  scss: 'scss',
  json: 'json',
  bash: 'bash',
  python: 'python',
  php: 'php',
  sql: 'sql',
  yaml: 'yaml',
  markdown: 'markdown',
  java: 'java',
  csharp: 'csharp',
  go: 'go',
  rust: 'rust',
  dockerfile: 'dockerfile',
  nginx: 'nginx',
} as const;

/**
 * Type CodeLanguageDto
 * @type CodeLanguageDto
 *
 * @description
 * Language of a code block, a key of `CODE_BLOCK_LANGUAGES`.
 */
export type CodeLanguageDto = keyof typeof CODE_BLOCK_LANGUAGES;

/**
 * Constant CODE_LANGUAGE_NAMES
 *
 * @description
 * Languages of `CODE_BLOCK_LANGUAGES` and the other names editors write for them (highlight.js
 * aliases, VS Code mode ids carried by a paste from VS Code), lower case, mapped to their language.
 */
const CODE_LANGUAGE_NAMES: ReadonlyMap<string, CodeLanguageDto> = new Map<string, CodeLanguageDto>([
  ...(Object.keys(CODE_BLOCK_LANGUAGES) as CodeLanguageDto[]).map(
    (language: CodeLanguageDto): [string, CodeLanguageDto] => [language, language],
  ),
  ['ts', 'typescript'],
  ['tsx', 'typescript'],
  ['mts', 'typescript'],
  ['cts', 'typescript'],
  ['typescriptreact', 'typescript'],
  ['js', 'javascript'],
  ['jsx', 'javascript'],
  ['mjs', 'javascript'],
  ['cjs', 'javascript'],
  ['javascriptreact', 'javascript'],
  ['htm', 'html'],
  ['xhtml', 'html'],
  ['svg', 'xml'],
  ['jsonc', 'json'],
  ['json5', 'json'],
  ['sh', 'bash'],
  ['shell', 'bash'],
  ['shellscript', 'bash'],
  ['zsh', 'bash'],
  ['console', 'bash'],
  ['py', 'python'],
  ['postgres', 'sql'],
  ['postgresql', 'sql'],
  ['pgsql', 'sql'],
  ['mysql', 'sql'],
  ['sqlite', 'sql'],
  ['yml', 'yaml'],
  ['md', 'markdown'],
  ['cs', 'csharp'],
  ['c#', 'csharp'],
  ['golang', 'go'],
  ['rs', 'rust'],
  ['docker', 'dockerfile'],
  ['nginxconf', 'nginx'],
]);

/**
 * Function toCodeLanguage
 *
 * @description
 * Normalizes the language an editor wrote: a listed language or one of its other names gives that
 * language; plain text names, unknown names and `null` give `null`, so a code block pasted with a
 * language outside the list is kept as plain text instead of failing the whole revision.
 *
 * @param {string | null} name - Language attribute sent by the editor.
 *
 * @returns {CodeLanguageDto | null} Listed language, or `null` for plain text.
 */
function toCodeLanguage(name: string | null): CodeLanguageDto | null {
  return name === null ? null : (CODE_LANGUAGE_NAMES.get(name.trim().toLowerCase()) ?? null);
}

/**
 * Constant CODE_TOKEN_KINDS
 *
 * @description
 * Kinds of the highlighted runs of a published code block; the snapshot builder folds the
 * highlight.js scopes into them, and a run outside every kind has the kind `null`.
 */
export const CODE_TOKEN_KINDS = [
  'keyword',
  'string',
  'number',
  'literal',
  'comment',
  'function',
  'type',
  'variable',
  'property',
  'operator',
  'punctuation',
  'tag',
  'attribute',
  'meta',
] as const;

/**
 * Constant CodeTextSchema
 *
 * @description
 * Text content of a code block: unmarked text nodes, joined in order they form the code.
 */
const CodeTextSchema = z.optional(
  z.array(
    z.object({
      type: z.literal('text'),
      text: z.string().check(z.minLength(1), z.maxLength(ARTICLE_DOCUMENT_LIMITS.textNode)),
    }),
  ),
);

/**
 * Constant CodeBlockSchema
 *
 * @description
 * Preformatted code in the administrator API. `attrs.language` may be left out (plain text) and is
 * normalized by `toCodeLanguage`: the parsed block always carries a listed language or `null`.
 */
const CodeBlockSchema = z.object({
  type: z.literal('codeBlock'),
  attrs: z._default(
    z.object({
      language: z._default(z.pipe(z.nullable(z.string()), z.transform(toCodeLanguage)), null),
    }),
    { language: null },
  ),
  content: CodeTextSchema,
});

/**
 * Constant CodeTokenSchema
 *
 * @description
 * Highlighted run of a published code block: non-empty text and its kind.
 */
const CodeTokenSchema = z.object({
  text: z.string().check(z.minLength(1)),
  kind: z.nullable(z.enum(CODE_TOKEN_KINDS)),
});

/**
 * Function spellsCode
 *
 * @description
 * Whether the runs of a published code block, when it has some, spell exactly its text, so the page
 * shows the code its copy button writes.
 *
 * @param {PublicCodeBlockDto} block - Parsed code block.
 *
 * @returns {boolean} Whether the runs and the text agree.
 */
function spellsCode(block: PublicCodeBlockDto): boolean {
  if (block.tokens === undefined) return true;
  const code: string = (block.content ?? [])
    .map((node: { text: string }): string => node.text)
    .join('');
  return block.tokens.map((token: CodeTokenDto): string => token.text).join('') === code;
}

/**
 * Constant PublicCodeBlockSchema
 *
 * @description
 * Code block of the public snapshot: the language (`attrs` absent in a snapshot built before it
 * existed), the code as text nodes and, for a listed language, the highlighted runs spelling it.
 */
const PublicCodeBlockSchema = z
  .object({
    type: z.literal('codeBlock'),
    attrs: z.optional(
      z.object({
        language: z.nullable(
          z.enum(Object.keys(CODE_BLOCK_LANGUAGES) as [CodeLanguageDto, ...CodeLanguageDto[]]),
        ),
      }),
    ),
    content: CodeTextSchema,
    tokens: z.optional(z.array(CodeTokenSchema).check(z.maxLength(ARTICLE_DOCUMENT_LIMITS.text))),
  })
  .check(z.refine(spellsCode, { message: 'The code tokens do not spell the code.' }));

/**
 * Constant HorizontalRuleSchema
 *
 * @description
 * Thematic break between two parts of the article.
 */
const HorizontalRuleSchema = z.object({ type: z.literal('horizontalRule') });

/**
 * Function withinLimits
 *
 * @description
 * Walks a parsed document once and compares its node, text and figure totals with
 * `ARTICLE_DOCUMENT_LIMITS`.
 *
 * @param {ArticleNode} document - Parsed document root.
 *
 * @returns {boolean} Whether the document fits its limits.
 */
function withinLimits(document: ArticleNode): boolean {
  let nodes: number = 0;
  let text: number = 0;
  let figures: number = 0;
  const walk = (node: ArticleNode): void => {
    nodes++;
    if (node.type === 'figure') figures++;
    if (typeof node.text === 'string') text += node.text.length;
    for (const child of node.content ?? []) walk(child);
  };
  walk(document);
  return (
    nodes <= ARTICLE_DOCUMENT_LIMITS.nodes &&
    text <= ARTICLE_DOCUMENT_LIMITS.text &&
    figures <= ARTICLE_DOCUMENT_LIMITS.figures
  );
}

/**
 * Interface ArticleNode
 * @interface ArticleNode
 *
 * @description
 * Structural view of any node of a parsed document, enough to walk it.
 */
interface ArticleNode {
  readonly type: string;
  readonly text?: string | undefined;
  readonly content?: readonly ArticleNode[] | undefined;
}

/**
 * Constant LIMITS_MESSAGE
 *
 * @description
 * Validation message of a document exceeding `ARTICLE_DOCUMENT_LIMITS`.
 */
const LIMITS_MESSAGE: string = 'The article exceeds its size limits.';

/**
 * Constant MediaFigureSchema
 *
 * @description
 * Figure attributes in the administrator API: an uploaded media and its texts; an empty alternative
 * text is accepted in a draft and reported by the completeness check.
 */
export const MediaFigureSchema = z.object({
  media: z.uuid(),
  alt: z.string().check(z.trim(), z.maxLength(ARTICLE_DOCUMENT_LIMITS.alt)),
  caption: z.string().check(z.trim(), z.maxLength(ARTICLE_DOCUMENT_LIMITS.caption)),
});

/**
 * Constant EditableArticleDocumentSchema
 *
 * @description
 * Article of one language in the administrator API (D40): the ProseMirror JSON subset produced by the
 * editor, figures referencing uploaded media and appearing at the top level only.
 */
export const EditableArticleDocumentSchema = z
  .object({
    type: z.literal('doc'),
    content: z
      .array(
        z.union([
          ParagraphSchema,
          HeadingSchema,
          ListSchema,
          BlockquoteSchema,
          CodeBlockSchema,
          HorizontalRuleSchema,
          z.object({ type: z.literal('figure'), attrs: MediaFigureSchema }),
        ]),
      )
      .check(z.minLength(1)),
  })
  .check(z.refine(withinLimits, { message: LIMITS_MESSAGE }));

/**
 * Constant PublicImageSchema
 *
 * @description
 * Image resolved for the public site: the full WebP, its 960 px rendition (`null` when the original is
 * not wider) and the intrinsic size that reserves its box before it loads.
 */
export const PublicImageSchema = z.object({
  src: z.string().check(z.regex(/^\/media\/[0-9a-f-]{36}\.webp$/)),
  small: z.nullable(z.string().check(z.regex(/^\/media\/[0-9a-f-]{36}-960\.webp$/))),
  width: z.int().check(z.positive()),
  height: z.int().check(z.positive()),
});

/**
 * Constant PublicFigureSchema
 *
 * @description
 * Figure attributes in the public snapshot: the resolved image with its localized texts.
 */
export const PublicFigureSchema = z.extend(PublicImageSchema, {
  alt: z.string(),
  caption: z.string(),
});

/**
 * Constant PublicArticleDocumentSchema
 *
 * @description
 * Article of one published project in the snapshot locale, figures resolved to images.
 */
export const PublicArticleDocumentSchema = z
  .object({
    type: z.literal('doc'),
    content: z
      .array(
        z.union([
          ParagraphSchema,
          HeadingSchema,
          ListSchema,
          BlockquoteSchema,
          PublicCodeBlockSchema,
          HorizontalRuleSchema,
          z.object({ type: z.literal('figure'), attrs: PublicFigureSchema }),
        ]),
      )
      .check(z.minLength(1)),
  })
  .check(z.refine(withinLimits, { message: LIMITS_MESSAGE }));

/**
 * Type ArticleMarkDto
 * @type ArticleMarkDto
 *
 * @description
 * Inline formatting of a text node.
 */
export type ArticleMarkDto = z.infer<typeof MarkSchema>;

/**
 * Type ArticleInlineDto
 * @type ArticleInlineDto
 *
 * @description
 * Inline content of paragraphs and headings: text or a hard line break.
 */
export type ArticleInlineDto = z.infer<typeof InlineSchema>;

/**
 * Type ArticleParagraphDto
 * @type ArticleParagraphDto
 *
 * @description
 * Paragraph of an article document.
 */
export type ArticleParagraphDto = z.infer<typeof ParagraphSchema>;

/**
 * Type ArticleListDto
 * @type ArticleListDto
 *
 * @description
 * Top-level list, nesting lists on three levels at most.
 */
export type ArticleListDto = z.infer<typeof ListSchema>;

/**
 * Type MediaFigureDto
 * @type MediaFigureDto
 *
 * @description
 * Figure attributes referencing an uploaded media.
 */
export type MediaFigureDto = z.infer<typeof MediaFigureSchema>;

/**
 * Type EditableArticleDocumentDto
 * @type EditableArticleDocumentDto
 *
 * @description
 * Article document sent and returned by the administrator API.
 */
export type EditableArticleDocumentDto = z.infer<typeof EditableArticleDocumentSchema>;

/**
 * Type EditableArticleBlockDto
 * @type EditableArticleBlockDto
 *
 * @description
 * Top-level block of an administrator article document.
 */
export type EditableArticleBlockDto = EditableArticleDocumentDto['content'][number];

/**
 * Type PublicImageDto
 * @type PublicImageDto
 *
 * @description
 * Resolved image of the public snapshot.
 */
export type PublicImageDto = z.infer<typeof PublicImageSchema>;

/**
 * Type PublicFigureDto
 * @type PublicFigureDto
 *
 * @description
 * Figure attributes of a published article.
 */
export type PublicFigureDto = z.infer<typeof PublicFigureSchema>;

/**
 * Type PublicArticleDocumentDto
 * @type PublicArticleDocumentDto
 *
 * @description
 * Article document of one published project in the snapshot locale.
 */
export type PublicArticleDocumentDto = z.infer<typeof PublicArticleDocumentSchema>;

/**
 * Type CodeTokenKindDto
 * @type CodeTokenKindDto
 *
 * @description
 * Kind of a highlighted run of a published code block.
 */
export type CodeTokenKindDto = (typeof CODE_TOKEN_KINDS)[number];

/**
 * Type CodeTokenDto
 * @type CodeTokenDto
 *
 * @description
 * Highlighted run of a published code block.
 */
export type CodeTokenDto = z.infer<typeof CodeTokenSchema>;

/**
 * Type PublicCodeBlockDto
 * @type PublicCodeBlockDto
 *
 * @description
 * Code block of a published article document.
 */
export type PublicCodeBlockDto = z.infer<typeof PublicCodeBlockSchema>;

/**
 * Type PublicArticleBlockDto
 * @type PublicArticleBlockDto
 *
 * @description
 * Top-level block of a published article document.
 */
export type PublicArticleBlockDto = PublicArticleDocumentDto['content'][number];
