import type {
  ContactMessage,
  ContactMessageProps,
  ContactMessageStatus,
  NotificationJob,
} from '@vfortin/contact-domain';

/**
 * Interface MessagePage
 * @interface MessagePage
 *
 * @description
 * One page of inbox messages and the total count matching its filter.
 */
export interface MessagePage {
  // #region Properties
  /**
   * Property items
   * @readonly
   *
   * @description
   * Messages in this page in repository-defined newest-first order.
   *
   * @type {readonly ContactMessage[]}
   */
  readonly items: readonly ContactMessage[];

  /**
   * Property total
   * @readonly
   *
   * @description
   * Total number of messages matching the query across all pages.
   *
   * @type {number}
   */
  readonly total: number;
  // #endregion
}

/**
 * Interface MessageQuery
 * @interface MessageQuery
 *
 * @description
 * Administrator inbox filter and pagination request passed to the repository.
 */
export interface MessageQuery {
  // #region Properties
  /**
   * Property status
   * @readonly
   *
   * @description
   * Optional inbox state filter; `null` includes every status.
   *
   * @type {ContactMessageStatus | null}
   */
  readonly status: ContactMessageStatus | null;

  /**
   * Property page
   * @readonly
   *
   * @description
   * One-based page number requested from the repository.
   *
   * @type {number}
   */
  readonly page: number;

  /**
   * Property pageSize
   * @readonly
   *
   * @description
   * Maximum number of messages requested in this page.
   *
   * @type {number}
   */
  readonly pageSize: number;
  // #endregion
}

/**
 * Interface ContactMessageRepository
 * @interface ContactMessageRepository
 *
 * @description
 * Port for inbox persistence, optimistic status writes, erasure and retention cleanup.
 */
export interface ContactMessageRepository {
  // #region Methods
  /**
   * Method add
   * @method add
   *
   * @description
   * Persists a newly accepted message.
   * @param {ContactMessage} message - Message to insert.
   * @returns {Promise<void>} Completion after insertion.
   */
  add(message: ContactMessage): Promise<void>;

  /**
   * Method list
   * @method list
   *
   * @description
   * Returns a stable newest-first page and total matching count.
   * @param {MessageQuery} query - Filter and pagination selection.
   * @returns {Promise<MessagePage>} Matching page and total.
   */
  list(query: MessageQuery): Promise<MessagePage>;

  /**
   * Method get
   * @method get
   *
   * @description
   * Loads one message by identifier.
   * @param {string} id - Message identifier.
   * @returns {Promise<ContactMessage | null>} Message or `null` when absent.
   */
  get(id: string): Promise<ContactMessage | null>;

  /**
   * Method save
   * @method save
   *
   * @description
   * Persists a transition only when the expected version still matches, returning the next version.
   * @param {ContactMessage} message - Transitioned message.
   * @param {number} expectedVersion - Version observed before the transition.
   * @returns {Promise<number>} New persisted version; stale writes reject with a version conflict.
   */
  save(message: ContactMessage, expectedVersion: number): Promise<number>;

  /**
   * Method delete
   * @method delete
   *
   * @description
   * Erases a message and its linked notification records.
   * @param {string} id - Message identifier.
   * @returns {Promise<boolean>} Whether the message existed and was deleted.
   */
  delete(id: string): Promise<boolean>;

  /**
   * Method deleteExpired
   * @method deleteExpired
   *
   * @description
   * Deletes messages whose retention deadline has elapsed and cascades to their notifications.
   * @param {Date} now - Retention comparison instant.
   * @returns {Promise<number>} Number of deleted messages.
   */
  deleteExpired(now: Date): Promise<number>;
  // #endregion
}

/**
 * Interface ClaimedNotification
 * @interface ClaimedNotification
 *
 * @description
 * Job claim, message snapshot and lease token returned to a notification worker.
 */
export interface ClaimedNotification {
  // #region Properties
  /**
   * Property job
   * @readonly
   *
   * @description
   * Claimed outbox job whose outcome the worker must record.
   *
   * @type {NotificationJob}
   */
  readonly job: NotificationJob;

  /**
   * Property message
   * @readonly
   *
   * @description
   * Message snapshot supplied to the notification renderer.
   *
   * @type {ContactMessageProps}
   */
  readonly message: ContactMessageProps;

  /**
   * Property lease
   * @readonly
   *
   * @description
   * Claim token required to record the job outcome before the lease expires.
   *
   * @type {string}
   */
  readonly lease: string;
  // #endregion
}

/**
 * Interface NotificationJobRepository
 * @interface NotificationJobRepository
 *
 * @description
 * Port for writing notification jobs, claiming due work and recording lease-owned outcomes.
 */
export interface NotificationJobRepository {
  // #region Methods
  /**
   * Method add
   * @method add
   *
   * @description
   * Persists a newly scheduled notification job.
   * @param {NotificationJob} job - Job to insert.
   * @returns {Promise<void>} Completion after insertion.
   */
  add(job: NotificationJob): Promise<void>;

  /**
   * Method claimDue
   * @method claimDue
   *
   * @description
   * Atomically claims due notifications with a lease; expired claims become available after worker failure.
   * @param {Date} now - Current instant used to select due jobs and expired leases.
   * @param {number} limit - Maximum number of jobs to claim.
   * @param {Date} leaseUntil - Instant at which an unrecorded claim can be reclaimed.
   *
   * @returns {Promise<ClaimedNotification[]>} Claimed jobs with the message snapshot and lease token.
   */
  claimDue(now: Date, limit: number, leaseUntil: Date): Promise<ClaimedNotification[]>;

  /**
   * Method save
   * @method save
   *
   * @description
   * Records an attempt and releases the lease only while its token remains current.
   * @param {NotificationJob} job - Updated attempt state to persist.
   * @param {string} lease - Token returned by `claimDue`.
   *
   * @returns {Promise<boolean>} Whether this lease still owned the job and recorded the outcome.
   */
  save(job: NotificationJob, lease: string): Promise<boolean>;
  // #endregion
}

/**
 * Interface ContactRepositories
 * @interface ContactRepositories
 *
 * @description
 * Transaction-scoped repositories that persist messages and their notification outbox jobs.
 */
export interface ContactRepositories {
  // #region Properties
  /**
   * Property messages
   * @readonly
   *
   * @description
   * Message repository participating in the current unit-of-work transaction.
   *
   * @type {ContactMessageRepository}
   */
  readonly messages: ContactMessageRepository;

  /**
   * Property jobs
   * @readonly
   *
   * @description
   * Notification outbox repository participating in the current transaction.
   *
   * @type {NotificationJobRepository}
   */
  readonly jobs: NotificationJobRepository;
  // #endregion
}

/**
 * Interface ContactUnitOfWork
 * @interface ContactUnitOfWork
 *
 * @description
 * Port that runs related message and notification writes atomically.
 */
export interface ContactUnitOfWork {
  // #region Methods
  /**
   * Method run
   * @method run
   *
   * @description
   * Runs repository operations atomically, rolling back all writes when the callback rejects.
   * @template T - Result returned by the transactional callback.
   * @param {(repositories: ContactRepositories) => Promise<T>} work - Operations to execute in the transaction.
   * @returns {Promise<T>} Callback result after commit.
   */
  run<T>(work: (repositories: ContactRepositories) => Promise<T>): Promise<T>;
  // #endregion
}

/**
 * Interface ContactNotificationMail
 * @interface ContactNotificationMail
 *
 * @description
 * Rendered owner notification; its recipient is supplied by the mail adapter configuration.
 */
export interface ContactNotificationMail {
  // #region Properties
  /**
   * Property messageId
   * @readonly
   *
   * @description
   * Stable identifier used to derive the outgoing `Message-ID` across retry attempts.
   *
   * @type {string}
   */
  readonly messageId: string;

  /**
   * Property replyTo
   * @readonly
   *
   * @description
   * Sender identity used when the owner replies to the notification.
   *
   * @type {{ readonly name: string; readonly email: string }}
   */
  readonly replyTo: { readonly name: string; readonly email: string };

  /**
   * Property subject
   * @readonly
   *
   * @description
   * Rendered subject line delivered to the site owner.
   *
   * @type {string}
   */
  readonly subject: string;

  /**
   * Property text
   * @readonly
   *
   * @description
   * Plain-text body of the owner notification.
   *
   * @type {string}
   */
  readonly text: string;
  // #endregion
}

/**
 * Interface MailSender
 * @interface MailSender
 *
 * @description
 * Port for delivering the owner notification through an outbound mail adapter.
 */
export interface MailSender {
  // #region Methods
  /**
   * Method send
   * @method send
   *
   * @description
   * Delivers the supplied notification; transport failures reject the returned promise.
   * @param {ContactNotificationMail} mail - Rendered message to deliver.
   * @returns {Promise<void>} Completion after transport acceptance.
   */
  send(mail: ContactNotificationMail): Promise<void>;
  // #endregion
}

/**
 * Interface RateLimit
 * @interface RateLimit
 *
 * @description
 * Request allowance and duration used by the contact origin rate limiter.
 */
export interface RateLimit {
  // #region Properties
  /**
   * Property limit
   * @readonly
   *
   * @description
   * Maximum allowed requests in one active window.
   *
   * @type {number}
   */
  readonly limit: number;

  /**
   * Property windowMs
   * @readonly
   *
   * @description
   * Duration of each fixed rate-limit window, in milliseconds.
   *
   * @type {number}
   */
  readonly windowMs: number;
  // #endregion
}

/**
 * Interface RateLimiter
 * @interface RateLimiter
 *
 * @description
 * Port for shared per-key fixed-window counting and expiry cleanup.
 */
export interface RateLimiter {
  // #region Methods
  /**
   * Method consume
   * @method consume
   *
   * @description
   * Increments the active key window and reports whether the resulting count remains allowed.
   * @param {string} key - Privacy-preserving origin key.
   * @param {RateLimit} rule - Maximum count and window duration.
   * @param {Date} now - Instant used to evaluate the window.
   * @returns {Promise<boolean>} Whether the request is within the configured limit.
   */
  consume(key: string, rule: RateLimit, now: Date): Promise<boolean>;

  /**
   * Method purgeExpired
   * @method purgeExpired
   *
   * @description
   * Removes counters whose fixed windows have ended.
   * @param {Date} now - Expiry comparison instant.
   * @returns {Promise<void>} Completion after expired counters are removed.
   */
  purgeExpired(now: Date): Promise<void>;
  // #endregion
}

/**
 * Interface Clock
 * @interface Clock
 *
 * @description
 * Supplies time to application rules without binding them to the system clock.
 */
export interface Clock {
  // #region Methods
  /**
   * Method now
   * @method now
   *
   * @description
   * Reads the current instant from the configured time source.
   * @returns {Date} Current instant.
   */
  now(): Date;
  // #endregion
}

/**
 * Interface IdGenerator
 * @interface IdGenerator
 *
 * @description
 * Supplies identifiers without binding application use cases to a generation library.
 */
export interface IdGenerator {
  // #region Methods
  /**
   * Method next
   * @method next
   *
   * @description
   * Generates a fresh identifier for a persisted message or job.
   * @returns {string} Generated identifier.
   */
  next(): string;
  // #endregion
}

/**
 * Method purgeExpired
 * @method purgeExpired
 *
 * @description
 * Removes counters for windows that ended before the supplied instant.
 * @param {Date} now - Expiry comparison instant.
 * @returns {Promise<void>} Completion after expired counters are removed.
 */
