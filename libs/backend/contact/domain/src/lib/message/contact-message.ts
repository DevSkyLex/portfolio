import { InvalidValueError } from '@internal/contact-domain/lib/errors/domain-error';

/**
 * Type ContactSubject
 * @type ContactSubject
 *
 * @description
 * Subject category selected by the sender and used to label the owner notification.
 * @type {'project' | 'job' | 'other'}
 */
export type ContactSubject = 'project' | 'job' | 'other';

/**
 * Type ContactLocale
 * @type ContactLocale
 *
 * @description
 * Language of the page from which the message was submitted, used as the reply language.
 * @type {'fr' | 'en'}
 */
export type ContactLocale = 'fr' | 'en';

/**
 * Type ContactMessageStatus
 * @type ContactMessageStatus
 *
 * @description
 * Lifecycle state shown in the administrator inbox.
 * @type {'received' | 'read' | 'archived'}
 */
export type ContactMessageStatus = 'received' | 'read' | 'archived';

/**
 * Constant CONTACT_SUBJECTS
 * @readonly
 *
 * @description
 * Allowed message subjects, also used to validate a subject at the domain boundary.
 * @type {readonly ContactSubject[]}
 */
export const CONTACT_SUBJECTS: readonly ContactSubject[] = ['project', 'job', 'other'];

/**
 * Constant RETENTION_YEARS
 * @readonly
 *
 * @description
 * Number of calendar years a received message is retained before automatic deletion.
 * @type {number}
 */
export const RETENTION_YEARS: number = 3;

/**
 * Constant BODY_MIN_LENGTH
 * @readonly
 *
 * @description
 * Minimum trimmed body length accepted for a contact message, in characters.
 * @type {number}
 */
export const BODY_MIN_LENGTH: number = 20;

/**
 * Constant BODY_MAX_LENGTH
 * @readonly
 *
 * @description
 * Maximum trimmed body length accepted for a contact message, in characters.
 * @type {number}
 */
export const BODY_MAX_LENGTH: number = 2000;

/**
 * Constant NAME_MAX_LENGTH
 * @readonly
 *
 * @description
 * Maximum trimmed sender name length accepted by the domain, in characters.
 * @type {number}
 */
export const NAME_MAX_LENGTH: number = 100;

/**
 * Constant COMPANY_MAX_LENGTH
 * @readonly
 *
 * @description
 * Maximum trimmed company name length accepted by the domain, in characters.
 * @type {number}
 */
export const COMPANY_MAX_LENGTH: number = 120;

/**
 * Constant EMAIL_MAX_LENGTH
 * @readonly
 *
 * @description
 * Maximum e-mail address length accepted by the domain, in characters.
 * @type {number}
 */
export const EMAIL_MAX_LENGTH: number = 254;

/**
 * Constant EMAIL
 * @readonly
 *
 * @description
 * Basic address shape check applied after trimming and length validation.
 *
 * @type {RegExp}
 */
const EMAIL: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Interface ContactMessageProps
 * @interface ContactMessageProps
 *
 * @description
 * Complete persisted state of a contact message, including optimistic version and purge deadline.
 */
export interface ContactMessageProps {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable identifier used by the inbox and notification outbox.
   * @type {string}
   */
  readonly id: string;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Trimmed display name supplied by the sender.
   * @type {string}
   */
  readonly name: string;

  /**
   * Property company
   * @readonly
   *
   * @description
   * Trimmed company name, or `null` when the sender did not provide one.
   * @type {string | null}
   */
  readonly company: string | null;

  /**
   * Property email
   * @readonly
   *
   * @description
   * Validated sender address used as the reply target.
   * @type {string}
   */
  readonly email: string;

  /**
   * Property subject
   * @readonly
   *
   * @description
   * Sender-selected category used in the owner notification.
   * @type {ContactSubject}
   */
  readonly subject: ContactSubject;

  /**
   * Property body
   * @readonly
   *
   * @description
   * Trimmed message text retained for the inbox and notification.
   * @type {string}
   */
  readonly body: string;

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Language of the page the message was sent from and expected reply language.
   * @type {ContactLocale}
   */
  readonly locale: ContactLocale;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Current administrator inbox state.
   * @type {ContactMessageStatus}
   */
  readonly status: ContactMessageStatus;

  /**
   * Property receivedAt
   * @readonly
   *
   * @description
   * Timestamp at which the accepted message entered the domain.
   * @type {Date}
   */
  readonly receivedAt: Date;

  /**
   * Property purgeAt
   * @readonly
   *
   * @description
   * UTC calendar date at which retention expires and the message becomes eligible for deletion.
   * @type {Date}
   */
  readonly purgeAt: Date;

  /**
   * Property version
   * @readonly
   *
   * @description
   * Optimistic-lock version incremented on each successful repository save.
   * @type {number}
   */
  readonly version: number;
  // #endregion
}

/**
 * Interface ReceiveContactMessage
 * @interface ReceiveContactMessage
 *
 * @description
 * Validated submission fields required to create a received message; the optional company normalizes to `null`.
 */
export interface ReceiveContactMessage {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable identifier generated by the application for the accepted submission.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Sender display name, trimmed and bounded when the message is received.
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property company
   * @readonly
   *
   * @description
   * Optional sender company; blank input is normalized to `null`.
   *
   * @type {string | null | undefined}
   */
  readonly company?: string | null;

  /**
   * Property email
   * @readonly
   *
   * @description
   * Sender address used as the notification reply target.
   *
   * @type {string}
   */
  readonly email: string;

  /**
   * Property subject
   * @readonly
   *
   * @description
   * Category selected in the contact form.
   *
   * @type {ContactSubject}
   */
  readonly subject: ContactSubject;

  /**
   * Property body
   * @readonly
   *
   * @description
   * Message text submitted through the contact form.
   *
   * @type {string}
   */
  readonly body: string;

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Language of the page from which the message was submitted.
   *
   * @type {ContactLocale}
   */
  readonly locale: ContactLocale;

  /**
   * Property receivedAt
   * @readonly
   *
   * @description
   * Application clock instant used to begin retention.
   *
   * @type {Date}
   */
  readonly receivedAt: Date;
  // #endregion
}

/**
 * Class ContactMessage
 * @class ContactMessage
 *
 * @description
 * Enforces contact-message invariants and exposes immutable inbox state transitions.
 */
export class ContactMessage {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores a validated or rehydrated immutable message snapshot.
   * @param {ContactMessageProps} props - Complete message state to retain.
   */
  private constructor(private readonly props: ContactMessageProps) {}
  // #endregion

  // #region Methods
  /**
   * Method receive
   * @method receive
   *
   * @description
   * Trims and validates sender fields, initializes inbox state and sets the purge deadline three UTC calendar years after receipt.
   * @param {ReceiveContactMessage} input - Submission and receipt timestamp used to create the message.
   * @returns {ContactMessage} Newly received message at version one.
   * @throws {InvalidValueError} When a sender field violates its domain constraint.
   */
  public static receive(input: ReceiveContactMessage): ContactMessage {
    const name: string = input.name.trim();
    if (name.length === 0 || name.length > NAME_MAX_LENGTH) {
      throw new InvalidValueError('name', `between 1 and ${NAME_MAX_LENGTH} characters`);
    }
    const company: string | null = input.company?.trim() || null;
    if (company !== null && company.length > COMPANY_MAX_LENGTH) {
      throw new InvalidValueError('company', `at most ${COMPANY_MAX_LENGTH} characters`);
    }
    const email: string = input.email.trim();
    if (email.length > EMAIL_MAX_LENGTH || !EMAIL.test(email)) {
      throw new InvalidValueError('email', 'invalid e-mail address');
    }
    if (!CONTACT_SUBJECTS.includes(input.subject)) {
      throw new InvalidValueError('subject', 'unknown subject');
    }
    const body: string = input.body.trim();
    if (body.length < BODY_MIN_LENGTH || body.length > BODY_MAX_LENGTH) {
      throw new InvalidValueError(
        'body',
        `between ${BODY_MIN_LENGTH} and ${BODY_MAX_LENGTH} characters`,
      );
    }
    const purgeAt: Date = new Date(input.receivedAt);
    purgeAt.setUTCFullYear(purgeAt.getUTCFullYear() + RETENTION_YEARS);
    return new ContactMessage({
      id: input.id,
      name,
      company,
      email,
      subject: input.subject,
      body,
      locale: input.locale,
      status: 'received',
      receivedAt: input.receivedAt,
      purgeAt,
      version: 1,
    });
  }

  /**
   * Method rehydrate
   * @method rehydrate
   *
   * @description
   * Reconstructs an immutable message from persisted state without reapplying submission-time validation.
   * @param {ContactMessageProps} props - Previously persisted message state.
   * @returns {ContactMessage} Rehydrated message.
   */
  public static rehydrate(props: ContactMessageProps): ContactMessage {
    return new ContactMessage(props);
  }

  /**
   * Method id
   * @method id
   *
   * @description
   * Returns the stable identifier assigned when the message was received.
   * @returns {string} Message identifier.
   */
  public get id(): string {
    return this.props.id;
  }

  /**
   * Method status
   * @method status
   *
   * @description
   * Returns the current inbox lifecycle state.
   * @returns {ContactMessageStatus} Current status.
   */
  public get status(): ContactMessageStatus {
    return this.props.status;
  }

  /**
   * Method version
   * @method version
   *
   * @description
   * Returns the optimistic-lock version persisted with this message.
   * @returns {number} Current message version.
   */
  public get version(): number {
    return this.props.version;
  }

  /**
   * Method markRead
   * @method markRead
   *
   * @description
   * Moves a newly received message to `read`; archived messages and already-read messages remain unchanged.
   * @returns {ContactMessage} Updated message, or this instance when no transition applies.
   */
  public markRead(): ContactMessage {
    return this.props.status === 'received'
      ? new ContactMessage({ ...this.props, status: 'read' })
      : this;
  }

  /**
   * Method archive
   * @method archive
   *
   * @description
   * Returns a copy in the archived inbox state without mutating the current instance.
   * @returns {ContactMessage} Archived message snapshot.
   */
  public archive(): ContactMessage {
    return new ContactMessage({ ...this.props, status: 'archived' });
  }

  /**
   * Method isExpired
   * @method isExpired
   *
   * @description
   * Compares the purge deadline with the supplied instant; equality counts as expired.
   * @param {Date} now - Instant against which to evaluate retention.
   * @returns {boolean} Whether the message is eligible for purging.
   */
  public isExpired(now: Date): boolean {
    return this.props.purgeAt.getTime() <= now.getTime();
  }

  /**
   * Method snapshot
   * @method snapshot
   *
   * @description
   * Returns a shallow copy of the complete persisted state for repository writes.
   * @returns {ContactMessageProps} Persistable message fields.
   */
  public snapshot(): ContactMessageProps {
    return { ...this.props };
  }
  // #endregion
}
