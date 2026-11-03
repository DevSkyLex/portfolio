import type { ContactMessageProps, ContactSubject, NotificationJob } from '@vfortin/contact-domain';
import type {
  Clock,
  ClaimedNotification,
  ContactNotificationMail,
  MailSender,
  NotificationJobRepository,
} from '@internal/contact-application/lib/ports/contact/contact.ports';

/**
 * Constant DELIVERY_BATCH
 * @readonly
 *
 * @description
 * Maximum number of due notifications claimed by one worker run.
 *
 * @type {number}
 */
export const DELIVERY_BATCH: number = 10;

/**
 * Constant DELIVERY_LEASE_MS
 * @readonly
 *
 * @description
 * Lease duration after which unrecorded notification claims can be reclaimed, in milliseconds.
 *
 * @type {number}
 */
export const DELIVERY_LEASE_MS: number = 5 * 60 * 1000;

/**
 * Constant SUBJECTS
 * @readonly
 *
 * @description
 * French subject labels used in owner notification subject lines and body text.
 *
 * @type {Readonly<Record<ContactSubject, string>>}
 */
const SUBJECTS: Readonly<Record<ContactSubject, string>> = {
  project: 'Un projet à construire',
  job: 'Une offre de poste',
  other: 'Autre chose',
};

/**
 * Function notificationMail
 *
 * @description
 * Builds the French owner notification with the sender as reply target.
 * @param {ContactMessageProps} message - Persisted message fields to include in the notification.
 * @returns {ContactNotificationMail} Mail payload with stable message identifier.
 */
export function notificationMail(message: ContactMessageProps): ContactNotificationMail {
  const from: string = message.company ? `${message.name} (${message.company})` : message.name;
  return {
    messageId: message.id,
    replyTo: { name: message.name, email: message.email },
    subject: `[Portfolio] ${SUBJECTS[message.subject]} — ${message.name}`,
    text: [
      `De : ${from} <${message.email}>`,
      `Objet : ${SUBJECTS[message.subject]}`,
      `Langue : ${message.locale}`,
      `Reçu le : ${message.receivedAt.toISOString()}`,
      '',
      message.body,
    ].join('\n'),
  };
}

/**
 * Interface DeliveryReport
 * @interface DeliveryReport
 *
 * @description
 * Counts delivery outcomes observed by one notification worker run.
 */
export interface DeliveryReport {
  // #region Properties
  /**
   * Property sent
   * @readonly
   *
   * @description
   * Number of notifications delivered during this run, whether or not the outcome was recorded.
   *
   * @type {number}
   */
  readonly sent: number;

  /**
   * Property failed
   * @readonly
   *
   * @description
   * Number of sends that failed during this run, whether or not the outcome was recorded.
   *
   * @type {number}
   */
  readonly failed: number;

  /**
   * Property lost
   * @readonly
   *
   * @description
   * Number of claimed jobs this worker could not update because its claim token was no longer current.
   *
   * @type {number}
   */
  readonly lost: number;
  // #endregion
}

/**
 * Class DeliverPendingNotifications
 * @class DeliverPendingNotifications
 *
 * @description
 * Sends due outbox notifications independently and records outcomes under each claim lease.
 * Delivery is at least once: a sent message may be retried if a worker stops before recording the result.
 */
export class DeliverPendingNotifications {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores the outbox repository, mail adapter and clock used by worker runs.
   * @param {NotificationJobRepository} jobs - Repository that claims and records outbox jobs.
   * @param {MailSender} mailer - Adapter that sends owner notifications.
   * @param {Clock} clock - Source of claim and delivery timestamps.
   */
  public constructor(
    private readonly jobs: NotificationJobRepository,
    private readonly mailer: MailSender,
    private readonly clock: Clock,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Claims a bounded batch, sends each message, records retry or success state and counts claims whose lease was lost.
   * @returns {Promise<DeliveryReport>} Counts of sent, failed and lease-lost outcomes.
   */
  public async execute(): Promise<DeliveryReport> {
    const now: Date = this.clock.now();
    const claimed: ClaimedNotification[] = await this.jobs.claimDue(
      now,
      DELIVERY_BATCH,
      new Date(now.getTime() + DELIVERY_LEASE_MS),
    );
    let sent: number = 0;
    let failed: number = 0;
    let lost: number = 0;
    for (const { job, message, lease } of claimed) {
      let outcome: NotificationJob;
      try {
        await this.mailer.send(notificationMail(message));
        outcome = job.succeeded(this.clock.now());
        sent++;
      } catch (error: unknown) {
        const reason: string = error instanceof Error ? error.message : String(error);
        outcome = job.failed(reason, this.clock.now());
        failed++;
      }

      // Lease lost: the worker that claimed it since records its own outcome.
      if (!(await this.jobs.save(outcome, lease))) {
        lost++;
      }
    }
    return { sent, failed, lost };
  }
  // #endregion
}
