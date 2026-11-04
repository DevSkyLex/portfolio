import type { ArticleDocumentDraft } from '@internal/content-web-data-access/lib/admin/models/article-document/article-document-draft.interface';
import {
  emptyArticleDocument,
  figuresMissingAlt,
  isArticleEmpty,
} from '@internal/content-web-data-access/lib/admin/utils/article-document/article-document.utils';

/**
 * Constant MEDIA
 *
 * @description
 * Media id of the figures.
 */
const MEDIA: string = '3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90';

describe('isArticleEmpty', (): void => {
  it('counts an absent document, blank text and rules as empty', (): void => {
    expect(isArticleEmpty(null)).toBe(true);
    expect(isArticleEmpty(undefined)).toBe(true);
    expect(isArticleEmpty(emptyArticleDocument())).toBe(true);
    expect(
      isArticleEmpty({
        type: 'doc',
        content: [
          { type: 'horizontalRule' },
          { type: 'paragraph', content: [{ type: 'text', text: ' \n ' }, { type: 'hardBreak' }] },
        ],
      }),
    ).toBe(true);
  });

  it('counts nested text or a figure as written', (): void => {
    const nested: ArticleDocumentDraft = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Point.' }] }],
            },
          ],
        },
      ],
    };
    expect(isArticleEmpty(nested)).toBe(false);
    expect(
      isArticleEmpty({
        type: 'doc',
        content: [{ type: 'figure', attrs: { media: MEDIA, alt: '', caption: '' } }],
      }),
    ).toBe(false);
  });
});

describe('figuresMissingAlt', (): void => {
  it('counts the figures whose alternative text is blank', (): void => {
    expect(figuresMissingAlt(null)).toBe(0);
    expect(
      figuresMissingAlt({
        type: 'doc',
        content: [
          { type: 'figure', attrs: { media: MEDIA, alt: ' ', caption: 'Légende' } },
          { type: 'figure', attrs: { media: MEDIA, alt: 'Écran', caption: '' } },
          { type: 'paragraph' },
        ],
      }),
    ).toBe(1);
  });

  it('returns a new empty document on each call', (): void => {
    expect(emptyArticleDocument()).not.toBe(emptyArticleDocument());
  });
});
