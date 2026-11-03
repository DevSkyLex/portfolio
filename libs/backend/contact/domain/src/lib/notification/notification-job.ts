import { InvalidValueError } from '@internal/contact-domain/lib/errors/domain-error';

/**
 * Type NotificationJobStatus
 * @type NotificationJobStatus
 *
 * @description
 * Persisted outcome state of an owner notification delivery.
 *
 * @type {'pending' | 'sent' | 'failed'}
 */
export type NotificationJobStatus = 'pending' | 'sent' | 'failed';

/**
 * Constant MAX_ATTEMPTS
 * @readonly
 *
 * @description
 * Maximum delivery attempts before a notification is permanently marked failed; its message remains stored.
 *
 * @type {number}
 */
export const MAX_ATTEMPTS: number = 8;

/**
 * Constant MINUTE
 * @readonly
 *
 * @description
 * Milliseconds in one minute, used as the base unit for notification retry delays.
 *
 * @type {number}
 */
const MINUTE: number = 60_000;

/**
 * Constant MAX_DELAY
 * @readonly
 *
 * @description
 * Upper bound for exponential notification retries, in milliseconds.
 *
 * @type {number}
 */
const MAX_DELAY: number = 6 * 60 * MINUTE;

/**
 * Interface NotificationJobProps
 * @interface NotificationJobProps
 *
 * @description
 * Persisted outbox state needed to schedule, retry and report a notification delivery.
 */
export interface NotificationJobProps {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable identifier of the outbox job.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property messageId
   * @readonly
   *
   * @description
   * Identifier of the contact message this job delivers.
   *
   * @type {string}
   */
  readonly messageId: string;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Current delivery outcome state.
   *
   * @type {NotificationJobStatus}
   */
  readonly status: NotificationJobStatus;

  /**
   * Property attempts
   * @readonly
   *
   * @description
   * Number of delivery attempts already recorded.
   *
   * @type {number}
   */
  readonly attempts: number;

  /**
   * Property nextAttemptAt
   * @readonly
   *
   * @description
   * Earliest instant at which a pending job can be claimed again.
   *
   * @type {Date}
   */
  readonly nextAttemptAt: Date;

  /**
   * Property lastError
   * @readonly
   *
   * @description
   * Most recent failure text, or `null` when no failure has been recorded.
   *
   * @type {string | null}
   */
  readonly lastError: string | null;

  /**
   * Property sentAt
   * @readonly
   *
   * @description
   * Delivery completion instant, or `null` until a send succeeds.
   *
   * @type {Date | null}
   */
  readonly sentAt: Date | null;
  // #endregion
}

/**
 * Function retryDelay
 *
 * @description
 * Calculates an exponential retry delay starting at one minute and capped at six hours.
 * @param {number} attempts - One-based number of failed attempts, including the attempt just completed.
 * @returns {number} Delay until the next attempt, in milliseconds.
 */
export function retryDelay(attempts: number): number {
  return Math.min(2 ** Math.max(attempts - 1, 0) * MINUTE, MAX_DELAY);
}

/**
 * Class NotificationJob
 * @class NotificationJob
 *
 * @description
 * Models the outbox lifecycle for an owner e-mail; delivery is at least once because expired leases are retried.
 */
export class NotificationJob {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores the immutable state of a new or rehydrated outbox job.
   * @param {NotificationJobProps} props - Complete persisted job state.
   */
  private constructor(private readonly props: NotificationJobProps) {}
  // #endregion

  // #region Methods
  /**
   * Method forMessage
   * @method forMessage
   *
   * @description
   * Creates a pending job due immediately for a newly accepted message.
   * @param {string} id - Identifier assigned to the notification job.
   * @param {string} messageId - Identifier of the message to notify about.
   * @param {Date} now - Initial due instant.
   * @returns {NotificationJob} Pending job with no delivery attempts.
   */
  public static forMessage(id: string, messageId: string, now: Date): NotificationJob {
    return new NotificationJob({
      id,
      messageId,
      status: 'pending',
      attempts: 0,
      nextAttemptAt: now,
      lastError: null,
      sentAt: null,
    });
  }

  /**
   * Method rehydrate
   * @method rehydrate
   *
   * @description
   * Reconstructs a stored job after validating its persisted attempt count.
   * @param {NotificationJobProps} props - Stored job fields.
   * @returns {NotificationJob} Rehydrated outbox job.
   * @throws {InvalidValueError} When the attempt count is negative or not an integer.
   */
  public static rehydrate(props: NotificationJobProps): NotificationJob {
    if (!Number.isInteger(props.attempts) || props.attempts < 0) {
      throw new InvalidValueError('attempts', 'positive integer expected');
    }
    return new NotificationJob(props);
  }
  // #endregion

  // #region Properties
  /**
   * Method id
   * @method id
   *
   * @description
   * Returns the identifier used to persist this outbox job.
   * @returns {string} Job identifier.
   */
  public get id(): string {
    return this.props.id;
  }

  /**
   * Method messageId
   * @method messageId
   *
   * @description
   * Returns the identifier of the message this job delivers.
   * @returns {string} Contact message identifier.
   */
  public get messageId(): string {
    return this.props.messageId;
  }

  /**
   * Method status
   * @method status
   *
   * @description
   * Returns the persisted delivery state.
   * @returns {NotificationJobStatus} Current job state.
   */
  public get status(): NotificationJobStatus {
    return this.props.status;
  }
  // #endregion

  // #region Methods
  /**
   * Method succeeded
   * @method succeeded
   *
   * @description
   * Returns a sent job snapshot, increments the attempt count and clears the previous failure.
   * @param {Date} now - Instant at which delivery completed.
   * @returns {NotificationJob} Updated sent job.
   */
  public succeeded(now: Date): NotificationJob {
    return new NotificationJob({
      ...this.props,
      status: 'sent',
      attempts: this.props.attempts + 1,
      lastError: null,
      sentAt: now,
    });
  }

  /**
   * Method failed
   * @method failed
   *
   * @description
   * Records a failed attempt, truncates its diagnostic to 500 characters and schedules a retry unless the limit is reached.
   * @param {string} reason - Failure diagnostic to persist.
   * @param {Date} now - Instant at which the attempt failed.
   * @returns {NotificationJob} Updated pending or terminal failed job.
   */
  public failed(reason: string, now: Date): NotificationJob {
    const attempts: number = this.props.attempts + 1;
    return new NotificationJob({
      ...this.props,
      attempts,
      status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
      nextAttemptAt: new Date(now.getTime() + retryDelay(attempts)),
      lastError: reason.slice(0, 500),
    });
  }

  /**
   * Method snapshot
   * @method snapshot
   *
   * @description
   * Returns a shallow copy of all fields required to persist the job.
   * @returns {NotificationJobProps} Persistable outbox state.
   */
  public snapshot(): NotificationJobProps {
    return { ...this.props };
  }
  // #endregion
}
