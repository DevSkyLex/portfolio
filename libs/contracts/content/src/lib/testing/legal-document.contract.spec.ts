import {
  AdminLegalDocumentDtoSchema,
  LegalDocumentKindSchema,
  LegalDocumentRevisionRequestSchema,
  PublicLegalDocumentSchema,
} from '@internal/content-contracts/lib/legal-document.contract';
import document from '@internal/content-contracts/lib/testing/admin-legal-document.fixture.json';
import snapshot from '@internal/content-contracts/lib/testing/content-snapshot.fixture.json';

describe('AdminLegalDocumentDtoSchema', (): void => {
  it('accepts the fixture shared by the service and the admin screen', (): void => {
    expect(AdminLegalDocumentDtoSchema.parse(document).kind).toBe('privacy');
    expect(
      AdminLegalDocumentDtoSchema.safeParse({ ...document, updatedAt: '2 novembre 2026' }).success,
    ).toBe(false);
    expect(LegalDocumentKindSchema.safeParse('cookies').success).toBe(false);
  });
});

describe('LegalDocumentRevisionRequestSchema', (): void => {
  it('accepts both languages and refuses a missing one or a figure', (): void => {
    expect(LegalDocumentRevisionRequestSchema.safeParse({ body: document.body }).success).toBe(
      true,
    );
    expect(
      LegalDocumentRevisionRequestSchema.safeParse({ body: { fr: document.body.fr } }).success,
    ).toBe(false);
    const figure: unknown = {
      body: {
        fr: document.body.fr,
        en: {
          type: 'doc',
          content: [
            {
              type: 'figure',
              attrs: { media: '0b8c7c1e-7a2f-4e0e-9c55-6a1f1c6b2d11', alt: 'Logo', caption: '' },
            },
          ],
        },
      },
    };
    expect(LegalDocumentRevisionRequestSchema.safeParse(figure).success).toBe(false);
  });

  it('refuses a link that is neither https:// nor mailto:', (): void => {
    const paragraph: unknown = {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'lien',
          marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
        },
      ],
    };
    const body: unknown = {
      fr: { type: 'doc', content: [paragraph] },
      en: document.body.en,
    };
    expect(LegalDocumentRevisionRequestSchema.safeParse({ body }).success).toBe(false);
  });
});

describe('PublicLegalDocumentSchema', (): void => {
  it('accepts the snapshot documents and refuses a date that is not YYYY-MM-DD', (): void => {
    expect(PublicLegalDocumentSchema.parse(snapshot.legal.notice).updatedOn).toBe('2025-01-15');
    expect(
      PublicLegalDocumentSchema.safeParse({ ...snapshot.legal.notice, updatedOn: '2026-13-02' })
        .success,
    ).toBe(false);
  });
});
