import type { ArticleDocumentDraft } from '@vfortin/content-web-data-access/admin';
import { exceedsArticleLimits } from '@internal/content-web-feature-admin/lib/utils/article-limits/article-limits.utils';

/**
 * Function paragraphs
 *
 * @description
 * Document of `count` paragraphs of one text.
 *
 * @param {number} count - Number of paragraphs.
 * @param {string} text - Text of each paragraph.
 *
 * @returns {ArticleDocumentDraft} Document.
 */
const paragraphs = (count: number, text: string): ArticleDocumentDraft => ({
  type: 'doc',
  content: Array.from({ length: count }, () => ({
    type: 'paragraph' as const,
    content: [{ type: 'text' as const, text }],
  })),
});

describe('exceedsArticleLimits', (): void => {
  it('accepts a document within the contract bounds', (): void => {
    expect(exceedsArticleLimits(paragraphs(10, 'Texte.'))).toBe(false);
  });

  it('refuses too much text, too many nodes or too many figures', (): void => {
    expect(exceedsArticleLimits(paragraphs(11, 'x'.repeat(10_000)))).toBe(true);
    expect(exceedsArticleLimits(paragraphs(2_500, 'x'))).toBe(true);
    expect(
      exceedsArticleLimits({
        type: 'doc',
        content: Array.from({ length: 41 }, () => ({
          type: 'figure' as const,
          attrs: { media: '3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90', alt: 'Écran', caption: '' },
        })),
      }),
    ).toBe(true);
  });
});
