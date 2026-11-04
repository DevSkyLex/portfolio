import { DomainError, InvalidValueError } from '@internal/content-domain/lib/errors/domain-error';
import { type LegalBody, LegalDocument } from '@internal/content-domain/lib/legal/legal-document';
import type { ArticleDocumentProps } from '@internal/content-domain/lib/values/article-document/article-document';

/**
 * Function doc
 *
 * @description
 * Document of one paragraph, empty when the text is.
 *
 * @param {string} text - Paragraph text.
 * @returns {ArticleDocumentProps} Document.
 */
function doc(text: string): ArticleDocumentProps {
  return {
    type: 'doc',
    content: [
      text === ''
        ? { type: 'paragraph' }
        : { type: 'paragraph', content: [{ type: 'text', text }] },
    ],
  };
}

/**
 * Function notice
 *
 * @description
 * Stored legal notice at version 2.
 *
 * @returns {LegalDocument} Aggregate.
 */
function notice(): LegalDocument {
  return LegalDocument.rehydrate({
    kind: 'notice',
    body: LegalDocument.bodyOf({ fr: doc('Éditeur'), en: doc('Publisher') }),
    updatedAt: new Date('2026-11-02T12:00:00Z'),
    version: 2,
  });
}

describe('LegalDocument', (): void => {
  it('replaces both documents and dates the save', (): void => {
    const document: LegalDocument = notice();
    const body: LegalBody = LegalDocument.bodyOf({ fr: doc('Nouveau'), en: doc('New') });
    document.revise(body, new Date('2026-11-04T09:30:00Z'));
    expect(document.body.fr.toProps()).toEqual(doc('Nouveau'));
    expect(document.updatedAt.toISOString()).toBe('2026-11-04T09:30:00.000Z');
    expect(document.snapshot()).toMatchObject({ kind: 'notice', version: 2 });
    expect(document.kind).toBe('notice');
    expect(document.version).toBe(2);
  });

  it('refuses an empty language, listing each one', (): void => {
    const document: LegalDocument = notice();
    try {
      document.revise(LegalDocument.bodyOf({ fr: doc(' '), en: doc('') }), new Date());
      throw new Error('accepted');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).code).toBe('content.legal-document-incomplete');
      expect((error as DomainError).details).toEqual(['body.fr', 'body.en']);
    }
    expect(document.body.fr.toProps()).toEqual(doc('Éditeur'));
  });

  it('refuses a figure and a document without blocks under the language path', (): void => {
    const figure: ArticleDocumentProps = {
      type: 'doc',
      content: [{ type: 'figure', attrs: { media: 'm1', alt: 'Logo', caption: '' } }],
    };
    expect((): LegalBody => LegalDocument.bodyOf({ fr: doc('a'), en: figure })).toThrow(
      new InvalidValueError('body.en', 'a legal document holds no image'),
    );
    expect((): LegalBody =>
      LegalDocument.bodyOf({ fr: { type: 'doc', content: [] }, en: doc('a') }),
    ).toThrow(InvalidValueError);
  });

  it('rejects an unknown kind and a version below 1 when rehydrating', (): void => {
    const body: LegalBody = LegalDocument.bodyOf({ fr: doc('a'), en: doc('b') });
    const updatedAt: Date = new Date();
    expect((): LegalDocument =>
      LegalDocument.rehydrate({
        kind: 'cookies' as 'notice',
        body,
        updatedAt,
        version: 1,
      }),
    ).toThrow(InvalidValueError);
    expect((): LegalDocument =>
      LegalDocument.rehydrate({ kind: 'privacy', body, updatedAt, version: 0 }),
    ).toThrow(InvalidValueError);
  });
});
