import type { ClaimedNotification, MessagePage, RateLimit } from '@vfortin/contact-application';
import { VersionMismatchError } from '@vfortin/contact-application';
import { ContactMessage, NotificationJob } from '@vfortin/contact-domain';
import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import {
  type ContactDatabaseHandle,
  migrateContactDatabase,
  openContactDatabase,
} from '@internal/contact-adapters-out/lib/persistence/database/contact-database';
import {
  messages,
  notificationJobs,
} from '@internal/contact-adapters-out/lib/persistence/schema/contact.schema';
import {
  DrizzleContactUnitOfWork,
  DrizzleNotificationJobRepository,
  DrizzleContactMessageRepository,
  PostgresRateLimiter,
} from '@internal/contact-adapters-out/lib/persistence/repositories/contact/drizzle-contact.repositories';

/**
 * Constant MIGRATIONS
 * @readonly
 *
 * @description
 * Contact migration directory used by the repository integration tests.
 */
const MIGRATIONS: string = fileURLToPath(
  new URL('../../../../../../../../../../apps/contact-service/migrations', import.meta.url),
);

/**
 * Constant now
 * @readonly
 *
 * @description
 * Fixed test instant for message retention, retry scheduling and lease comparisons.
 *
 * @type {Date}
 */
const now: Date = new Date('2026-11-02T10:00:00Z');

/**
 * Function later
 *
 * @description
 * Returns a date relative to the fixed test instant for retry and lease assertions.
 * @param {number} ms - Offset from `now`, in milliseconds.
 * @returns {Date} Offset date.
 */
const later: (ms: number) => Date = (ms: number): Date => new Date(now.getTime() + ms);

/**
 * Function message
 *
 * @description
 * Creates a valid persisted-domain message with the supplied identifier and fixed receipt instant.
 * @param {string} id - Message identifier.
 * @returns {ContactMessage} New contact message.
 */
const message: (id: string) => ContactMessage = (id: string): ContactMessage =>
  ContactMessage.receive({
    id,
    name: 'Camille Martin',
    email: 'camille@exemple.fr',
    subject: 'project',
    body: 'Bonjour, je cherche un développeur pour une application.',
    locale: 'fr',
    receivedAt: now,
  });

describe('Contact persistence (Postgres via PGlite)', (): void => {
  let handle: ContactDatabaseHandle;
  let uow: DrizzleContactUnitOfWork;
  let jobs: DrizzleNotificationJobRepository;

  beforeEach(async (): Promise<void> => {
    handle = await openContactDatabase('pglite:memory');
    await migrateContactDatabase(handle, MIGRATIONS);
    uow = new DrizzleContactUnitOfWork(handle.db);
    jobs = new DrizzleNotificationJobRepository(handle.db);
  });

  afterEach(async (): Promise<void> => {
    await handle.close();
  });

  async function submit(id: string): Promise<void> {
    await uow.run(async (repositories): Promise<void> => {
      await repositories.messages.add(message(id));
      await repositories.jobs.add(NotificationJob.forMessage(`job-${id}`, id, now));
    });
  }

  it('rolls back the message if its notification fails (same transaction)', async (): Promise<void> => {
    await submit('m1');
    await expect(
      uow.run(async (repositories): Promise<void> => {
        await repositories.messages.add(message('m2'));

        // ID already taken: the insert fails after the message's insert.
        await repositories.jobs.add(NotificationJob.forMessage('job-m1', 'm2', now));
      }),
    ).rejects.toThrow();
    const ids: string[] = (await handle.db.query.messages.findMany()).map((row): string => row.id);
    expect(ids).toEqual(['m1']);
  });

  it('claims a notification for a single worker, for the duration of the lease', async (): Promise<void> => {
    await submit('m1');
    const first: ClaimedNotification[] = await jobs.claimDue(now, 10, later(60_000));
    expect(first.map((c): string[] => [c.job.id, c.message.email])).toEqual([
      ['job-m1', 'camille@exemple.fr'],
    ]);
    await expect(jobs.claimDue(now, 10, later(60_000))).resolves.toEqual([]);

    // Stopped worker: the lease expires, the notification is picked up again.
    await expect(jobs.claimDue(later(60_000), 10, later(120_000))).resolves.toHaveLength(1);
  });

  it('no longer picks up a sent notification, and releases the lease of a failure', async (): Promise<void> => {
    await submit('m1');
    await submit('m2');
    const claimed: ClaimedNotification[] = await jobs.claimDue(now, 10, later(60_000));
    for (const { job, lease } of claimed) {
      const outcome: NotificationJob =
        job.id === 'job-m1' ? job.succeeded(now) : job.failed('SMTP 421', now);
      await expect(jobs.save(outcome, lease)).resolves.toBe(true);
    }
    const rows: (typeof notificationJobs.$inferSelect)[] = await handle.db
      .select()
      .from(notificationJobs);
    expect(rows.every((row): boolean => row.claimedUntil === null)).toBe(true);
    await expect(jobs.claimDue(later(30_000), 10, later(90_000))).resolves.toEqual([]);
    const retried: ClaimedNotification[] = await jobs.claimDue(later(60_000), 10, later(120_000));
    expect(retried.map((c): string => c.job.id)).toEqual(['job-m2']);
  });

  it('ignores the outcome of a worker whose lease expired and was taken over', async (): Promise<void> => {
    await submit('m1');
    const [stale] = await jobs.claimDue(now, 10, later(60_000));
    const [current] = await jobs.claimDue(later(60_000), 10, later(120_000));
    if (!stale || !current) throw new Error('claim missing');
    expect(current.lease).not.toBe(stale.lease);
    await expect(jobs.save(stale.job.failed('timeout', later(61_000)), stale.lease)).resolves.toBe(
      false,
    );
    await expect(jobs.save(current.job.succeeded(later(62_000)), current.lease)).resolves.toBe(
      true,
    );
    const [row] = await handle.db.select().from(notificationJobs);
    expect(row).toMatchObject({
      status: 'sent',
      attempts: 1,
      claimToken: null,
      claimedUntil: null,
    });
    await expect(jobs.save(current.job.succeeded(later(63_000)), current.lease)).resolves.toBe(
      false,
    );
  });

  it('skips a notification whose message is gone', async (): Promise<void> => {
    await submit('m1');
    await handle.db.execute(
      sql`alter table contact.notification_jobs drop constraint notification_jobs_message_id_messages_id_fk`,
    );
    await handle.db.delete(messages);
    await expect(jobs.claimDue(now, 10, later(60_000))).resolves.toEqual([]);
  });

  it('deletes expired messages with their notifications', async (): Promise<void> => {
    await submit('m1');
    const repository: DrizzleContactMessageRepository = new DrizzleContactMessageRepository(
      handle.db,
    );
    await expect(repository.deleteExpired(now)).resolves.toBe(0);
    await expect(repository.deleteExpired(new Date('2029-11-02T10:00:00Z'))).resolves.toBe(1);
    await expect(handle.db.select().from(notificationJobs)).resolves.toEqual([]);
  });

  it('counts requests per window', async (): Promise<void> => {
    const limiter: PostgresRateLimiter = new PostgresRateLimiter(handle.db);
    const rule: RateLimit = { limit: 2, windowMs: 60_000 };
    await expect(limiter.consume('k', rule, now)).resolves.toBe(true);
    await expect(limiter.consume('k', rule, later(1_000))).resolves.toBe(true);
    await expect(limiter.consume('k', rule, later(2_000))).resolves.toBe(false);
    await expect(limiter.consume('other', rule, later(2_000))).resolves.toBe(true);
    await expect(limiter.consume('k', rule, later(60_000))).resolves.toBe(true);
    await limiter.purgeExpired(later(200_000));
    await expect(handle.db.query.rateLimits.findMany()).resolves.toEqual([]);
  });
});

describe('Inbox (Postgres via PGlite)', (): void => {
  let handle: ContactDatabaseHandle;
  let repository: DrizzleContactMessageRepository;

  beforeEach(async (): Promise<void> => {
    handle = await openContactDatabase('pglite:memory');
    await migrateContactDatabase(handle, MIGRATIONS);
    repository = new DrizzleContactMessageRepository(handle.db);
    await repository.add(message('old'));
    await repository.add(
      ContactMessage.receive({
        ...message('x').snapshot(),
        id: 'recent',
        receivedAt: later(1_000),
      }),
    );
  });

  afterEach(async (): Promise<void> => {
    await handle.close();
  });

  it('keeps a stable order when two messages arrive at the same time', async (): Promise<void> => {
    await repository.add(message('a-tie'));
    await repository.add(message('z-tie'));
    const first: MessagePage = await repository.list({ status: null, page: 2, pageSize: 1 });
    const second: MessagePage = await repository.list({ status: null, page: 3, pageSize: 1 });
    expect([first.items[0]?.id, second.items[0]?.id]).toEqual(['z-tie', 'old']);
  });

  it('reports a version change of a missing message as a conflict', async (): Promise<void> => {
    const current: ContactMessage | null = await repository.get('old');
    if (!current) throw new Error('message missing');
    await repository.delete('old');
    await expect(repository.save(current.archive(), 1)).rejects.toBeInstanceOf(
      VersionMismatchError,
    );
    await expect(repository.get('old')).resolves.toBeNull();
  });

  it('paginates from newest to oldest, with a status filter', async (): Promise<void> => {
    const page: MessagePage = await repository.list({ status: null, page: 1, pageSize: 1 });
    expect(page.total).toBe(2);
    expect(page.items.map((m): string => m.id)).toEqual(['recent']);
    await expect(repository.list({ status: 'read', page: 1, pageSize: 10 })).resolves.toMatchObject(
      {
        total: 0,
      },
    );
  });

  it('changes the status only once per version read', async (): Promise<void> => {
    const current: ContactMessage | null = await repository.get('old');
    if (!current) throw new Error('message missing');
    await expect(repository.save(current.markRead(), 1)).resolves.toBe(2);
    await expect(repository.save(current.archive(), 1)).rejects.toBeInstanceOf(
      VersionMismatchError,
    );
    expect((await repository.get('old'))?.status).toBe('read');
  });

  it('erases a message on request', async (): Promise<void> => {
    await expect(repository.delete('old')).resolves.toBe(true);
    await expect(repository.delete('old')).resolves.toBe(false);
  });
});
