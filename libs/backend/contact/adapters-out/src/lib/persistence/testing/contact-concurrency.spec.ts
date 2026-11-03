import type { ClaimedNotification, RateLimit } from '@vfortin/contact-application';
import { ContactMessage, NotificationJob } from '@vfortin/contact-domain';
import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import {
  type ContactDatabaseHandle,
  migrateContactDatabase,
  openContactDatabase,
} from '@internal/contact-adapters-out/lib/persistence/database/contact-database';
import {
  DrizzleContactUnitOfWork,
  DrizzleNotificationJobRepository,
  PostgresRateLimiter,
} from '@internal/contact-adapters-out/lib/persistence/repositories/contact/drizzle-contact.repositories';

/**
 * Constant MIGRATIONS
 * @readonly
 *
 * @description
 * Contact migration directory used to prepare the concurrency test database.
 */
const MIGRATIONS: string = fileURLToPath(
  new URL('../../../../../../../../apps/contact-service/migrations', import.meta.url),
);

/**
 * Constant now
 * @readonly
 *
 * @description
 * Fixed instant shared by outbox and rate-limit concurrency operations.
 *
 * @type {Date}
 */
const now: Date = new Date('2026-11-02T10:00:00Z');

/*
 * PGlite always; a real Postgres too when TEST_DATABASE_URL is set: SKIP LOCKED and concurrent
 * upserts only compete across connections there (PGlite has a single one).
 */
/**
 * Constant TARGETS
 * @readonly
 *
 * @description
 * Database targets for the suite: in-memory PGlite always and throwaway Postgres when configured.
 *
 * @type {[string, string][]}
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
 * Opens a test database, recreates the contact schema on Postgres and applies the contact migrations.
 * @param {string} url - PGlite or test Postgres database URL.
 * @returns {Promise<ContactDatabaseHandle>} Migrated database handle owned by the test.
 */
async function openMigrated(url: string): Promise<ContactDatabaseHandle> {
  const handle: ContactDatabaseHandle = await openContactDatabase(url);
  if (!url.startsWith('pglite:')) {
    await handle.db.execute(sql`drop schema if exists contact cascade`);
  }
  await migrateContactDatabase(handle, MIGRATIONS);
  return handle;
}

describe.each(TARGETS)('Contact workers in parallel (%s)', (_target, url): void => {
  let handle: ContactDatabaseHandle;

  beforeEach(async (): Promise<void> => {
    handle = await openMigrated(url);
    const uow: DrizzleContactUnitOfWork = new DrizzleContactUnitOfWork(handle.db);
    for (let i: number = 0; i < 6; i++) {
      await uow.run(async ({ messages, jobs }): Promise<void> => {
        await messages.add(
          ContactMessage.receive({
            id: `m${i}`,
            name: 'Camille Martin',
            email: 'camille@exemple.fr',
            subject: 'project',
            body: 'Bonjour, je cherche un développeur pour une application.',
            locale: 'fr',
            receivedAt: now,
          }),
        );
        await jobs.add(NotificationJob.forMessage(`job-${i}`, `m${i}`, now));
      });
    }
  });

  afterEach(async (): Promise<void> => {
    await handle.close();
  });

  it('never gives the same notification to two workers', async (): Promise<void> => {
    const workers: DrizzleNotificationJobRepository[] = Array.from(
      { length: 4 },
      (): DrizzleNotificationJobRepository => new DrizzleNotificationJobRepository(handle.db),
    );
    const lease: Date = new Date(now.getTime() + 60_000);
    const claims: ClaimedNotification[][] = await Promise.all(
      workers.map((worker) => worker.claimDue(now, 2, lease)),
    );
    const ids: string[] = claims.flat().map((claim): string => claim.job.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(['job-0', 'job-1', 'job-2', 'job-3', 'job-4', 'job-5']);
  });

  it('counts simultaneous requests of one origin exactly', async (): Promise<void> => {
    const limiter: PostgresRateLimiter = new PostgresRateLimiter(handle.db);
    const rule: RateLimit = { limit: 5, windowMs: 3_600_000 };
    const results: boolean[] = await Promise.all(
      Array.from({ length: 12 }, (): Promise<boolean> => limiter.consume('origin', rule, now)),
    );
    expect(results.filter(Boolean)).toHaveLength(5);
  });
});
