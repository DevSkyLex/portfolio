import type { ContactSubject } from '@internal/contact-web-data-access/lib/models/contact-request/contact-subject.type';

/**
 * Interface ContactRequest
 * @interface ContactRequest
 *
 * @description
 * Values collected by the public contact form before adaptation to the API request contract.
 */
export interface ContactRequest {
  // #region Properties
  /**
   * Property name
   * @readonly
   *
   * @description
   * Sender's name submitted with the message.
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property company
   * @readonly
   *
   * @description
   * Optional organization entered by the sender; the API adapter converts blank input to `null`.
   *
   * @type {string}
   */
  readonly company: string;

  /**
   * Property email
   * @readonly
   *
   * @description
   * Sender's reply address.
   *
   * @type {string}
   */
  readonly email: string;

  /**
   * Property subject
   * @readonly
   *
   * @description
   * Contact category selected from the API's supported subject values.
   *
   * @type {ContactSubject}
   */
  readonly subject: ContactSubject;

  /**
   * Property message
   * @readonly
   *
   * @description
   * Message body submitted by the sender.
   *
   * @type {string}
   */
  readonly message: string;

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Locale used for the contact section and API response messages.
   *
   * @type {'fr' | 'en'}
   */
  readonly locale: 'fr' | 'en';

  /**
   * Property website
   * @readonly
   *
   * @description
   * Invisible anti-spam honeypot sent empty by real users and inspected by the server.
   *
   * @type {string}
   */
  readonly website: string;
  // #endregion
}
