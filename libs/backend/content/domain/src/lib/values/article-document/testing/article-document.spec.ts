import { DomainError, InvalidValueError } from '@internal/content-domain/lib/errors/domain-error';
import {
  ArticleDocument,
  type ArticleDocumentProps,
  CODE_LANGUAGES,
} from '@internal/content-domain/lib/values/article-document/article-document';

/**
 * Constant FIGURE
 *
 * @description
 * Media identifier of the figure fixtures.
 */
const FIGURE: string = '3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90';

/**
 * Constant OTHER
 *
 * @description
 * Second media identifier of the figure fixtures.
 */
const OTHER: string = '8c9d0e1f-2a3b-4c5d-8e6f-7a8b9c0d1e2f';

/**
 * Constant RICH
 *
 * @description
 * Document using every block kind, nested lists and repeated figures.
 */
const RICH: ArticleDocumentProps = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Contexte' }] },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            { type: 'paragraph' },
            {
              type: 'orderedList',
              attrs: { start: 3 },
              content: [
                {
                  type: 'listItem',
                  content: [{ type: 'paragraph', content: [{ type: 'hardBreak' }] }],
                },
              ],
            },
          ],
        },
      ],
    },
    { type: 'figure', attrs: { media: FIGURE, alt: 'Écran', caption: '' } },
    { type: 'horizontalRule' },
    { type: 'figure', attrs: { media: OTHER, alt: '  ', caption: 'Légende' } },
    { type: 'figure', attrs: { media: FIGURE, alt: '', caption: '' } },
    {
      type: 'codeBlock',
      attrs: { language: 'bash' },
      content: [{ type: 'text', text: 'npm test' }],
    },
  ],
};

describe('ArticleDocument', (): void => {
  it('lists the figure media once, in order, and those lacking alternative text', (): void => {
    const document: ArticleDocument = ArticleDocument.of('article.fr', RICH);
    expect(document.mediaIds()).toEqual([FIGURE, OTHER]);
    expect(document.figuresMissingAlt()).toEqual([OTHER, FIGURE]);
    expect(document.isEmpty()).toBe(false);
  });

  it('is empty without figures or visible text, even in nested blocks', (): void => {
    const blank: ArticleDocument = ArticleDocument.of('article.fr', {
      type: 'doc',
      content: [
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: '  ' }, { type: 'hardBreak' }] },
        { type: 'horizontalRule' },
        {
          type: 'blockquote',
          content: [
            {
              type: 'bulletList',
              content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
            },
          ],
        },
      ],
    });
    expect(blank.isEmpty()).toBe(true);
    expect(blank.mediaIds()).toEqual([]);
    const quoted: ArticleDocument = ArticleDocument.of('article.fr', {
      type: 'doc',
      content: [
        {
          type: 'blockquote',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Citation' }] }],
        },
      ],
    });
    expect(quoted.isEmpty()).toBe(false);
    const figureOnly: ArticleDocument = ArticleDocument.of('article.fr', {
      type: 'doc',
      content: [{ type: 'figure', attrs: { media: FIGURE, alt: '', caption: '' } }],
    });
    expect(figureOnly.isEmpty()).toBe(false);
  });

  it('keeps its own copy of the document', (): void => {
    const props: ArticleDocumentProps = structuredClone(RICH);
    const document: ArticleDocument = ArticleDocument.of('article.fr', props);
    props.content.pop();
    const copy: ArticleDocumentProps = document.toProps();
    copy.content.length = 0;
    expect(document.toProps()).toEqual(RICH);
  });

  it('carries the language of a code block and gives plain text to a stored block without one', (): void => {
    const document: ArticleDocument = ArticleDocument.of('article.fr', {
      type: 'doc',
      content: [
        {
          type: 'codeBlock',
          attrs: { language: 'typescript' },
          content: [{ type: 'text', text: 'x' }],
        },
        { type: 'codeBlock', content: [{ type: 'text', text: 'npm test' }] },
        { type: 'codeBlock', attrs: {} },
        { type: 'codeBlock', attrs: { language: null } },
      ],
    });
    expect(document.toProps().content).toEqual([
      {
        type: 'codeBlock',
        attrs: { language: 'typescript' },
        content: [{ type: 'text', text: 'x' }],
      },
      {
        type: 'codeBlock',
        attrs: { language: null },
        content: [{ type: 'text', text: 'npm test' }],
      },
      { type: 'codeBlock', attrs: { language: null } },
      { type: 'codeBlock', attrs: { language: null } },
    ]);
    expect(document.isEmpty()).toBe(false);
  });

  it('accepts every listed code language', (): void => {
    for (const language of CODE_LANGUAGES) {
      expect(
        ArticleDocument.of('article.fr', {
          type: 'doc',
          content: [{ type: 'codeBlock', attrs: { language } }],
        }).toProps().content[0],
      ).toEqual({ type: 'codeBlock', attrs: { language } });
    }
  });

  it('rejects a code block language outside the list, naming the field', (): void => {
    const unknown = (): ArticleDocument =>
      ArticleDocument.of('article.en', {
        type: 'doc',
        content: [{ type: 'codeBlock', attrs: { language: 'cobol' } }],
      });
    expect(unknown).toThrow(InvalidValueError);
    expect(unknown).toThrow('article.en: the code block language "cobol" is not supported');
  });

  it.each([
    ['a root other than doc', { type: 'paragraph', content: [{ type: 'paragraph' }] }],
    ['a document without blocks', { type: 'doc', content: [] }],
    ['a document without content', { type: 'doc' }],
  ])('rejects %s', (_label, props): void => {
    expect((): ArticleDocument =>
      ArticleDocument.of('article.en', props as unknown as ArticleDocumentProps),
    ).toThrow(DomainError);
  });
});
