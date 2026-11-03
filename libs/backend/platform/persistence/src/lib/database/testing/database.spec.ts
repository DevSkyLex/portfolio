import { sql } from 'drizzle-orm';
import { type PgSchema, pgSchema, text } from 'drizzle-orm/pg-core';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  databaseReadinessCheck,
  migrateDatabase,
  openDatabase,
  type DatabaseHandle,
} from '@internal/backend-persistence/lib/database/database';

/**
 * Constant demo
 *
 * @description
 * Test schema used to verify that migrations and their journal remain service-scoped.
 */
const demo: PgSchema<'demo'> = pgSchema('demo');

/**
 * Constant notes
 *
 * @description
 * Minimal table created by the migration fixture and queried after migration.
 */
const notes = demo.table('notes', { id: text('id').primaryKey() });

/**
 * Function migrationsFolder
 *
 * @description
 * Writes the smallest valid Drizzle migration fixture with journal metadata for the demo schema.
 *
 * @param {string} root - Temporary root directory that owns the generated migration files.
 * @returns {string} Migration directory passed to the migrator.
 */
function migrationsFolder(root: string): string {
  const folder: string = join(root, 'migrations');
  mkdirSync(join(folder, 'meta'), { recursive: true });
  writeFileSync(
    join(folder, '0000_init.sql'),
    'CREATE SCHEMA IF NOT EXISTS "demo";\n--> statement-breakpoint\nCREATE TABLE "demo"."notes" ("id" text PRIMARY KEY NOT NULL);',
  );
  writeFileSync(
    join(folder, 'meta', '_journal.json'),
    JSON.stringify({
      version: '7',
      dialect: 'postgresql',
      entries: [{ idx: 0, version: '7', when: 1, tag: '0000_init', breakpoints: true }],
    }),
  );
  return folder;
}

describe('openDatabase', (): void => {
  let root: string;

  beforeEach((): void => {
    root = mkdtempSync(join(tmpdir(), 'persistence-'));
  });

  afterEach((): void => {
    rmSync(root, { recursive: true, force: true });
  });

  it('opens an in-memory PGlite database and reports it ready', async (): Promise<void> => {
    const handle: DatabaseHandle<Record<string, never>> = await openDatabase('pglite:memory', {});
    const result: unknown = await handle.db.execute(sql`select 1 + 1 as total`);
    expect(JSON.stringify(result)).toContain('2');
    const readiness: { readonly name: string; check(): Promise<void> } =
      databaseReadinessCheck(handle);
    expect(readiness.name).toBe('database');
    await expect(readiness.check()).resolves.toBeUndefined();
    await handle.close();
  });

  it('creates the directory of a persistent PGlite database', async (): Promise<void> => {
    const folder: string = join(root, 'nested', 'db');
    const handle: DatabaseHandle<Record<string, never>> = await openDatabase(
      `pglite:${folder}`,
      {},
    );
    await handle.close();
    expect(existsSync(folder)).toBe(true);
    // Initialising PGlite on disk takes several seconds when the whole workspace tests in parallel.
  }, 30_000);

  it('applies migrations once, with a journal in the service schema', async (): Promise<void> => {
    const handle: DatabaseHandle<{ notes: typeof notes }> = await openDatabase('pglite:memory', {
      notes,
    });
    const folder: string = migrationsFolder(root);
    await migrateDatabase(handle, folder, 'demo');
    await migrateDatabase(handle, folder, 'demo');
    await handle.db.insert(notes).values({ id: 'n1' });
    await expect(handle.db.select().from(notes)).resolves.toEqual([{ id: 'n1' }]);
    const journal: unknown = await handle.db.execute(
      sql`select count(*)::int as total from demo.__migrations`,
    );
    expect(JSON.stringify(journal)).toContain('"total":1');
    await handle.close();
  });

  it('opens Postgres through a lazy pool, which fails only when used', async (): Promise<void> => {
    const handle: DatabaseHandle<{ notes: typeof notes }> = await openDatabase(
      'postgres://nobody:secret@127.0.0.1:1/none',
      { notes },
    );
    await expect(migrateDatabase(handle, migrationsFolder(root), 'demo')).rejects.toThrow();
    await handle.close();
  });
});
