import type { ContactFormSubject } from '@internal/contact-web-feature/lib/ui/forms/contact-form/models/contact-form-subject.type';

/**
 * Interface ContactFormValues
 * @interface ContactFormValues
 *
 * @description
 * Values of the public contact form; the section adds the page locale before sending them.
 */
export interface ContactFormValues {
  // #region Properties
  /**
   * Property name
   * @readonly
   *
   * @description
   * Sender's name.
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property company
   * @readonly
   *
   * @description
   * Optional organization; blank input is sent as `null` by the data-access adapter.
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
   * Contact category.
   *
   * @type {ContactFormSubject}
   */
  readonly subject: ContactFormSubject;

  /**
   * Property message
   * @readonly
   *
   * @description
   * Message body.
   *
   * @type {string}
   */
  readonly message: string;

  /**
   * Property website
   * @readonly
   *
   * @description
   * Invisible honeypot, empty for real users and inspected by the server (D15).
   *
   * @type {string}
   */
  readonly website: string;
  // #endregion
}
