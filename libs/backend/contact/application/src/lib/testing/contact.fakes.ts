import {
  ContactMessage,
  type NotificationJob,
  type NotificationJobProps,
} from '@vfortin/contact-domain';
import { VersionMismatchError } from '@internal/contact-application/lib/errors/application-error';
import type {
  ClaimedNotification,
  Clock,
  ContactMessageRepository,
  ContactNotificationMail,
  ContactRepositories,
  ContactUnitOfWork,
  IdGenerator,
  MailSender,
  MessagePage,
  NotificationJobRepository,
  RateLimit,
  RateLimiter,
} from '@internal/contact-application/lib/ports/contact/contact.ports';

/**
 * Interface JobEntry
 * @interface JobEntry
 *
 * @description
 * In-memory job and current lease metadata used by the contact test store.
 */
export interface JobEntry {
  // #region Properties
  /**
   * Property job
   *
   * @description
   * Notification state stored in the in-memory outbox.
   *
   * @type {NotificationJob}
   */
  job: NotificationJob;

  /**
   * Property claimedUntil
   *
   * @description
   * Instant when a claim can be reclaimed, or `null` when unclaimed.
   *
   * @type {Date | null}
   */
  claimedUntil: Date | null;

  /**
   * Property lease
   *
   * @description
   * Worker token required to record an outcome, or `null` when unclaimed.
   *
   * @type {string | null}
   */
  lease: string | null;
  // #endregion
}

/**
 * Class InMemoryContactStore
 * @class InMemoryContactStore
 *
 * @description
 * Implements contact repositories for tests with copy-on-write transactions and in-memory notification leases.
 */
export class InMemoryContactStore implements ContactUnitOfWork {
  // #region Properties
  /**
   * Property messages
   *
   * @description
   * Committed messages exposed for application-level assertions.
   *
   * @type {Map<string, ContactMessage>}
   */
  public messages: Map<string, ContactMessage> = new Map<string, ContactMessage>();

  /**
   * Property jobs
   *
   * @description
   * Committed notification jobs and their in-memory lease state.
   *
   * @type {Map<string, JobEntry>}
   */
  public jobs: Map<string, JobEntry> = new Map<string, JobEntry>();

  /**
   * Property leases
   *
   * @description
   * Counter used to issue distinct worker tokens within this store instance.
   *
   * @type {number}
   */
  private leases: number = 0;

  /**
   * Property failJobInsert
   *
   * @description
   * Test switch that rejects job insertion to exercise transaction rollback.
   *
   * @type {boolean}
   */
  public failJobInsert: boolean = false;

  /**
   * Property jobRepository
   * @readonly
   *
   * @description
   * Direct outbox repository used by delivery-worker tests.
   *
   * @type {NotificationJobRepository}
   */
  public readonly jobRepository: NotificationJobRepository = {
    add: async (job): Promise<void> => this.addJob(this.jobs, job),
    claimDue: async (now, limit, leaseUntil): Promise<ClaimedNotification[]> => {
      const due: ClaimedNotification[] = [];
      for (const entry of this.jobs.values()) {
        const props: NotificationJobProps = entry.job.snapshot();
        const free: boolean = entry.claimedUntil === null || entry.claimedUntil <= now;
        if (
          props.status === 'pending' &&
          props.nextAttemptAt <= now &&
          free &&
          due.length < limit
        ) {
          entry.claimedUntil = leaseUntil;
          entry.lease = `lease-${++this.leases}`;
          const message: ContactMessage | undefined = this.messages.get(props.messageId);
          if (message)
            due.push({ job: entry.job, message: message.snapshot(), lease: entry.lease });
        }
      }
      return due;
    },
    save: async (job, lease): Promise<boolean> => {
      if (this.jobs.get(job.id)?.lease !== lease) return false;
      this.jobs.set(job.id, { job, claimedUntil: null, lease: null });
      return true;
    },
  };

  /**
   * Property messageRepository
   * @readonly
   *
   * @description
   * Direct message repository backed by the committed store.
   *
   * @type {ContactMessageRepository}
   */
  public readonly messageRepository: ContactMessageRepository = this.messagesOf(
    (): Map<string, ContactMessage> => this.messages,
  );
  // #endregion

  // #region Methods
  /**
   * Method run
   * @method run
   *
   * @description
   * Runs against copied message and job maps, publishing the copies only after the callback resolves.
   * @template T - Result returned by the transaction callback.
   * @param {(repositories: ContactRepositories) => Promise<T>} work - Operations to run in the transaction.
   * @returns {Promise<T>} Callback result after the copied state is committed.
   */
  public async run<T>(work: (repositories: ContactRepositories) => Promise<T>): Promise<T> {
    const messages: Map<string, ContactMessage> = new Map(this.messages);
    const jobs: Map<string, JobEntry> = new Map(this.jobs);
    const result: Awaited<T> = await work({
      messages: this.messagesOf((): Map<string, ContactMessage> => messages),
      jobs: { ...this.jobRepository, add: async (job): Promise<void> => this.addJob(jobs, job) },
    });
    this.messages = messages;
    this.jobs = jobs;
    return result;
  }

  /**
   * Method messagesOf
   * @method messagesOf
   *
   * @description
   * Creates a message repository over a map accessor so the same operations can target committed or transactional state.
   * @param {() => Map<string, ContactMessage>} store - Map selected for the repository operations.
   * @returns {ContactMessageRepository} Repository backed by the selected map.
   */
  private messagesOf(store: () => Map<string, ContactMessage>): ContactMessageRepository {
    return {
      add: async (message): Promise<void> => {
        store().set(message.id, message);
      },
      list: async ({ status, page, pageSize }): Promise<MessagePage> => {
        const all: ContactMessage[] = [...store().values()]
          .filter((m): boolean => status === null || m.status === status)
          .reverse();
        return { items: all.slice((page - 1) * pageSize, page * pageSize), total: all.length };
      },
      get: async (id): Promise<ContactMessage | null> => store().get(id) ?? null,
      save: async (message, expected): Promise<number> => {
        const current: ContactMessage | undefined = store().get(message.id);
        if (!current || current.version !== expected) throw new VersionMismatchError();
        const saved: ContactMessage = ContactMessage.rehydrate({
          ...message.snapshot(),
          version: expected + 1,
        });
        store().set(message.id, saved);
        return expected + 1;
      },
      delete: async (id): Promise<boolean> => store().delete(id),
      deleteExpired: async (now): Promise<number> => this.deleteExpired(store(), now),
    };
  }

  /**
   * Method addJob
   * @method addJob
   *
   * @description
   * Inserts a pending job without a lease, or rejects when the rollback-test switch is enabled.
   * @param {Map<string, JobEntry>} jobs - Job map receiving the entry.
   * @param {NotificationJob} job - Job to insert.
   *
   * @returns {void}
   */
  private addJob(jobs: Map<string, JobEntry>, job: NotificationJob): void {
    if (this.failJobInsert) throw new Error('insert rejected');
    jobs.set(job.id, { job, claimedUntil: null, lease: null });
  }

  /**
   * Method deleteExpired
   * @method deleteExpired
   *
   * @description
   * Removes every expired message from the supplied transactional map and returns the removal count.
   * @param {Map<string, ContactMessage>} messages - Message map to clean.
   * @param {Date} now - Expiry comparison instant.
   * @returns {number} Number of removed messages.
   */
  private deleteExpired(messages: Map<string, ContactMessage>, now: Date): number {
    let deleted: number = 0;
    for (const [id, message] of messages) {
      if (message.isExpired(now)) {
        messages.delete(id);
        deleted++;
      }
    }
    return deleted;
  }
  // #endregion
}

/**
 * Class FakeRateLimiter
 * @class FakeRateLimiter
 *
 * @description
 * In-memory fixed-window test double that records counts and whether expiry cleanup ran.
 */
export class FakeRateLimiter implements RateLimiter {
  // #region Properties
  /**
   * Property counts
   * @readonly
   *
   * @description
   * Request totals recorded by key for rate-limit assertions.
   *
   * @type {Map<string, number>}
   */
  public readonly counts: Map<string, number> = new Map<string, number>();

  /**
   * Property purged
   *
   * @description
   * Observation flag indicating that expiry cleanup ran.
   *
   * @type {boolean}
   */
  public purged: boolean = false;
  // #endregion

  // #region Methods
  /**
   * Method consume
   * @method consume
   *
   * @description
   * Increments the key count and returns whether it is within the test allowance.
   * @param {string} key - Rate-limit bucket key.
   * @param {RateLimit} rule - Allowance to enforce.
   * @returns {Promise<boolean>} Whether this request remains allowed.
   */
  public async consume(key: string, rule: RateLimit): Promise<boolean> {
    const count: number = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, count);
    return count <= rule.limit;
  }

  /**
   * Method purgeExpired
   * @method purgeExpired
   *
   * @description
   * Marks expiry cleanup as invoked for use-case assertions.
   * @returns {Promise<void>} Completion after setting the observation flag.
   */
  public async purgeExpired(): Promise<void> {
    this.purged = true;
  }
  // #endregion
}

/**
 * Class FakeMailer
 * @class FakeMailer
 *
 * @description
 * Records notifications for application tests and can simulate a transport rejection.
 */
export class FakeMailer implements MailSender {
  // #region Properties
  /**
   * Property sent
   * @readonly
   *
   * @description
   * Notification payloads accepted by the fake transport.
   *
   * @type {ContactNotificationMail[]}
   */
  public readonly sent: ContactNotificationMail[] = [];

  /**
   * Property failWith
   *
   * @description
   * Optional error message that makes `send` reject.
   *
   * @type {string | null}
   */
  public failWith: string | null = null;
  // #endregion

  // #region Methods
  /**
   * Method send
   * @method send
   *
   * @description
   * Rejects with the configured reason or records the supplied notification.
   * @param {ContactNotificationMail} mail - Notification to record.
   * @returns {Promise<void>} Completion after recording or rejection.
   */
  public async send(mail: ContactNotificationMail): Promise<void> {
    if (this.failWith) throw new Error(this.failWith);
    this.sent.push(mail);
  }
  // #endregion
}

/**
 * Class FixedClock
 * @class FixedClock
 *
 * @description
 * Provides copies of a configured instant so test operations use deterministic time.
 */
export class FixedClock implements Clock {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Sets the instant returned by clock reads.
   * @param {Date} current - Current test instant.
   */
  public constructor(public current: Date) {}
  // #endregion

  // #region Methods
  /**
   * Method now
   * @method now
   *
   * @description
   * Returns a copy so callers cannot mutate the configured instant.
   * @returns {Date} Copy of the current instant.
   */
  public now(): Date {
    return new Date(this.current);
  }
  // #endregion
}

/**
 * Class SequenceIds
 * @class SequenceIds
 *
 * @description
 * Generates deterministic increasing identifiers for use-case tests.
 */
export class SequenceIds implements IdGenerator {
  // #region Properties
  /**
   * Property n
   *
   * @description
   * Counter incremented to create the next deterministic test identifier.
   *
   * @type {number}
   */
  private n: number = 0;
  // #endregion

  // #region Methods
  /**
   * Method next
   * @method next
   *
   * @description
   * Increments the counter and returns an `id-N` value.
   * @returns {string} Next test identifier.
   */
  public next(): string {
    return `id-${++this.n}`;
  }
  // #endregion
}
