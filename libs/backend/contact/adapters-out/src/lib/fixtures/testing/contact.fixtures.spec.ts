import { eq } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import {
  CONTACT_MESSAGE_FIXTURES,
  loadContactFixtures,
} from '@internal/contact-adapters-out/lib/fixtures/contact.fixtures';
import {
  type ContactDatabaseHandle,
  migrateContactDatabase,
  openContactDatabase,
} from '@internal/contact-adapters-out/lib/persistence/database/contact-database';
import {
  messages,
  notificationJobs,
} from '@internal/contact-adapters-out/lib/persistence/schema/contact.schema';

/**
 * Constant MIGRATIONS
 *
 * @description
 * Contact service migrations applied to the in-memory database.
 *
 * @type {string}
 */
const MIGRATIONS: string = fileURLToPath(
  new URL('../../../../../../../../apps/contact-service/migrations', import.meta.url),
);

/**
 * Constant NOW
 *
 * @description
 * Loading time of the fixtures.
 *
 * @type {Date}
 */
const NOW: Date = new Date('2026-11-06T12:00:00Z');

describe('loadContactFixtures', (): void => {
  let handle: ContactDatabaseHandle;

  beforeEach(async (): Promise<void> => {
    handle = await openContactDatabase('pglite:memory');
    await migrateContactDatabase(handle, MIGRATIONS);
  });

  afterEach(async (): Promise<void> => {
    await handle.close();
  });

  it('fills the inbox, dated from now, without notification job', async (): Promise<void> => {
    expect(await loadContactFixtures(handle.db, NOW)).toBe(CONTACT_MESSAGE_FIXTURES.length);
    const rows: (typeof messages.$inferSelect)[] = await handle.db.select().from(messages);
    expect(rows).toHaveLength(6);
    expect(new Set(rows.map((row): string => row.status))).toEqual(
      new Set(['received', 'read', 'archived']),
    );
    const newest: typeof messages.$inferSelect | undefined = rows.find(
      (row): boolean => row.id === CONTACT_MESSAGE_FIXTURES[0]?.id,
    );
    expect(newest?.receivedAt.toISOString()).toBe('2026-11-06T09:00:00.000Z');
    expect(newest?.purgeAt.toISOString()).toBe('2029-11-06T09:00:00.000Z');
    expect(await handle.db.select().from(notificationJobs)).toEqual([]);
  });

  it('resets a fixture message changed since, and keeps the other messages', async (): Promise<void> => {
    await loadContactFixtures(handle.db, NOW);
    const id: string = CONTACT_MESSAGE_FIXTURES[0]?.id ?? '';
    await handle.db
      .update(messages)
      .set({ status: 'archived', version: 4 })
      .where(eq(messages.id, id));
    await loadContactFixtures(handle.db, NOW);
    const [row] = await handle.db.select().from(messages).where(eq(messages.id, id));
    expect(row).toMatchObject({ status: 'received', version: 1 });
    expect(await handle.db.select().from(messages)).toHaveLength(6);
  });
});
