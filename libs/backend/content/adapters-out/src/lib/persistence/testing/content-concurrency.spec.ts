import { GetPublishedContent, type PublishedContent } from '@vfortin/content-application';
import { sql } from 'drizzle-orm';
import type { Project } from '@vfortin/content-domain';
import { fileURLToPath } from 'node:url';
import { seedContent } from '@internal/content-adapters-out/lib/seed/content.seed';
import {
  type ContentDatabaseHandle,
  migrateContentDatabase,
  openContentDatabase,
} from '@internal/content-adapters-out/lib/persistence/database/content-database';
import {
  DrizzleContentUnitOfWork,
  DrizzleSiteBuildRequestRepository,
} from '@internal/content-adapters-out/lib/persistence/repositories/content-admin/drizzle-content-admin.repositories';
import { DrizzleContentSnapshotReader } from '@internal/content-adapters-out/lib/persistence/repositories/content/drizzle-content.repositories';

/**
 * Constant MIGRATIONS
 *
 * @description
 * Absolute path to the content-service migrations used to prepare concurrency test databases.
 */
const MIGRATIONS: string = fileURLToPath(
  new URL('../../../../../../../../apps/content-service/migrations', import.meta.url),
);

/**
 * Constant now
 *
 * @description
 * Fixed timestamp used for deterministic request leases and retry assertions.
 */
const now: Date = new Date('2026-11-02T10:00:00Z');

/**
 * Constant TARGETS
 *
 * @description
 * Always runs against PGlite and adds a real PostgreSQL target when `TEST_DATABASE_URL` is set;
 * cross-connection lock behavior is only observable against PostgreSQL.
 */
const TARGETS: [string, string][] = [
  ['PGlite', 'pglite:memory'],
  ...(process.env['TEST_DATABASE_URL']
    ? [['Postgres', process.env['TEST_DATABASE_URL']] as [string, string]]
    : []),
];

/**
 * Function openMigrated
 *
 * @description
 * Opens a database, resets the content schema for non-PGlite targets, then applies migrations and
 * seed data before concurrency assertions run.
 *
 * @param {string} url - Database connection URL.
 * @returns {Promise<ContentDatabaseHandle>} Prepared database handle owned by the test.
 */
async function openMigrated(url: string): Promise<ContentDatabaseHandle> {
  const handle: ContentDatabaseHandle = await openContentDatabase(url);
  if (!url.startsWith('pglite:')) {
    await handle.db.execute(sql`drop schema if exists content cascade`);
  }
  await migrateContentDatabase(handle, MIGRATIONS);
  await seedContent(handle.db);
  return handle;
}

describe.each(TARGETS)('Content workers in parallel (%s)', (_target, url): void => {
  let handle: ContentDatabaseHandle;

  beforeEach(async (): Promise<void> => {
    handle = await openMigrated(url);
  });

  afterEach(async (): Promise<void> => {
    await handle.close();
  });

  it('keeps simultaneous content revision increments distinct', async (): Promise<void> => {
    const requests: DrizzleSiteBuildRequestRepository = new DrizzleSiteBuildRequestRepository(
      handle.db,
    );
    const revisions: number[] = await Promise.all([requests.request(now), requests.request(now)]);
    expect(revisions.sort()).toEqual([2, 3]);
  });

  it('reads the revision and the content from the same snapshot', async (): Promise<void> => {
    const reader: DrizzleContentSnapshotReader = new DrizzleContentSnapshotReader(handle.db);
    const uow: DrizzleContentUnitOfWork = new DrizzleContentUnitOfWork(handle.db);
    const reads: [PublishedContent, void, PublishedContent] = await Promise.all([
      new GetPublishedContent(reader).execute(),
      uow.run(async ({ projects, buildRequests }): Promise<void> => {
        const project: Project | null = await projects.get('project-library-trails');
        if (!project) throw new Error('project missing');
        project.unpublish();
        await projects.save(project, 1);
        await buildRequests.request(now);
      }),
      new GetPublishedContent(reader).execute(),
    ]);
    for (const content of [reads[0], reads[2]]) {
      const hasLibraryTrails: boolean = content.projects.some(
        (p): boolean => p.slug.value === 'library-trails',
      );
      expect(hasLibraryTrails).toBe(content.revision === 1);
    }
  });
});
