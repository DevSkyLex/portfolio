import {
  CreateFaqEntry,
  DeleteFaqEntry,
  type FaqEntryChangeResult,
  GetPublishedContent,
  ReorderFaq,
  VersionMismatchError,
} from '@vfortin/content-application';
import { FaqEntry, type FaqEntryDraft } from '@vfortin/content-domain';
import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import {
  type ContentDatabaseHandle,
  migrateContentDatabase,
  openContentDatabase,
} from '@internal/content-adapters-out/lib/persistence/database/content-database';
import {
  contentRevision,
  faqEntries,
  faqList,
  siteBuildRequests,
} from '@internal/content-adapters-out/lib/persistence/schema/content.schema';
import { DrizzleContentSnapshotReader } from '@internal/content-adapters-out/lib/persistence/repositories/content/drizzle-content.repositories';
import {
  DrizzleFaqEntryRepository,
  DrizzleFaqListRepository,
  DrizzleFaqUnitOfWork,
} from '@internal/content-adapters-out/lib/persistence/repositories/faq/drizzle-faq.repositories';
import { DrizzlePublicationRepository } from '@internal/content-adapters-out/lib/persistence/repositories/publication/drizzle-publication.repository';
import { seedContent } from '@internal/content-adapters-out/lib/seed/content.seed';

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
 * Constant DRAFT
 *
 * @description
 * Complete bilingual question and answer.
 */
const DRAFT: FaqEntryDraft = {
  question: { fr: 'Proposes-tu de la maintenance ?', en: 'Do you offer maintenance?' },
  answer: { fr: 'Oui.\nSur devis.', en: 'Yes.\nOn quotation.' },
};

/**
 * Constant SEEDED
 *
 * @description
 * Identifiers of the seeded questions, in display order.
 */
const SEEDED: readonly string[] = [
  'availability',
  'employment-status',
  'technologies',
  'remote-work',
  'project-duration',
  'contact',
];

/**
 * Constant clock
 *
 * @description
 * Fixed request time.
 */
const clock: { now: () => Date } = { now: (): Date => new Date('2026-11-20T09:00:00Z') };

/**
 * Function order
 *
 * @description
 * Identifiers of the stored entries by position.
 *
 * @param {ContentDatabaseHandle} handle - Database handle.
 * @returns {Promise<string[]>} Ordered identifiers.
 */
async function order(handle: ContentDatabaseHandle): Promise<string[]> {
  return (await new DrizzleFaqEntryRepository(handle.db).list()).map(
    (entry: FaqEntry): string => entry.id,
  );
}

describe('FAQ administration (Postgres via PGlite)', (): void => {
  let handle: ContentDatabaseHandle;
  let unitOfWork: DrizzleFaqUnitOfWork;

  beforeEach(async (): Promise<void> => {
    handle = await openContentDatabase('pglite:memory');
    await migrateContentDatabase(handle, MIGRATIONS);
    await seedContent(handle.db);
    unitOfWork = new DrizzleFaqUnitOfWork(handle.db);
  });

  afterEach(async (): Promise<void> => {
    await handle.close();
  });

  it('lists the six seeded questions with placeholder answers, the seed creating the list row', async (): Promise<void> => {
    expect(await order(handle)).toEqual(SEEDED);
    const first: FaqEntry | null = await new DrizzleFaqEntryRepository(handle.db).get(
      'availability',
    );
    expect(first?.question.toProps()).toEqual({
      fr: 'Es-tu disponible pour de nouveaux projets ?',
      en: 'Are you available for new projects?',
    });
    expect(first?.answer.toProps()).toEqual({ fr: '[À COMPLÉTER]', en: '[TO BE COMPLETED]' });
    expect(await new DrizzleFaqListRepository(handle.db).version()).toBe(1);
    // Replaying the seed bumps the list version: a reorder read before it fails.
    await seedContent(handle.db);
    expect(await new DrizzleFaqListRepository(handle.db).version()).toBe(2);
  });

  it('publishes the questions in their order through the snapshot reader', async (): Promise<void> => {
    const content: Awaited<ReturnType<GetPublishedContent['execute']>> =
      await new GetPublishedContent(new DrizzleContentSnapshotReader(handle.db)).execute();
    expect(content.faq.map((entry: FaqEntry): string => entry.id)).toEqual(SEEDED);
  });

  it('creates an entry at the end and increments public content without a rebuild', async (): Promise<void> => {
    const result: FaqEntryChangeResult = await new CreateFaqEntry(
      unitOfWork,
      { next: (): string => 'maintenance' },
      clock,
    ).execute(DRAFT);
    expect(result).toMatchObject({ version: 1, revision: 2 });
    const [row] = await handle.db
      .select()
      .from(faqEntries)
      .where(sql`${faqEntries.id} = 'maintenance'`);
    expect(row).toMatchObject({
      position: 6,
      version: 1,
      answer: { fr: 'Oui.\nSur devis.', en: 'Yes.\nOn quotation.' },
    });
    expect((await handle.db.select().from(contentRevision))[0]?.revision).toBe(2);
    expect(await handle.db.select().from(siteBuildRequests)).toEqual([]);
    expect(await new DrizzleFaqListRepository(handle.db).version()).toBe(2);
  });

  it('saves content only with the read version and never moves the entry', async (): Promise<void> => {
    const entries: DrizzleFaqEntryRepository = new DrizzleFaqEntryRepository(handle.db);
    const entry: FaqEntry | null = await entries.get('remote-work');
    if (entry === null) throw new Error('entry missing');
    entry.revise(FaqEntry.revisionOf(DRAFT));
    entry.moveTo(0);
    await expect(entries.save(entry, 1)).resolves.toBe(2);
    await expect(entries.save(entry, 1)).rejects.toBeInstanceOf(VersionMismatchError);
    const saved: FaqEntry | null = await entries.get('remote-work');
    expect(saved?.position).toBe(3);
    expect(saved?.answer.fr).toBe('Oui.\nSur devis.');
  });

  it('reorders with the list version and leaves the entry versions', async (): Promise<void> => {
    const reorder: ReorderFaq = new ReorderFaq(unitOfWork, clock);
    const wanted: string[] = [...SEEDED].reverse();
    await reorder.execute(1, wanted);
    expect(await order(handle)).toEqual(wanted);
    expect((await new DrizzleFaqEntryRepository(handle.db).get('contact'))?.version).toBe(1);
    await expect(reorder.execute(1, [...SEEDED])).rejects.toBeInstanceOf(VersionMismatchError);
    expect(await new DrizzleFaqListRepository(handle.db).version()).toBe(2);
  });

  it('rolls back the version bump of an invalid order', async (): Promise<void> => {
    await expect(
      new ReorderFaq(unitOfWork, clock).execute(1, ['availability']),
    ).rejects.toMatchObject({ code: 'content.faq-order-invalid' });
    expect(await new DrizzleFaqListRepository(handle.db).version()).toBe(1);
  });

  it('deletes with the read version and renumbers the list', async (): Promise<void> => {
    const remove: DeleteFaqEntry = new DeleteFaqEntry(unitOfWork, clock);
    await expect(remove.execute('availability', 5)).rejects.toBeInstanceOf(VersionMismatchError);
    expect(await order(handle)).toHaveLength(6);
    await expect(remove.execute('availability', 1)).resolves.toMatchObject({
      version: 2,
      revision: 2,
    });
    const rows: { id: string; position: number }[] = await handle.db
      .select({ id: faqEntries.id, position: faqEntries.position })
      .from(faqEntries)
      .orderBy(faqEntries.position);
    expect(rows).toEqual(SEEDED.slice(1).map((id: string, position: number) => ({ id, position })));
  });

  it('keeps the frozen questions while a publication batch is open, and reads live rows for a batch frozen before the FAQ', async (): Promise<void> => {
    const read = (): Promise<Awaited<ReturnType<GetPublishedContent['execute']>>> =>
      new GetPublishedContent(new DrizzleContentSnapshotReader(handle.db)).execute();
    const publication: DrizzlePublicationRepository = new DrizzlePublicationRepository(handle.db);
    await publication.start((await publication.status()).version);
    await new DeleteFaqEntry(unitOfWork, clock).execute('contact', 1);
    expect((await read()).faq.map((entry: FaqEntry): string => entry.id)).toEqual(SEEDED);
    // A batch frozen by an older service version has no `faq` rows.
    await handle.db.execute(
      sql`update content.publication_state set frozen = frozen - 'faq' where id = 1`,
    );
    expect((await read()).faq.map((entry: FaqEntry): string => entry.id)).toEqual(
      SEEDED.slice(0, -1),
    );
  });

  it('creates a missing list row when bumping from version 1', async (): Promise<void> => {
    await handle.db.delete(faqList);
    const lists: DrizzleFaqListRepository = new DrizzleFaqListRepository(handle.db);
    expect(await lists.version()).toBe(1);
    await expect(lists.bump(1)).resolves.toBe(2);
    await expect(lists.bump(1)).rejects.toBeInstanceOf(VersionMismatchError);
    await handle.db.delete(faqList);
    await expect(lists.bump(null)).resolves.toBe(2);
    await expect(lists.bump(4)).rejects.toBeInstanceOf(VersionMismatchError);
  });
});
