import {
  type LegalDocumentChangeResult,
  type ProfileChangeResult,
  ReviseLegalDocument,
  ReviseProfile,
  VersionMismatchError,
} from '@vfortin/content-application';
import type {
  ArticleDocumentProps,
  LegalDocument,
  Profile,
  ProfileDraft,
} from '@vfortin/content-domain';
import { eq, sql } from 'drizzle-orm';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type ContentDatabaseHandle,
  migrateContentDatabase,
  openContentDatabase,
} from '@internal/content-adapters-out/lib/persistence/database/content-database';
import {
  DrizzleContentRepository,
  LegalDocumentsMissingError,
} from '@internal/content-adapters-out/lib/persistence/repositories/content/drizzle-content.repositories';
import {
  DrizzleLegalDocumentRepository,
  DrizzleProfileRepository,
  DrizzleSiteTextsUnitOfWork,
} from '@internal/content-adapters-out/lib/persistence/repositories/site-texts/drizzle-site-texts.repositories';
import {
  contentRevision,
  legalDocuments,
  profile,
  siteBuildRequests,
} from '@internal/content-adapters-out/lib/persistence/schema/content.schema';
import {
  SEED_LINKS,
  SEED_PROFILE,
  seedContent,
} from '@internal/content-adapters-out/lib/seed/content.seed';
import { SEED_LEGAL_NOTICE } from '@internal/content-adapters-out/lib/seed/legal-documents.seed';

/**
 * Constant MIGRATIONS
 *
 * @description
 * Absolute content-service migration directory.
 */
const MIGRATIONS: string = fileURLToPath(
  new URL('../../../../../../../../../../apps/content-service/migrations', import.meta.url),
);

/**
 * Constant clock
 *
 * @description
 * Fixed save time.
 */
const clock: { now: () => Date } = { now: (): Date => new Date('2026-11-04T09:00:00Z') };

/**
 * Constant DRAFT
 *
 * @description
 * Complete profile revision with a Malt link.
 */
const DRAFT: ProfileDraft = {
  heroIntro: { fr: 'Intro', en: 'Intro' },
  aboutStatement: { fr: 'Phrase', en: 'Statement' },
  aboutLead: { fr: 'Chapeau', en: 'Lead' },
  facts: [],
  links: [
    { kind: 'email', url: 'mailto:hello@example.fr', label: null },
    { kind: 'malt', url: 'https://www.malt.fr/profile/x', label: 'Malt' },
  ],
};

/**
 * Function doc
 *
 * @description
 * Document of one paragraph.
 *
 * @param {string} text - Paragraph text.
 * @returns {ArticleDocumentProps} Document.
 */
function doc(text: string): ArticleDocumentProps {
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
}

describe('Site texts administration (Postgres via PGlite)', (): void => {
  let handle: ContentDatabaseHandle;

  beforeEach(async (): Promise<void> => {
    handle = await openContentDatabase('pglite:memory');
    await migrateContentDatabase(handle, MIGRATIONS);
    await seedContent(handle.db);
  });

  afterEach(async (): Promise<void> => {
    await handle.close();
  });

  it('loads the seeded profile with its links at version 1', async (): Promise<void> => {
    const loaded: Profile = await new DrizzleProfileRepository(handle.db).load();
    expect(loaded.version).toBe(1);
    expect(loaded.links.map((link) => link.toProps())).toEqual(SEED_LINKS);
    expect(loaded.heroIntro.en).toBe(SEED_PROFILE.heroIntro.en);
  });

  it('saves a profile revision with the read version and an outbox row', async (): Promise<void> => {
    const result: ProfileChangeResult = await new ReviseProfile(
      new DrizzleSiteTextsUnitOfWork(handle.db),
      clock,
    ).execute(1, DRAFT);
    expect(result.profile.version).toBe(2);
    const loaded: Profile = await new DrizzleProfileRepository(handle.db).load();
    expect(loaded.links.map((link) => link.label)).toEqual([null, 'Malt']);
    expect(loaded.facts).toEqual([]);
    expect((await handle.db.select().from(siteBuildRequests)).map((row) => row.revision)).toContain(
      result.revision,
    );
  });

  it('refuses a stale profile version and rolls back', async (): Promise<void> => {
    await expect(
      new ReviseProfile(new DrizzleSiteTextsUnitOfWork(handle.db), clock).execute(7, DRAFT),
    ).rejects.toThrow(VersionMismatchError);
    expect(await handle.db.select().from(siteBuildRequests)).toEqual([]);
  });

  it('saves a legal document with the read version, its date and an outbox row', async (): Promise<void> => {
    const result: LegalDocumentChangeResult = await new ReviseLegalDocument(
      new DrizzleSiteTextsUnitOfWork(handle.db),
      clock,
    ).execute('privacy', 1, { fr: doc('Nouveau'), en: doc('New') });
    expect(result.version).toBe(2);
    const stored: LegalDocument | null = await new DrizzleLegalDocumentRepository(handle.db).get(
      'privacy',
    );
    expect(stored?.body.en.toProps()).toEqual(doc('New'));
    expect(stored?.updatedAt.toISOString()).toBe('2026-11-04T09:00:00.000Z');
    expect(stored?.version).toBe(2);
    await expect(
      new DrizzleLegalDocumentRepository(handle.db).save(stored as LegalDocument, 1),
    ).rejects.toThrow(VersionMismatchError);
    expect(await handle.db.select().from(siteBuildRequests)).toHaveLength(1);
  });

  it('reads both documents for the snapshot and refuses a missing one', async (): Promise<void> => {
    const repository: DrizzleContentRepository = new DrizzleContentRepository(handle.db);
    const legal: Awaited<ReturnType<DrizzleContentRepository['loadLegalDocuments']>> =
      await repository.loadLegalDocuments();
    expect(legal.notice.body.fr.toProps()).toEqual(SEED_LEGAL_NOTICE.fr);
    expect(JSON.stringify(legal.privacy.body.fr.toProps())).toContain('Brevo');
    expect(JSON.stringify(legal.privacy.body.fr.toProps())).toContain('Allemagne');
    expect(JSON.stringify(legal.privacy.body.en.toProps())).toContain('Brevo');
    expect(JSON.stringify(legal.privacy.body.en.toProps())).toContain('Germany');
    await handle.db.delete(legalDocuments).where(eq(legalDocuments.kind, 'privacy'));
    await expect(repository.loadLegalDocuments()).rejects.toThrow(LegalDocumentsMissingError);
    await handle.db.delete(legalDocuments);
    await expect(repository.loadLegalDocuments()).rejects.toThrow(LegalDocumentsMissingError);
  });

  it('refuses to load a profile before the seed', async (): Promise<void> => {
    await handle.db.delete(profile);
    await expect(new DrizzleProfileRepository(handle.db).load()).rejects.toThrow(
      'run the content service seed target',
    );
  });
});

/**
 * Constant DATA
 *
 * @description
 * Tag of the migration writing the links and the legal documents into an existing database.
 */
const DATA: string = '0009_site_texts_data';

describe(`${DATA} migration (Postgres via PGlite)`, (): void => {
  let root: string;
  let handle: ContentDatabaseHandle;

  beforeEach(async (): Promise<void> => {
    root = mkdtempSync(join(tmpdir(), 'content-site-texts-migration-'));
    const journal: { entries: { tag: string }[] } = JSON.parse(
      readFileSync(join(MIGRATIONS, 'meta', '_journal.json'), 'utf8'),
    );
    const entries: { tag: string }[] = journal.entries.slice(
      0,
      journal.entries.findIndex((entry: { tag: string }): boolean => entry.tag === DATA),
    );
    mkdirSync(join(root, 'meta'), { recursive: true });
    for (const entry of entries) {
      copyFileSync(join(MIGRATIONS, `${entry.tag}.sql`), join(root, `${entry.tag}.sql`));
    }
    writeFileSync(join(root, 'meta', '_journal.json'), JSON.stringify({ ...journal, entries }));
    handle = await openContentDatabase('pglite:memory');
    await migrateContentDatabase(handle, root);
  });

  afterEach(async (): Promise<void> => {
    await handle.close();
    rmSync(root, { recursive: true, force: true });
  });

  it('fills the links of an existing profile, creates both documents and queues one rebuild', async (): Promise<void> => {
    const text: string = JSON.stringify({ fr: 'Texte', en: 'Text' });
    await handle.db.execute(sql`
      insert into content.profile (id, hero_intro, about_statement, about_lead, facts)
      values (1, ${text}::jsonb, ${text}::jsonb, ${text}::jsonb, '[]'::jsonb)
    `);
    await handle.db.insert(contentRevision).values({ id: 1, revision: 5 });
    await migrateContentDatabase(handle, MIGRATIONS);
    const loaded: Profile = await new DrizzleProfileRepository(handle.db).load();
    expect(loaded.links.map((link) => link.toProps())).toEqual(SEED_LINKS);
    const legal: Awaited<ReturnType<DrizzleContentRepository['loadLegalDocuments']>> =
      await new DrizzleContentRepository(handle.db).loadLegalDocuments();
    expect(legal.notice.body.fr.toProps()).toEqual(SEED_LEGAL_NOTICE.fr);
    expect(legal.privacy.updatedAt.toISOString()).toBe('2026-11-02T12:00:00.000Z');
    expect(await handle.db.select().from(contentRevision)).toEqual([{ id: 1, revision: 6 }]);
    expect(
      (await handle.db.select().from(siteBuildRequests)).map((row) => [row.revision, row.status]),
    ).toEqual([[6, 'pending']]);
  });

  it('queues nothing on a database without content', async (): Promise<void> => {
    await migrateContentDatabase(handle, MIGRATIONS);
    expect(await handle.db.select().from(siteBuildRequests)).toEqual([]);
    expect(await handle.db.select().from(legalDocuments)).toHaveLength(2);
  });
});
