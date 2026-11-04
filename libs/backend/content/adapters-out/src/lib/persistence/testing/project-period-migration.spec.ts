import type { Project, ProjectPeriodProps } from '@vfortin/content-domain';
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
import { DrizzleProjectRepository } from '@internal/content-adapters-out/lib/persistence/repositories/content-admin/drizzle-content-admin.repositories';
import { projects } from '@internal/content-adapters-out/lib/persistence/schema/content.schema';

/**
 * Constant MIGRATIONS
 *
 * @description
 * Absolute content-service migration directory.
 */
const MIGRATIONS: string = fileURLToPath(
  new URL('../../../../../../../../apps/content-service/migrations', import.meta.url),
);

/**
 * Constant CONVERSION
 *
 * @description
 * Tag of the migration writing the structured periods from the labels (D46).
 */
const CONVERSION: string = '0011_project_period_data';

/**
 * Constant YEAR
 *
 * @description
 * Current year, the start of a label without any year.
 */
const YEAR: number = new Date().getFullYear();

/**
 * Function migrationsBefore
 *
 * @description
 * Copies the migrations preceding the conversion into a directory with a truncated journal, so rows
 * with a label and no period can be written before the conversion runs.
 *
 * @param {string} root - Directory receiving the copy.
 * @returns {string} Migration directory without the conversion.
 */
function migrationsBefore(root: string): string {
  const journal: { entries: { tag: string }[] } = JSON.parse(
    readFileSync(join(MIGRATIONS, 'meta', '_journal.json'), 'utf8'),
  );
  const entries: { tag: string }[] = journal.entries.slice(
    0,
    journal.entries.findIndex((entry: { tag: string }): boolean => entry.tag === CONVERSION),
  );
  mkdirSync(join(root, 'meta'), { recursive: true });
  for (const entry of entries) {
    copyFileSync(join(MIGRATIONS, `${entry.tag}.sql`), join(root, `${entry.tag}.sql`));
  }
  writeFileSync(join(root, 'meta', '_journal.json'), JSON.stringify({ ...journal, entries }));
  return root;
}

/**
 * Function insertLabelled
 *
 * @description
 * Inserts a project row as stored before D46: a period label, no period.
 *
 * @param {ContentDatabaseHandle} handle - Database handle.
 * @param {string} id - Project identifier and slug.
 * @param {string} label - French period label.
 * @returns {Promise<void>} Completion after the insert.
 */
async function insertLabelled(
  handle: ContentDatabaseHandle,
  id: string,
  label: string,
): Promise<void> {
  const text: string = JSON.stringify({ fr: 'Texte', en: 'Text' });
  const article: string = JSON.stringify({
    fr: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Un.' }] }] },
  });
  await handle.db.execute(sql`
    insert into content.projects
      (id, slug, title, summary, lead, period_label, client, role, place, techs, position, status, article)
    values (${id}, ${id}, ${text}::jsonb, ${text}::jsonb, ${text}::jsonb,
      ${JSON.stringify({ fr: label, en: label })}::jsonb, ${text}::jsonb, ${text}::jsonb,
      ${text}::jsonb, '[]'::jsonb, 0, 'draft', ${article}::jsonb)
  `);
}

/**
 * Function bounds
 *
 * @description
 * Expected period from `[year, month]` pairs, `null` for an ongoing end.
 *
 * @param {readonly [number, number | null]} start - Start year and month.
 * @param {readonly [number, number | null] | null} end - End year and month.
 * @returns {ProjectPeriodProps} Period.
 */
const bounds = (
  start: readonly [number, number | null],
  end: readonly [number, number | null] | null,
): ProjectPeriodProps => ({
  start: { year: start[0], month: start[1] },
  end: end === null ? null : { year: end[0], month: end[1] },
});

/**
 * Constant CASES
 *
 * @description
 * Labels and the period each converts to: the seed's, then odd ones.
 */
const CASES: readonly (readonly [string, string, ProjectPeriodProps])[] = [
  ['ongoing-month', 'Depuis juillet 2026', bounds([2026, 7], null)],
  ['years', '2023 — 2026', bounds([2023, null], [2026, null])],
  ['months-one-year', 'Mars — avril 2023', bounds([2023, 3], [2023, 4])],
  ['across-years', 'Septembre 2023 – juin 2026', bounds([2023, 9], [2026, 6])],
  ['single-month', 'mars 2023', bounds([2023, 3], [2023, 3])],
  ['single-year', '2024', bounds([2024, null], [2024, null])],
  ['ongoing-year', 'Depuis 2023', bounds([2023, null], null)],
  ['hyphen-accents', 'Février - Août 2024', bounds([2024, 2], [2024, 8])],
  ['capitals-no-accent', 'FEVRIER 2025', bounds([2025, 2], [2025, 2])],
  ['year-turn', 'Novembre — février 2024', bounds([2023, 11], [2024, 2])],
  ['until-today', 'Janvier 2022 — aujourd’hui', bounds([2022, 1], null)],
  ['reversed', '2026 — 2023', bounds([2023, null], [2026, null])],
  ['out-of-range', '1985 — 2024', bounds([1990, null], [2024, null])],
  ['no-year', 'Été', bounds([YEAR, null], null)],
  ['month-no-year', 'Juillet', bounds([YEAR, 7], null)],
];

describe(`${CONVERSION} migration (Postgres via PGlite)`, (): void => {
  let root: string;
  let handle: ContentDatabaseHandle;

  beforeEach(async (): Promise<void> => {
    root = mkdtempSync(join(tmpdir(), 'content-period-migration-'));
    handle = await openContentDatabase('pglite:memory');
    await migrateContentDatabase(handle, migrationsBefore(root));
  });

  afterEach(async (): Promise<void> => {
    await handle.close();
    rmSync(root, { recursive: true, force: true });
  });

  it('writes the period of each label, then drops the label; a replay changes nothing', async (): Promise<void> => {
    for (const [id, label] of CASES) await insertLabelled(handle, id, label);
    await migrateContentDatabase(handle, MIGRATIONS);

    const periods = async (): Promise<Record<string, unknown>> =>
      Object.fromEntries(
        (await handle.db.select({ id: projects.id, period: projects.period }).from(projects)).map(
          (row: { id: string; period: unknown }): [string, unknown] => [row.id, row.period],
        ),
      );
    const converted: Record<string, unknown> = await periods();
    expect(converted).toEqual(
      Object.fromEntries(CASES.map(([id, , period]): [string, unknown] => [id, period])),
    );
    const columns: { rows: { column_name: string }[] } = (await handle.db.execute(sql`
      select column_name from information_schema.columns
      where table_schema = 'content' and table_name = 'projects' and column_name like 'period%'
    `)) as unknown as { rows: { column_name: string }[] };
    expect(columns.rows.map((row: { column_name: string }): string => row.column_name)).toEqual([
      'period',
    ]);

    // Replayed once the label is gone, the conversion does nothing.
    await handle.db.execute(sql.raw(readFileSync(join(MIGRATIONS, `${CONVERSION}.sql`), 'utf8')));
    expect(await periods()).toEqual(converted);

    // Every converted row rehydrates into the aggregate.
    const repository: DrizzleProjectRepository = new DrizzleProjectRepository(handle.db);
    const turn: Project | null = await repository.get('year-turn');
    expect(turn?.snapshot().period.toProps()).toEqual(bounds([2023, 11], [2024, 2]));
    expect(await repository.list()).toHaveLength(CASES.length);
  });

  it('keeps a period already written when replayed before the label is dropped', async (): Promise<void> => {
    await insertLabelled(handle, 'written', '2023 — 2026');
    await handle.db.execute(sql`
      update content.projects
      set period = ${JSON.stringify(bounds([2021, 5], null))}::jsonb
      where id = 'written'
    `);
    await insertLabelled(handle, 'pending', 'Mars 2023');
    await handle.db.execute(sql.raw(readFileSync(join(MIGRATIONS, `${CONVERSION}.sql`), 'utf8')));
    expect(
      Object.fromEntries(
        (await handle.db.select({ id: projects.id, period: projects.period }).from(projects)).map(
          (row: { id: string; period: unknown }): [string, unknown] => [row.id, row.period],
        ),
      ),
    ).toEqual({ written: bounds([2021, 5], null), pending: bounds([2023, 3], [2023, 3]) });
  });
});
