import {
  ARTICLE_DOCUMENT_LIMITS,
  CODE_BLOCK_LANGUAGES,
  type CodeLanguageDto,
  type EditableArticleDocumentDto,
  EditableArticleDocumentSchema,
  PublicArticleDocumentSchema,
} from '@internal/content-contracts/lib/article-document.contract';
import project from '@internal/content-contracts/lib/testing/admin-project.fixture.json';
import snapshot from '@internal/content-contracts/lib/testing/content-snapshot.fixture.json';

/**
 * Constant MEDIA
 *
 * @description
 * Media id of the figure used by the rejection cases.
 */
const MEDIA: string = '3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90';

/**
 * Function documentOf
 *
 * @description
 * Wraps blocks in a document root.
 *
 * @param {unknown[]} content - Top-level blocks.
 *
 * @returns {{ type: 'doc'; content: unknown[] }} Document candidate.
 */
function documentOf(content: unknown[]): { type: 'doc'; content: unknown[] } {
  return { type: 'doc', content };
}

/**
 * Function paragraph
 *
 * @description
 * Builds a paragraph of one text node with optional marks.
 *
 * @param {string} text - Text of the node.
 * @param {unknown[]} [marks] - Marks of the node.
 *
 * @returns {unknown} Paragraph candidate.
 */
function paragraph(text: string, marks?: unknown[]): unknown {
  return { type: 'paragraph', content: [{ type: 'text', text, ...(marks ? { marks } : {}) }] };
}

/**
 * Function list
 *
 * @description
 * Builds a bullet list of one item, optionally nesting another list in it.
 *
 * @param {unknown} [nested] - List nested in the item.
 *
 * @returns {unknown} List candidate.
 */
function list(nested?: unknown): unknown {
  return {
    type: 'bulletList',
    content: [{ type: 'listItem', content: [paragraph('Point.'), ...(nested ? [nested] : [])] }],
  };
}

describe('EditableArticleDocumentSchema', (): void => {
  it('accepts the documents of the administrator fixture and strips the editor attributes', (): void => {
    const parsed: EditableArticleDocumentDto = EditableArticleDocumentSchema.parse(
      project.article.fr,
    );
    expect(EditableArticleDocumentSchema.safeParse(project.article.en).success).toBe(true);
    expect(parsed.content[0]).toEqual({
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Contexte' }],
    });
    expect(JSON.stringify(parsed)).not.toMatch(/target|noopener|textAlign/);
    expect(parsed.content.find((block): boolean => block.type === 'codeBlock')).toEqual({
      type: 'codeBlock',
      attrs: { language: null },
      content: [{ type: 'text', text: 'flutter run' }],
    });
  });

  it.each<[string, string | null, CodeLanguageDto | null]>([
    ['a listed language', 'typescript', 'typescript'],
    ['HTML, read with the XML grammar', 'html', 'html'],
    ['a Mermaid diagram', ' Mermaid ', 'mermaid'],
    ['another name of a listed language', 'ts', 'typescript'],
    ['a VS Code mode id', 'shellscript', 'bash'],
    ['a name in another case, with spaces', ' TypeScript ', 'typescript'],
    ['a plain text name', 'plaintext', null],
    ['an unknown language', 'cobol', null],
    ['an inherited object key', 'constructor', null],
    ['null', null, null],
  ])(
    'normalizes the code block language of %s',
    (_label: string, language: string | null, expected: CodeLanguageDto | null): void => {
      const parsed: EditableArticleDocumentDto = EditableArticleDocumentSchema.parse(
        documentOf([
          { type: 'codeBlock', attrs: { language }, content: [{ type: 'text', text: 'x' }] },
        ]),
      );
      expect(parsed.content[0]).toEqual({
        type: 'codeBlock',
        attrs: { language: expected },
        content: [{ type: 'text', text: 'x' }],
      });
    },
  );

  it.each([
    ['without attributes', { type: 'codeBlock' }],
    ['without language', { type: 'codeBlock', attrs: {} }],
  ])('gives a code block %s the plain text language', (_label: string, block: unknown): void => {
    expect(EditableArticleDocumentSchema.parse(documentOf([block])).content[0]).toEqual({
      type: 'codeBlock',
      attrs: { language: null },
    });
  });

  it('names highlight.js grammars and keeps Mermaid source unhighlighted', (): void => {
    expect(CODE_BLOCK_LANGUAGES.html).toBe('xml');
    const { mermaid, ...highlighted } = CODE_BLOCK_LANGUAGES;
    expect(mermaid).toBeNull();
    for (const grammar of Object.values(highlighted)) {
      expect(grammar).toMatch(/^[a-z]+$/);
    }
  });

  it('accepts three nested list levels and an empty paragraph', (): void => {
    expect(
      EditableArticleDocumentSchema.safeParse(
        documentOf([list(list(list())), { type: 'paragraph' }]),
      ).success,
    ).toBe(true);
  });

  it.each([
    ['an empty document', documentOf([])],
    ['a level-1 heading', documentOf([{ type: 'heading', attrs: { level: 1 } }])],
    ['an unknown node', documentOf([{ type: 'table', content: [] }])],
    [
      'an empty text node',
      documentOf([{ type: 'paragraph', content: [{ type: 'text', text: '' }] }]),
    ],
    [
      'a javascript: link',
      documentOf([paragraph('x', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }])]),
    ],
    [
      'a plain http link',
      documentOf([paragraph('x', [{ type: 'link', attrs: { href: 'http://example.com' } }])]),
    ],
    ['an unknown mark', documentOf([paragraph('x', [{ type: 'underline' }])])],
    [
      'a code block language that is not a string',
      documentOf([{ type: 'codeBlock', attrs: { language: 3 } }]),
    ],
    [
      'an empty text in a code block',
      documentOf([{ type: 'codeBlock', content: [{ type: 'text', text: '' }] }]),
    ],
    ['four nested list levels', documentOf([list(list(list(list())))])],
    [
      'a figure inside a list',
      documentOf([
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'figure', attrs: { media: MEDIA, alt: '', caption: '' } }],
            },
          ],
        },
      ]),
    ],
    [
      'a figure without uuid',
      documentOf([{ type: 'figure', attrs: { media: 'cover.png', alt: '', caption: '' } }]),
    ],
    [
      'too many figures',
      documentOf(
        Array.from({ length: ARTICLE_DOCUMENT_LIMITS.figures + 1 }, (): unknown => ({
          type: 'figure',
          attrs: { media: MEDIA, alt: 'Alt', caption: '' },
        })),
      ),
    ],
    [
      'too much text',
      documentOf(
        Array.from(
          { length: ARTICLE_DOCUMENT_LIMITS.text / ARTICLE_DOCUMENT_LIMITS.textNode + 1 },
          (): unknown => paragraph('x'.repeat(ARTICLE_DOCUMENT_LIMITS.textNode)),
        ),
      ),
    ],
    [
      'too many nodes',
      documentOf(
        Array.from({ length: ARTICLE_DOCUMENT_LIMITS.nodes }, (): unknown => paragraph('x')),
      ),
    ],
  ])('rejects %s', (_label: string, candidate: unknown): void => {
    expect(EditableArticleDocumentSchema.safeParse(candidate).success).toBe(false);
  });
});

describe('PublicArticleDocumentSchema', (): void => {
  it('accepts the article of the snapshot fixture', (): void => {
    expect(PublicArticleDocumentSchema.safeParse(snapshot.projects[0]?.article).success).toBe(true);
  });

  it('keeps the language and highlighted runs of a code block', (): void => {
    const block: unknown = {
      type: 'codeBlock',
      attrs: { language: 'typescript' },
      content: [{ type: 'text', text: 'const a = 1;' }],
      tokens: [
        { text: 'const', kind: 'keyword' },
        { text: ' a = ', kind: null },
        { text: '1', kind: 'number' },
        { text: ';', kind: 'punctuation' },
      ],
    };
    expect(PublicArticleDocumentSchema.parse(documentOf([block])).content[0]).toEqual(block);
  });

  it('accepts a code block written before languages, without attributes nor runs', (): void => {
    const block: unknown = { type: 'codeBlock', content: [{ type: 'text', text: 'npm test' }] };
    expect(PublicArticleDocumentSchema.parse(documentOf([block])).content[0]).toEqual(block);
  });

  it.each([
    [
      'an unlisted language',
      { type: 'codeBlock', attrs: { language: 'ts' }, content: [{ type: 'text', text: 'x' }] },
    ],
    [
      'an unknown token kind',
      {
        type: 'codeBlock',
        attrs: { language: 'bash' },
        content: [{ type: 'text', text: 'x' }],
        tokens: [{ text: 'x', kind: 'builtin' }],
      },
    ],
    [
      'an empty token',
      {
        type: 'codeBlock',
        attrs: { language: 'bash' },
        content: [{ type: 'text', text: 'x' }],
        tokens: [
          { text: 'x', kind: null },
          { text: '', kind: null },
        ],
      },
    ],
    [
      'tokens that do not spell the code',
      {
        type: 'codeBlock',
        attrs: { language: 'bash' },
        content: [{ type: 'text', text: 'npm test' }],
        tokens: [{ text: 'npm', kind: null }],
      },
    ],
  ])('rejects a code block with %s', (_label: string, block: unknown): void => {
    expect(PublicArticleDocumentSchema.safeParse(documentOf([block])).success).toBe(false);
  });

  it('rejects a figure whose image is not an uploaded media', (): void => {
    expect(
      PublicArticleDocumentSchema.safeParse(
        documentOf([
          {
            type: 'figure',
            attrs: {
              src: 'https://example.com/x.png',
              small: null,
              width: 10,
              height: 10,
              alt: 'Alt',
              caption: '',
            },
          },
        ]),
      ).success,
    ).toBe(false);
  });
});
