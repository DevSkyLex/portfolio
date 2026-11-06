import {
  type ArticleDocumentProps,
  DomainError,
  InvalidValueError,
  LegalDocument,
  LocalizedText,
  type Profile,
  type ProfileDraft,
} from '@vfortin/content-domain';
import {
  NotFoundError,
  VersionMismatchError,
} from '@internal/content-application/lib/errors/application-error';
import {
  FixedClock,
  InMemorySiteTexts,
} from '@internal/content-application/lib/testing/content.fakes';
import { GetAdminLegalDocument } from '@internal/content-application/lib/use-cases/get-admin-legal-document/get-admin-legal-document.use-case';
import { GetAdminProfile } from '@internal/content-application/lib/use-cases/get-admin-profile/get-admin-profile.use-case';
import {
  type LegalDocumentChangeResult,
  ReviseLegalDocument,
} from '@internal/content-application/lib/use-cases/revise-legal-document/revise-legal-document.use-case';
import {
  type ProfileChangeResult,
  ReviseProfile,
} from '@internal/content-application/lib/use-cases/revise-profile/revise-profile.use-case';

/**
 * Constant PROFILE
 *
 * @description
 * Stored profile at version 4.
 */
const PROFILE: Profile = {
  heroIntro: LocalizedText.of('heroIntro', { fr: 'Intro', en: 'Intro' }),
  aboutStatement: LocalizedText.of('aboutStatement', { fr: 'Phrase', en: 'Statement' }),
  aboutLead: LocalizedText.of('aboutLead', { fr: 'Chapeau', en: 'Lead' }),
  facts: [],
  links: [],
  version: 4,
};

/**
 * Constant DRAFT
 *
 * @description
 * Complete revision with one link.
 */
const DRAFT: ProfileDraft = {
  heroIntro: { fr: 'Nouvelle intro', en: 'New intro' },
  aboutStatement: { fr: 'Phrase', en: 'Statement' },
  aboutLead: { fr: 'Chapeau', en: 'Lead' },
  facts: [
    {
      label: { fr: 'Basé à', en: 'Based in' },
      value: { fr: 'Ville-Exemple', en: 'Ville-Exemple' },
    },
  ],
  links: [{ kind: 'github', url: 'https://example.com/demo/code', label: null }],
};

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
 * @returns {LegalDocument} Document.
 */
function notice(): LegalDocument {
  return LegalDocument.rehydrate({
    kind: 'notice',
    body: LegalDocument.bodyOf({ fr: doc('Éditeur'), en: doc('Publisher') }),
    updatedAt: new Date('2026-11-02T12:00:00Z'),
    version: 2,
  });
}

describe('GetAdminProfile', (): void => {
  it('returns the stored profile', async (): Promise<void> => {
    const store: InMemorySiteTexts = new InMemorySiteTexts(PROFILE);
    await expect(new GetAdminProfile(store.profiles).execute()).resolves.toBe(PROFILE);
  });
});

describe('ReviseProfile', (): void => {
  it('saves the revision with the next version and queues a rebuild', async (): Promise<void> => {
    const store: InMemorySiteTexts = new InMemorySiteTexts(PROFILE);
    const result: ProfileChangeResult = await new ReviseProfile(store, new FixedClock()).execute(
      4,
      DRAFT,
    );
    expect(result.profile.version).toBe(5);
    expect(result.revision).toBe(2);
    expect(store.profile?.heroIntro.fr).toBe('Nouvelle intro');
    expect(store.profile?.links.map((link) => link.kind)).toEqual(['github']);
    expect(store.requests).toEqual([2]);
  });

  it('refuses a stale version without queuing a rebuild', async (): Promise<void> => {
    const store: InMemorySiteTexts = new InMemorySiteTexts(PROFILE);
    await expect(new ReviseProfile(store, new FixedClock()).execute(3, DRAFT)).rejects.toThrow(
      VersionMismatchError,
    );
    expect(store.profile).toBe(PROFILE);
    expect(store.requests).toEqual([]);
  });

  it('validates before writing: a missing English text and an invalid link', async (): Promise<void> => {
    const store: InMemorySiteTexts = new InMemorySiteTexts(PROFILE);
    const useCase: ReviseProfile = new ReviseProfile(store, new FixedClock());
    await expect(useCase.execute(4, { ...DRAFT, heroIntro: { fr: 'Intro' } })).rejects.toThrow(
      DomainError,
    );
    await expect(
      useCase.execute(4, {
        ...DRAFT,
        links: [{ kind: 'website', url: 'http://insecure.example', label: null }],
      }),
    ).rejects.toThrow(InvalidValueError);
    expect(store.requests).toEqual([]);
  });
});

describe('GetAdminLegalDocument', (): void => {
  it('returns a document and reports a missing one', async (): Promise<void> => {
    const store: InMemorySiteTexts = new InMemorySiteTexts(null, [notice()]);
    const useCase: GetAdminLegalDocument = new GetAdminLegalDocument(store.legalDocuments);
    await expect(useCase.execute('notice')).resolves.toMatchObject({ version: 2 });
    await expect(useCase.execute('privacy')).rejects.toThrow(NotFoundError);
  });
});

describe('ReviseLegalDocument', (): void => {
  it('replaces both languages, dates the save and queues a rebuild', async (): Promise<void> => {
    const store: InMemorySiteTexts = new InMemorySiteTexts(null, [notice()]);
    const clock: FixedClock = new FixedClock(new Date('2026-11-04T09:30:00Z'));
    const result: LegalDocumentChangeResult = await new ReviseLegalDocument(store, clock).execute(
      'notice',
      2,
      { fr: doc('Nouveau'), en: doc('New') },
    );
    expect(result.version).toBe(3);
    expect(result.revision).toBe(2);
    expect(result.document.updatedAt.toISOString()).toBe('2026-11-04T09:30:00.000Z');
    expect(store.documents.get('notice')?.version).toBe(3);
  });

  it('refuses an empty language, a stale version and a missing document without writing', async (): Promise<void> => {
    const store: InMemorySiteTexts = new InMemorySiteTexts(null, [notice()]);
    const useCase: ReviseLegalDocument = new ReviseLegalDocument(store, new FixedClock());
    await expect(useCase.execute('notice', 2, { fr: doc('Texte'), en: doc('') })).rejects.toThrow(
      DomainError,
    );
    await expect(useCase.execute('notice', 1, { fr: doc('a'), en: doc('b') })).rejects.toThrow(
      VersionMismatchError,
    );
    await expect(useCase.execute('privacy', 1, { fr: doc('a'), en: doc('b') })).rejects.toThrow(
      NotFoundError,
    );
    expect(store.documents.get('notice')?.version).toBe(2);
    expect(store.requests).toEqual([]);
  });
});
