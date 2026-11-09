import { InvalidValueError } from '@internal/content-domain/lib/errors/domain-error';

/**
 * Type ArticleMark
 * @type ArticleMark
 *
 * @description
 * Inline formatting of a text node; links target `https://` or `mailto:` addresses (checked by the
 * administrator contract).
 */
export type ArticleMark =
  | { readonly type: 'bold' }
  | { readonly type: 'italic' }
  | { readonly type: 'code' }
  | { readonly type: 'link'; readonly attrs: { readonly href: string } };

/**
 * Type ArticleInline
 * @type ArticleInline
 *
 * @description
 * Inline content of paragraphs and headings: non-empty text with its marks, or a hard line break.
 */
export type ArticleInline =
  | { readonly type: 'text'; readonly text: string; readonly marks?: ArticleMark[] | undefined }
  | { readonly type: 'hardBreak' };

/**
 * Interface ArticleParagraph
 * @interface ArticleParagraph
 *
 * @description
 * Paragraph; an empty paragraph has no `content`.
 */
export interface ArticleParagraph {
  // #region Properties
  readonly type: 'paragraph';
  readonly content?: ArticleInline[] | undefined;
  // #endregion
}

/**
 * Type ArticleListShape
 * @type ArticleListShape
 * @template TItem - Item type of the list level.
 *
 * @description
 * Bullet or ordered list of one nesting level; an ordered list may start at another number.
 */
type ArticleListShape<TItem> =
  | { readonly type: 'bulletList'; readonly content: TItem[] }
  | {
      readonly type: 'orderedList';
      readonly attrs?: { readonly start?: number | undefined } | undefined;
      readonly content: TItem[];
    };

/**
 * Type ArticleDeepList
 * @type ArticleDeepList
 *
 * @description
 * Third-level list, whose items hold paragraphs only (the contract bounds nesting to three levels).
 */
// One paragraph, then nested lists only: the editor's list item (admin contract).
export type ArticleDeepList = ArticleListShape<{
  readonly type: 'listItem';
  readonly content: [ArticleParagraph];
}>;

/**
 * Type ArticleNestedList
 * @type ArticleNestedList
 *
 * @description
 * Second-level list, whose items hold paragraphs and third-level lists.
 */
export type ArticleNestedList = ArticleListShape<{
  readonly type: 'listItem';
  readonly content: [ArticleParagraph, ...ArticleDeepList[]];
}>;

/**
 * Type ArticleList
 * @type ArticleList
 *
 * @description
 * Top-level list, whose items hold paragraphs and second-level lists.
 */
export type ArticleList = ArticleListShape<{
  readonly type: 'listItem';
  readonly content: [ArticleParagraph, ...ArticleNestedList[]];
}>;

/**
 * Interface ArticleFigureAttrs
 * @interface ArticleFigureAttrs
 *
 * @description
 * Uploaded media shown by a figure with its alternative text and caption; a draft may leave the
 * alternative text empty, which the completeness check reports.
 */
export interface ArticleFigureAttrs {
  // #region Properties
  readonly media: string;
  readonly alt: string;
  readonly caption: string;
  // #endregion
}

/**
 * Constant CODE_LANGUAGES
 *
 * @description
 * Languages a code block may declare (D40 code block revision), `null` being plain text. The list
 * mirrors `CODE_BLOCK_LANGUAGES` of the content contracts; change both together (the code tokens
 * presenter spec compares them).
 */
export const CODE_LANGUAGES = [
  'typescript',
  'javascript',
  'html',
  'xml',
  'css',
  'scss',
  'json',
  'bash',
  'python',
  'php',
  'sql',
  'yaml',
  'markdown',
  'java',
  'csharp',
  'go',
  'rust',
  'dockerfile',
  'nginx',
  'mermaid',
] as const;

/**
 * Type CodeLanguage
 * @type CodeLanguage
 *
 * @description
 * Language of a code block, one of `CODE_LANGUAGES`.
 */
export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

/**
 * Interface ArticleCodeBlock
 * @interface ArticleCodeBlock
 *
 * @description
 * Preformatted code in a declared language (`null` for plain text); its text nodes, joined in order,
 * form the code.
 */
export interface ArticleCodeBlock {
  // #region Properties
  readonly type: 'codeBlock';
  readonly attrs: { readonly language: CodeLanguage | null };
  readonly content?: { readonly type: 'text'; readonly text: string }[] | undefined;
  // #endregion
}

/**
 * Type ArticleBlock
 * @type ArticleBlock
 *
 * @description
 * Top-level block of an article document (D40); figures and code blocks appear at this level only.
 */
export type ArticleBlock =
  | ArticleParagraph
  | {
      readonly type: 'heading';
      readonly attrs: { readonly level: 2 | 3 };
      readonly content?: ArticleInline[] | undefined;
    }
  | ArticleList
  | {
      readonly type: 'blockquote';
      readonly content: (ArticleParagraph | ArticleList)[];
    }
  | ArticleCodeBlock
  | { readonly type: 'horizontalRule' }
  | { readonly type: 'figure'; readonly attrs: ArticleFigureAttrs };

/**
 * Interface ArticleDocumentProps
 * @interface ArticleDocumentProps
 *
 * @description
 * Serializable article of one language: the ProseMirror JSON subset of the administrator contract,
 * also stored as is in the `projects.article` column.
 */
export interface ArticleDocumentProps {
  // #region Properties
  readonly type: 'doc';
  readonly content: ArticleBlock[];
  // #endregion
}

/**
 * Type ArticleCodeBlockInput
 * @type ArticleCodeBlockInput
 *
 * @description
 * Code block as `ArticleDocument.of` reads it: a block stored before code languages existed has no
 * `attrs`, and a stored language is checked rather than trusted.
 */
type ArticleCodeBlockInput = Omit<ArticleCodeBlock, 'attrs'> & {
  readonly attrs?: { readonly language?: string | null | undefined } | undefined;
};

/**
 * Interface ArticleDocumentInput
 * @interface ArticleDocumentInput
 *
 * @description
 * Document accepted by `ArticleDocument.of`: a contract-validated document, or a stored one whose code
 * blocks may predate their language.
 */
export interface ArticleDocumentInput {
  // #region Properties
  readonly type: 'doc';
  readonly content: (Exclude<ArticleBlock, ArticleCodeBlock> | ArticleCodeBlockInput)[];
  // #endregion
}

/**
 * Function isCodeLanguage
 *
 * @description
 * Whether a stored or requested language is one of `CODE_LANGUAGES`.
 */
function isCodeLanguage(language: string): language is CodeLanguage {
  return (CODE_LANGUAGES as readonly string[]).includes(language);
}

/**
 * Function toCodeBlock
 *
 * @description
 * Gives a code block its language, plain text when it declares none.
 *
 * @param {string} field - Field label included in validation errors.
 * @param {ArticleCodeBlockInput} block - Code block to check.
 * @returns {ArticleCodeBlock} Code block with its language.
 * @throws {InvalidValueError} When the language is not one of `CODE_LANGUAGES`.
 */
function toCodeBlock(field: string, block: ArticleCodeBlockInput): ArticleCodeBlock {
  const language: string | null = block.attrs?.language ?? null;
  if (language !== null && !isCodeLanguage(language)) {
    throw new InvalidValueError(field, `the code block language "${language}" is not supported`);
  }
  return block.content === undefined
    ? { type: 'codeBlock', attrs: { language } }
    : { type: 'codeBlock', attrs: { language }, content: block.content };
}

/**
 * Interface ArticleNode
 * @interface ArticleNode
 *
 * @description
 * Structural view of any node of a document, enough to walk it.
 */
interface ArticleNode {
  // #region Properties
  readonly type: string;
  readonly text?: string | undefined;
  readonly content?: readonly ArticleNode[] | undefined;
  // #endregion
}

/**
 * Class ArticleDocument
 * @class ArticleDocument
 *
 * @description
 * Article of one language (D40). Its structure is validated by the administrator contract; the
 * value answers the completeness and media questions of the aggregate and never shares its JSON.
 */
export class ArticleDocument {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores a private copy of the document created by the `of` factory.
   *
   * @param {ArticleDocumentProps} props - Document owned by this value.
   */
  private constructor(private readonly props: ArticleDocumentProps) {}
  // #endregion

  // #region Methods
  /**
   * Method of
   * @method of
   *
   * @description
   * Copies a document, rejects a root that is not a `doc` with at least one block and a code block
   * language outside `CODE_LANGUAGES`, and gives a code block without language the plain text one.
   *
   * @param {string} field - Field label included in validation errors.
   * @param {ArticleDocumentInput} props - Contract-validated or persisted document.
   * @returns {ArticleDocument} Document value.
   */
  public static of(field: string, props: ArticleDocumentInput): ArticleDocument {
    if (props.type !== 'doc' || !Array.isArray(props.content) || props.content.length === 0) {
      throw new InvalidValueError(field, 'a document with at least one block is expected');
    }
    return new ArticleDocument({
      type: 'doc',
      content: structuredClone(props.content).map(
        (block: ArticleDocumentInput['content'][number]): ArticleBlock =>
          block.type === 'codeBlock' ? toCodeBlock(field, block) : block,
      ),
    });
  }

  /**
   * Method isEmpty
   * @method isEmpty
   *
   * @description
   * A document is empty when it holds no figure and no text other than whitespace.
   *
   * @returns {boolean} Whether the document has nothing to show.
   */
  public isEmpty(): boolean {
    const filled = (node: ArticleNode): boolean =>
      node.type === 'figure' ||
      (node.text !== undefined && node.text.trim() !== '') ||
      (node.content ?? []).some(filled);
    return !this.props.content.some(filled);
  }

  /**
   * Method mediaIds
   * @method mediaIds
   *
   * @description
   * Lists the media shown by the figures, in document order and without duplicates.
   *
   * @returns {string[]} Referenced media identifiers.
   */
  public mediaIds(): string[] {
    return [...new Set(this.figures().map((figure: ArticleFigureAttrs): string => figure.media))];
  }

  /**
   * Method figuresMissingAlt
   * @method figuresMissingAlt
   *
   * @description
   * Lists the media of the figures whose alternative text is blank.
   *
   * @returns {string[]} Media identifiers of the figures lacking alternative text.
   */
  public figuresMissingAlt(): string[] {
    return this.figures()
      .filter((figure: ArticleFigureAttrs): boolean => figure.alt.trim() === '')
      .map((figure: ArticleFigureAttrs): string => figure.media);
  }

  /**
   * Method toProps
   * @method toProps
   *
   * @description
   * Returns a copy of the document for persistence and presenters.
   *
   * @returns {ArticleDocumentProps} Serializable document.
   */
  public toProps(): ArticleDocumentProps {
    return structuredClone(this.props);
  }

  /**
   * Method figures
   * @method figures
   *
   * @description
   * Collects the attributes of the top-level figures.
   *
   * @returns {ArticleFigureAttrs[]} Figure attributes in document order.
   */
  private figures(): ArticleFigureAttrs[] {
    return this.props.content.flatMap((block: ArticleBlock): ArticleFigureAttrs[] =>
      block.type === 'figure' ? [block.attrs] : [],
    );
  }
  // #endregion
}
