import type { ContactLinkKind } from '@internal/contact-web-feature/lib/ui/sections/contact-section/models/contact-link-kind.type';

/**
 * Interface ContactLink
 * @interface ContactLink
 *
 * @description
 * Public link shown beside the contact form. The links are content (the « Informations » page): the
 * shell reads them from the snapshot and passes them, since the contact context reads no content
 * library.
 */
export interface ContactLink {
  // #region Properties
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Link kind.
   *
   * @type {ContactLinkKind}
   */
  readonly kind: ContactLinkKind;

  /**
   * Property href
   * @readonly
   *
   * @description
   * `mailto:` or `https://` address.
   *
   * @type {string}
   */
  readonly href: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Displayed text (the address of an e-mail, the brand of a profile).
   *
   * @type {string}
   */
  readonly label: string;
  // #endregion
}
