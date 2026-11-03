import type { ContactNotificationMail, MailSender } from '@vfortin/contact-application';
import { createTransport, type Transporter } from 'nodemailer';

/**
 * Interface MailSenderOptions
 * @interface MailSenderOptions
 *
 * @description
 * SMTP sender, recipient and transport configuration supplied to the mail adapter.
 */
export interface MailSenderOptions {
  // #region Properties
  /**
   * Property url
   * @readonly
   *
   * @description
   * SMTP or SMTPS URL for delivery, or `json:` for non-delivery development logging.
   *
   * @type {string}
   */
  readonly url: string;

  /**
   * Property from
   * @readonly
   *
   * @description
   * Technical sender identity used in outgoing notifications and their message IDs.
   *
   * @type {string}
   */
  readonly from: string;

  /**
   * Property to
   * @readonly
   *
   * @description
   * Mailbox that receives owner notifications.
   *
   * @type {string}
   */
  readonly to: string;
  // #endregion
}

/**
 * Class NodemailerMailSender
 * @class NodemailerMailSender
 *
 * @description
 * Delivers owner notifications through SMTP or logs a non-delivery JSON transport in development.
 */
export class NodemailerMailSender implements MailSender {
  // #region Properties
  /**
   * Property transport
   * @readonly
   *
   * @description
   * Nodemailer transport configured once for this sender instance.
   *
   * @type {Transporter}
   */
  private readonly transport: Transporter;

  /**
   * Property domain
   * @readonly
   *
   * @description
   * Domain extracted from the technical sender address for stable notification message IDs.
   *
   * @type {string}
   */
  private readonly domain: string;
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates a configured Nodemailer transport and derives the domain used for message IDs.
   * @param {MailSenderOptions} options - SMTP URL and sender/recipient addresses.
   * @param {(line: string) => void} log - Logger used only when the JSON development transport is selected.
   */
  public constructor(
    private readonly options: MailSenderOptions,
    private readonly log: (line: string) => void = (): void => undefined,
  ) {
    this.transport =
      options.url === 'json:'
        ? createTransport({ jsonTransport: true })
        : createTransport({
            url: options.url,
            // Well below the worker's lease (5 min), so a hung server does not lead to a double send.
            connectionTimeout: 10_000,
            greetingTimeout: 10_000,
            socketTimeout: 30_000,
          });
    this.domain = /@([^>\s]+)/.exec(options.from)?.[1] ?? 'localhost';
  }
  // #endregion

  // #region Methods
  /**
   * Method send
   * @method send
   *
   * @description
   * Sends the notification with the sender as reply target and a stable message ID; JSON transport logs without delivering.
   * @param {ContactNotificationMail} mail - Rendered owner notification.
   * @returns {Promise<void>} Completion after Nodemailer accepts the send; transport failures reject.
   */
  public async send(mail: ContactNotificationMail): Promise<void> {
    await this.transport.sendMail({
      from: this.options.from,
      to: this.options.to,
      replyTo: { name: mail.replyTo.name, address: mail.replyTo.email },
      subject: mail.subject,
      text: mail.text,
      // Same ID on every attempt: delivery is at least once, and a mail client may group or
      // deduplicate a repeated send by this ID (not guaranteed).
      messageId: `<${mail.messageId}@${this.domain}>`,
    });
    if (this.options.url === 'json:') {
      this.log(`Notification not sent (json: transport): ${mail.subject}`);
    }
  }
  // #endregion
}
