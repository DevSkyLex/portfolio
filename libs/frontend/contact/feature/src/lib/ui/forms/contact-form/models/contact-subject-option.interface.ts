import type { ContactFormSubject } from '@internal/contact-web-feature/lib/ui/forms/contact-form/models/contact-form-subject.type';

/**
 * Interface ContactSubjectOption
 * @interface ContactSubjectOption
 *
 * @description
 * One choice of the contact form's subject select.
 */
export interface ContactSubjectOption {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Subject value accepted by the contact API.
   *
   * @type {ContactFormSubject}
   */
  readonly value: ContactFormSubject;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Localized label of the option.
   *
   * @type {string}
   */
  readonly label: string;
  // #endregion
}
