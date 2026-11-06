import {
  CreateTimelineEntry,
  DeleteTimelineEntry,
  ReorderTimeline,
  type TimelineEntryChangeResult,
  VersionMismatchError,
} from '@vfortin/content-application';
import { TimelineEntry, type TimelineEntryDraft } from '@vfortin/content-domain';
import { sql } from 'drizzle-orm';
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
  siteBuildRequests,
  contentRevision,
  timelineEntries,
  timelineLists,
} from '@internal/content-adapters-out/lib/persistence/schema/content.schema';
import {
  DrizzleTimelineEntryRepository,
  DrizzleTimelineListRepository,
  DrizzleTimelineUnitOfWork,
} from '@internal/content-adapters-out/lib/persistence/repositories/timeline/drizzle-timeline.repositories';
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
 * Complete bilingual entry content.
 */
const DRAFT: TimelineEntryDraft = {
  title: { fr: 'Stage', en: 'Internship' },
  place: { fr: 'Ville-Exemple', en: 'Ville-Exemple' },
  description: { fr: 'Outils internes.', en: 'Internal tools.' },
  start: { year: 2025, month: 1 },
  end: null,
  techs: ['vue'],
};

/**
 * Constant clock
 *
 * @description
 * Fixed request time.
 */
const clock: { now: () => Date } = { now: (): Date => new Date('2026-11-04T09:00:00Z') };

/**
 * Function order
 *
 * @description
 * Identifiers of a kind's stored entries by position.
 *
 * @param {ContentDatabaseHandle} handle - Database handle.
 * @param {'education' | 'experience'} kind - Kind.
 * @returns {Promise<string[]>} Ordered identifiers.
 */
async function order(
  handle: ContentDatabaseHandle,
  kind: 'education' | 'experience',
): Promise<string[]> {
  return (await new DrizzleTimelineEntryRepository(handle.db).listByKind(kind)).map(
    (entry: TimelineEntry): string => entry.id,
  );
}

describe('Timeline administration (Postgres via PGlite)', (): void => {
  let handle: ContentDatabaseHandle;
  let unitOfWork: DrizzleTimelineUnitOfWork;

  beforeEach(async (): Promise<void> => {
    handle = await openContentDatabase('pglite:memory');
    await migrateContentDatabase(handle, MIGRATIONS);
    await seedContent(handle.db);
    unitOfWork = new DrizzleTimelineUnitOfWork(handle.db);
  });

  afterEach(async (): Promise<void> => {
    await handle.close();
  });

  it('lists the seeded entries of each kind by position, the seed bumping both list versions', async (): Promise<void> => {
    expect(await order(handle, 'education')).toEqual([
      'visual-design-diploma',
      'interaction-design-course',
      'inclusive-design-workshop',
    ]);
    expect(await order(handle, 'experience')).toEqual([
      'paper-lantern-studio',
      'open-reading-collective',
      'independent-interface-practice',
    ]);
    const lists: DrizzleTimelineListRepository = new DrizzleTimelineListRepository(handle.db);
    // The seed bumps the rows the migration created.
    expect(await lists.version('education')).toBe(2);
  });

  it('creates an ongoing entry and increments public content without a rebuild', async (): Promise<void> => {
    const result: TimelineEntryChangeResult = await new CreateTimelineEntry(
      unitOfWork,
      { next: (): string => 'stage' },
      clock,
    ).execute('experience', DRAFT);
    expect(result).toMatchObject({ version: 1, revision: 2 });
    const [row] = await handle.db
      .select()
      .from(timelineEntries)
      .where(sql`${timelineEntries.id} = 'stage'`);
    expect(row).toMatchObject({
      position: 3,
      version: 1,
      endYear: null,
      endMonth: null,
      title: { fr: 'Stage', en: 'Internship' },
    });
    expect((await handle.db.select().from(contentRevision))[0]?.revision).toBe(2);
    expect(await handle.db.select().from(siteBuildRequests)).toEqual([]);
  });

  it('saves content only with the read version and never moves the entry', async (): Promise<void> => {
    const entries: DrizzleTimelineEntryRepository = new DrizzleTimelineEntryRepository(handle.db);
    const entry: TimelineEntry | null = await entries.get('open-reading-collective');
    if (entry === null) throw new Error('entry missing');
    entry.revise(TimelineEntry.revisionOf({ ...DRAFT, end: { year: 2025, month: 6 } }));
    entry.moveTo(0);
    await expect(entries.save(entry, 1)).resolves.toBe(2);
    await expect(entries.save(entry, 1)).rejects.toBeInstanceOf(VersionMismatchError);
    const saved: TimelineEntry | null = await entries.get('open-reading-collective');
    expect(saved?.position).toBe(1);
    expect(saved?.period.end).toEqual({ year: 2025, month: 6 });
    expect(saved?.techs).toEqual(['vue']);
  });

  it('reorders with the list version and leaves the entry versions', async (): Promise<void> => {
    const reorder: ReorderTimeline = new ReorderTimeline(unitOfWork, clock);
    await reorder.execute('experience', 2, [
      'independent-interface-practice',
      'paper-lantern-studio',
      'open-reading-collective',
    ]);
    expect(await order(handle, 'experience')).toEqual([
      'independent-interface-practice',
      'paper-lantern-studio',
      'open-reading-collective',
    ]);
    expect(
      (await new DrizzleTimelineEntryRepository(handle.db).get('open-reading-collective'))?.version,
    ).toBe(1);
    await expect(
      reorder.execute('experience', 2, [
        'paper-lantern-studio',
        'open-reading-collective',
        'independent-interface-practice',
      ]),
    ).rejects.toBeInstanceOf(VersionMismatchError);
    expect(await new DrizzleTimelineListRepository(handle.db).version('experience')).toBe(3);
  });

  it('rolls back the version bump of an invalid order', async (): Promise<void> => {
    await expect(
      new ReorderTimeline(unitOfWork, clock).execute('education', 2, ['visual-design-diploma']),
    ).rejects.toMatchObject({ code: 'content.timeline-order-invalid' });
    expect(await new DrizzleTimelineListRepository(handle.db).version('education')).toBe(2);
  });

  it('deletes with the read version and renumbers the kind', async (): Promise<void> => {
    const remove: DeleteTimelineEntry = new DeleteTimelineEntry(unitOfWork, clock);
    await expect(remove.execute('education', 'visual-design-diploma', 5)).rejects.toBeInstanceOf(
      VersionMismatchError,
    );
    expect(await order(handle, 'education')).toHaveLength(3);
    await expect(remove.execute('education', 'visual-design-diploma', 1)).resolves.toMatchObject({
      version: 3,
      revision: 2,
    });
    const rows: { id: string; position: number }[] = await handle.db
      .select({ id: timelineEntries.id, position: timelineEntries.position })
      .from(timelineEntries)
      .where(sql`${timelineEntries.kind} = 'education'`)
      .orderBy(timelineEntries.position);
    expect(rows).toEqual([
      { id: 'interaction-design-course', position: 0 },
      { id: 'inclusive-design-workshop', position: 1 },
    ]);
  });

  it('creates a missing list row when bumping from version 1', async (): Promise<void> => {
    await handle.db.delete(timelineLists);
    const lists: DrizzleTimelineListRepository = new DrizzleTimelineListRepository(handle.db);
    expect(await lists.version('experience')).toBe(1);
    await expect(lists.bump('experience', 1)).resolves.toBe(2);
    await expect(lists.bump('experience', 1)).rejects.toBeInstanceOf(VersionMismatchError);
    await expect(lists.bump('education', null)).resolves.toBe(2);
    await expect(lists.bump('education', 4)).rejects.toBeInstanceOf(VersionMismatchError);
  });
});

/**
 * Constant BACKFILL
 *
 * @description
 * Tag of the migration numbering the existing entries.
 */
const BACKFILL: string = '0007_timeline_positions';

describe(`${BACKFILL} migration (Postgres via PGlite)`, (): void => {
  let root: string;
  let handle: ContentDatabaseHandle;

  beforeEach(async (): Promise<void> => {
    root = mkdtempSync(join(tmpdir(), 'content-timeline-migration-'));
    const journal: { entries: { tag: string }[] } = JSON.parse(
      readFileSync(join(MIGRATIONS, 'meta', '_journal.json'), 'utf8'),
    );
    const entries: { tag: string }[] = journal.entries.slice(
      0,
      journal.entries.findIndex((entry: { tag: string }): boolean => entry.tag === BACKFILL),
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

  it('numbers each kind chronologically, an ongoing entry last, and creates both lists', async (): Promise<void> => {
    const text: string = JSON.stringify({ fr: 'Texte', en: 'Text' });
    const insert = (
      id: string,
      kind: string,
      start: number,
      end: number | null,
    ): Promise<unknown> =>
      handle.db.execute(sql`
        insert into content.timeline_entries
          (id, kind, title, place, description, start_year, start_month, end_year, end_month, techs)
        values (${id}, ${kind}, ${text}::jsonb, ${text}::jsonb, ${text}::jsonb, ${start}, 9,
          ${end}, ${end === null ? null : 6}, '[]'::jsonb)
      `);
    await insert('late', 'experience', 2024, 2025);
    await insert('ongoing', 'experience', 2022, null);
    await insert('early', 'experience', 2022, 2023);
    await insert('school', 'education', 2020, 2021);
    await migrateContentDatabase(handle, MIGRATIONS);
    expect(await order(handle, 'experience')).toEqual(['early', 'ongoing', 'late']);
    expect(await order(handle, 'education')).toEqual(['school']);
    expect(
      (await handle.db.select().from(timelineLists)).sort((a, b) => a.kind.localeCompare(b.kind)),
    ).toEqual([
      { kind: 'education', version: 1 },
      { kind: 'experience', version: 1 },
    ]);
  });
});
