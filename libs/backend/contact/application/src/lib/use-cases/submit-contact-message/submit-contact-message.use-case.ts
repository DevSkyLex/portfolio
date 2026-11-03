import {
  ContactMessage,
  type ContactLocale,
  type ContactSubject,
  NotificationJob,
} from '@vfortin/contact-domain';
import { RateLimitedError } from '@internal/contact-application/lib/errors/application-error';
import type {
  Clock,
  ContactUnitOfWork,
  IdGenerator,
  RateLimit,
  RateLimiter,
} from '@internal/contact-application/lib/ports/contact/contact.ports';

/**
 * Interface SubmitContactMessageCommand
 * @interface SubmitContactMessageCommand
 *
 * @description
 * Contact form fields and privacy-preserving origin fingerprint needed to accept a submission.
 */
export interface SubmitContactMessageCommand {
  // #region Properties
  /**
   * Property name
   * @readonly
   *
   * @description
   * Sender display name validated and trimmed by the domain model.
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property company
   * @readonly
   *
   * @description
   * Optional company value; `null` represents an omitted company.
   *
   * @type {string | null}
   */
  readonly company: string | null;

  /**
   * Property email
   * @readonly
   *
   * @description
   * Sender e-mail address used for replies.
   *
   * @type {string}
   */
  readonly email: string;

  /**
   * Property subject
   * @readonly
   *
   * @description
   * Contact category selected by the sender.
   *
   * @type {ContactSubject}
   */
  readonly subject: ContactSubject;

  /**
   * Property body
   * @readonly
   *
   * @description
   * Text of the sender's message.
   *
   * @type {string}
   */
  readonly body: string;

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Language of the contact page used for the submission.
   *
   * @type {ContactLocale}
   */
  readonly locale: ContactLocale;

  /**
   * Property clientKey
   * @readonly
   *
   * @description
   * HMAC fingerprint of the request origin used for rate limiting; the clear IP is never passed to this use case.
   *
   * @type {string}
   */
  readonly clientKey: string;
  // #endregion
}

/**
 * Constant SUBMIT_RATE_LIMIT
 * @readonly
 *
 * @description
 * Allows five contact submissions per HMAC-fingerprinted origin in a one-hour window (D15).
 *
 * @type {RateLimit}
 */
export const SUBMIT_RATE_LIMIT: RateLimit = { limit: 5, windowMs: 60 * 60 * 1000 };

/**
 * Class SubmitContactMessage
 * @class SubmitContactMessage
 *
 * @description
 * Enforces the contact rate limit and atomically stores the message with its notification outbox job (D3, D15).
 */
export class SubmitContactMessage {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores the transaction, rate-limit, clock and identifier dependencies used for acceptance.
   * @param {ContactUnitOfWork} unitOfWork - Transaction boundary for message and notification persistence.
   * @param {RateLimiter} rateLimiter - Shared origin rate-limit store.
   * @param {Clock} clock - Source of the acceptance instant.
   * @param {IdGenerator} ids - Source of message and outbox identifiers.
   */
  public constructor(
    private readonly unitOfWork: ContactUnitOfWork,
    private readonly rateLimiter: RateLimiter,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Checks the origin allowance, validates the submission through the domain model and writes both records in one transaction.
   * A denied request raises `RateLimitedError`; persistence failures reject the promise.
   * @param {SubmitContactMessageCommand} command - Sender fields and origin fingerprint.
   * @returns {Promise<{ id: string }>} Identifier of the accepted contact message.
   */
  public async execute(command: SubmitContactMessageCommand): Promise<{ id: string }> {
    const now: Date = this.clock.now();
    const allowed: boolean = await this.rateLimiter.consume(
      `contact:${command.clientKey}`,
      SUBMIT_RATE_LIMIT,
      now,
    );
    if (!allowed) {
      throw new RateLimitedError();
    }
    const message: ContactMessage = ContactMessage.receive({
      ...command,
      id: this.ids.next(),
      receivedAt: now,
    });
    const job: NotificationJob = NotificationJob.forMessage(this.ids.next(), message.id, now);
    await this.unitOfWork.run(async ({ messages, jobs }): Promise<void> => {
      await messages.add(message);
      await jobs.add(job);
    });
    return { id: message.id };
  }
  // #endregion
}
