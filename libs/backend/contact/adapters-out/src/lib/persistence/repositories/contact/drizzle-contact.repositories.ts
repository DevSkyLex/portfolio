import {
  type ClaimedNotification,
  type ContactMessageRepository,
  type MessagePage,
  type MessageQuery,
  VersionMismatchError,
  type ContactRepositories,
  type ContactUnitOfWork,
  type NotificationJobRepository,
  type RateLimit,
  type RateLimiter,
} from '@vfortin/contact-application';
import {
  ContactMessage,
  NotificationJob,
  type NotificationJobProps,
} from '@vfortin/contact-domain';
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  lte,
  or,
  sql,
  type SQL,
  type SQLWrapper,
} from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { ContactDatabase } from '@internal/contact-adapters-out/lib/persistence/database/contact-database';
import {
  messages,
  notificationJobs,
  rateLimits,
} from '@internal/contact-adapters-out/lib/persistence/schema/contact.schema';

/**
 * Class DrizzleContactMessageRepository
 * @class DrizzleContactMessageRepository
 *
 * @description
 * Persists contact messages and applies optimistic version checks using Drizzle.
 */
export class DrizzleContactMessageRepository implements ContactMessageRepository {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Binds message operations to the supplied contact database handle or transaction.
   * @param {ContactDatabase} db - Drizzle database connection.
   */
  public constructor(private readonly db: ContactDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method add
   * @method add
   *
   * @description
   * Inserts the complete domain snapshot for a newly received message.
   * @param {ContactMessage} message - Message to persist.
   * @returns {Promise<void>} Completion after insertion.
   */
  public async add(message: ContactMessage): Promise<void> {
    await this.db.insert(messages).values(message.snapshot());
  }

  /**
   * Method list
   * @method list
   *
   * @description
   * Reads the matching page in stable newest-first order and counts all matching rows.
   * @param {MessageQuery} query - Status filter and normalized page selection.
   * @returns {Promise<MessagePage>} Rehydrated messages and total count.
   */
  public async list(query: MessageQuery): Promise<MessagePage> {
    const filter: SQL<unknown> | undefined =
      query.status === null ? undefined : eq(messages.status, query.status);
    const [rows, totals] = await Promise.all([
      this.db
        .select()
        .from(messages)
        .where(filter)
        .orderBy(desc(messages.receivedAt), desc(messages.id))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      this.db.select({ total: count() }).from(messages).where(filter),
    ]);
    return {
      items: rows.map((row): ContactMessage => ContactMessage.rehydrate(row)),
      total: totals[0]?.total ?? 0,
    };
  }

  /**
   * Method get
   * @method get
   *
   * @description
   * Loads one message by identifier, returning `null` when no row exists.
   * @param {string} id - Message identifier.
   * @returns {Promise<ContactMessage | null>} Rehydrated message or `null`.
   */
  public async get(id: string): Promise<ContactMessage | null> {
    const [row] = await this.db.select().from(messages).where(eq(messages.id, id));
    return row ? ContactMessage.rehydrate(row) : null;
  }

  /**
   * Method save
   * @method save
   *
   * @description
   * Updates status and increments version atomically; a missing or stale row raises `VersionMismatchError`.
   * @param {ContactMessage} message - Transitioned domain message.
   * @param {number} expectedVersion - Version previously observed by the caller.
   * @returns {Promise<number>} Persisted incremented version.
   */
  public async save(message: ContactMessage, expectedVersion: number): Promise<number> {
    const [row] = await this.db
      .update(messages)
      .set({ status: message.status, version: sql`${messages.version} + 1` })
      .where(and(eq(messages.id, message.id), eq(messages.version, expectedVersion)))
      .returning({ version: messages.version });
    if (row === undefined) {
      throw new VersionMismatchError();
    }
    return row.version;
  }

  /**
   * Method delete
   * @method delete
   *
   * @description
   * Deletes a message; the schema cascades deletion to its notification job.
   * @param {string} id - Message identifier to erase.
   * @returns {Promise<boolean>} Whether a row was removed.
   */
  public async delete(id: string): Promise<boolean> {
    const deleted: Pick<typeof messages.$inferSelect, 'id'>[] = await this.db
      .delete(messages)
      .where(eq(messages.id, id))
      .returning({ id: messages.id });
    return deleted.length === 1;
  }

  /**
   * Method deleteExpired
   * @method deleteExpired
   *
   * @description
   * Deletes messages whose purge timestamp is at or before the supplied instant; linked jobs cascade.
   * @param {Date} now - Retention comparison instant.
   * @returns {Promise<number>} Number of deleted messages.
   */
  public async deleteExpired(now: Date): Promise<number> {
    const deleted: Pick<typeof messages.$inferSelect, 'id'>[] = await this.db
      .delete(messages)
      .where(lte(messages.purgeAt, now))
      .returning({ id: messages.id });
    return deleted.length;
  }
  // #endregion
}

/**
 * Class DrizzleNotificationJobRepository
 * @class DrizzleNotificationJobRepository
 *
 * @description
 * Stores notification outbox jobs and atomically claims due work with lease tokens.
 */
export class DrizzleNotificationJobRepository implements NotificationJobRepository {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Binds outbox operations to the supplied contact database handle or transaction.
   * @param {ContactDatabase} db - Drizzle database connection.
   */
  public constructor(private readonly db: ContactDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method add
   * @method add
   *
   * @description
   * Inserts a new job with no active worker lease.
   * @param {NotificationJob} job - New outbox job.
   * @returns {Promise<void>} Completion after insertion.
   */
  public async add(job: NotificationJob): Promise<void> {
    await this.db
      .insert(notificationJobs)
      .values({ ...job.snapshot(), claimedUntil: null, claimToken: null });
  }

  /**
   * Method claimDue
   * @method claimDue
   *
   * @description
   * Locks due rows with `SKIP LOCKED`, assigns a shared lease token, then loads associated messages.
   * Expired leases make jobs eligible for another worker; missing messages are omitted.
   * @param {Date} now - Current instant for due and lease-expiry checks.
   * @param {number} limit - Maximum number of jobs to claim.
   * @param {Date} leaseUntil - Instant at which an unrecorded claim can be reclaimed.
   * @returns {Promise<ClaimedNotification[]>} Claimed jobs and their message snapshots.
   */
  public async claimDue(
    now: Date,
    limit: number,
    leaseUntil: Date,
  ): Promise<ClaimedNotification[]> {
    // Atomic claim: two workers never take the same row (SKIP LOCKED), and an expired lease
    // releases the notification of a stopped worker.
    const due = this.db
      .select({ id: notificationJobs.id })
      .from(notificationJobs)
      .where(
        and(
          eq(notificationJobs.status, 'pending'),
          lte(notificationJobs.nextAttemptAt, now),
          or(isNull(notificationJobs.claimedUntil), lte(notificationJobs.claimedUntil, now)),
        ),
      )
      .orderBy(asc(notificationJobs.nextAttemptAt))
      .limit(limit)
      .for('update', { skipLocked: true }) satisfies SQLWrapper;
    const lease: string = randomUUID();
    const claimed: (typeof notificationJobs.$inferSelect)[] = await this.db
      .update(notificationJobs)
      .set({ claimedUntil: leaseUntil, claimToken: lease })
      .where(inArray(notificationJobs.id, due))
      .returning();
    if (claimed.length === 0) {
      return [];
    }
    const rows: (typeof messages.$inferSelect)[] = await this.db
      .select()
      .from(messages)
      .where(
        inArray(
          messages.id,
          claimed.map((job): string => job.messageId),
        ),
      );
    const byId: Map<string, typeof messages.$inferSelect> = new Map(
      rows.map((row: typeof messages.$inferSelect): [string, typeof messages.$inferSelect] => [
        row.id,
        row,
      ]),
    );
    return claimed.flatMap((row: typeof notificationJobs.$inferSelect): ClaimedNotification[] => {
      const message: typeof messages.$inferSelect | undefined = byId.get(row.messageId);
      const job: NotificationJob = NotificationJob.rehydrate({
        id: row.id,
        messageId: row.messageId,
        status: row.status,
        attempts: row.attempts,
        nextAttemptAt: row.nextAttemptAt,
        lastError: row.lastError,
        sentAt: row.sentAt,
      });
      return message ? [{ job, message, lease }] : [];
    });
  }

  /**
   * Method save
   * @method save
   *
   * @description
   * Persists the delivery result only while the supplied lease token still owns the job.
   * @param {NotificationJob} job - Updated attempt state to persist.
   * @param {string} lease - Claim token returned by `claimDue`.
   * @returns {Promise<boolean>} Whether the token still owned and updated the job.
   */
  public async save(job: NotificationJob, lease: string): Promise<boolean> {
    const state: NotificationJobProps = job.snapshot();
    const updated: Pick<typeof notificationJobs.$inferSelect, 'id'>[] = await this.db
      .update(notificationJobs)
      .set({
        status: state.status,
        attempts: state.attempts,
        nextAttemptAt: state.nextAttemptAt,
        lastError: state.lastError,
        sentAt: state.sentAt,
        claimedUntil: null,
        claimToken: null,
      })
      .where(and(eq(notificationJobs.id, state.id), eq(notificationJobs.claimToken, lease)))
      .returning({ id: notificationJobs.id });
    return updated.length === 1;
  }
  // #endregion
}

/**
 * Class DrizzleContactUnitOfWork
 * @class DrizzleContactUnitOfWork
 *
 * @description
 * Runs contact message and notification repository operations in one Postgres transaction.
 */
export class DrizzleContactUnitOfWork implements ContactUnitOfWork {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores the database handle used to create transaction-scoped repositories.
   * @param {ContactDatabase} db - Drizzle database connection.
   */
  public constructor(private readonly db: ContactDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method run
   * @method run
   *
   * @description
   * Runs the callback with repositories bound to one transaction and returns its result.
   * @template T - Result produced by the transactional callback.
   * @param {(repositories: ContactRepositories) => Promise<T>} work - Transactional application operation.
   * @returns {Promise<T>} Callback result after commit; callback failure rejects and rolls back.
   */
  public run<T>(work: (repositories: ContactRepositories) => Promise<T>): Promise<T> {
    return this.db.transaction((tx): Promise<T> =>
      work({
        messages: new DrizzleContactMessageRepository(tx),
        jobs: new DrizzleNotificationJobRepository(tx),
      }),
    );
  }
  // #endregion
}

/**
 * Class PostgresRateLimiter
 * @class PostgresRateLimiter
 *
 * @description
 * Implements shared fixed-window origin limits with atomic Postgres upserts across service instances.
 */
export class PostgresRateLimiter implements RateLimiter {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores the database connection used for counter upserts and expiry cleanup.
   * @param {ContactDatabase} db - Drizzle database connection.
   */
  public constructor(private readonly db: ContactDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method consume
   * @method consume
   *
   * @description
   * Atomically increments the key's active window or starts a new one when its expiry has passed.
   * @param {string} key - Privacy-preserving origin fingerprint.
   * @param {RateLimit} rule - Limit and window duration.
   * @param {Date} now - Instant used to evaluate and begin the window.
   * @returns {Promise<boolean>} Whether the resulting count remains within the configured limit.
   */
  public async consume(key: string, rule: RateLimit, now: Date): Promise<boolean> {
    const expiresAt: Date = new Date(now.getTime() + rule.windowMs);
    const [row] = await this.db
      .insert(rateLimits)
      .values({ key, count: 1, expiresAt })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: sql`case when ${rateLimits.expiresAt} <= ${now} then 1 else ${rateLimits.count} + 1 end`,
          expiresAt: sql`case when ${rateLimits.expiresAt} <= ${now} then ${expiresAt} else ${rateLimits.expiresAt} end`,
        },
      })
      .returning({ count: rateLimits.count });
    return (row?.count ?? 1) <= rule.limit;
  }

  /**
   * Method purgeExpired
   * @method purgeExpired
   *
   * @description
   * Deletes fixed-window counters whose expiry is at or before the supplied instant.
   * @param {Date} now - Expiry comparison instant.
   * @returns {Promise<void>} Completion after stale counters are removed.
   */
  public async purgeExpired(now: Date): Promise<void> {
    await this.db.delete(rateLimits).where(lte(rateLimits.expiresAt, now));
  }
  // #endregion
}
