import { faqDocumentTitle } from '@internal/content-web-feature-admin/lib/utils/faq-document-title/faq-document-title.utils';

describe('faqDocumentTitle', (): void => {
  it('names the section, then the question before it', (): void => {
    expect(faqDocumentTitle()).toBe('FAQ — Administration');
    expect(faqDocumentTitle('Êtes-vous disponible ?')).toBe(
      'Êtes-vous disponible ? — FAQ — Administration',
    );
  });
});
