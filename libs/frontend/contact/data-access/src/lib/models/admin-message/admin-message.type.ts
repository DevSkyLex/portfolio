import type { AdminMessageStatus } from '@internal/contact-web-data-access/lib/models/admin-message/admin-message-status.type';
/**
 * Type AdminMessage
 *
 * @description
 * Immutable inbox presentation record; its observed version remains available for optimistic writes.
 */
export type AdminMessage = {
  // #region Properties
  /**
   * Property id
   *
   * @description
   * Stable owner identity used for tracking and commands.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property name
   *
   * @description
   * Sender display name.
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property company
   *
   * @description
   * Organization, or null when the sender supplied none.
   *
   * @type {string | null}
   */
  readonly company: string | null;

  /**
   * Property email
   *
   * @description
   * Reply address displayed in the inbox.
   *
   * @type {string}
   */
  readonly email: string;

  /**
   * Property subject
   *
   * @description
   * Owner-defined contact category.
   *
   * @type {'project' | 'job' | 'other'}
   */
  readonly subject: 'project' | 'job' | 'other';

  /**
   * Property message
   *
   * @description
   * Plain message body.
   *
   * @type {string}
   */
  readonly message: string;

  /**
   * Property locale
   *
   * @description
   * Locale in which the public request was submitted.
   *
   * @type {'fr' | 'en'}
   */
  readonly locale: 'fr' | 'en';

  /**
   * Property status
   *
   * @description
   * Lifecycle status controlling the available administration actions.
   *
   * @type {AdminMessageStatus}
   */
  readonly status: AdminMessageStatus;

  /**
   * Property receivedAt
   *
   * @description
   * ISO timestamp at which the server accepted the request.
   *
   * @type {string}
   */
  readonly receivedAt: string;

  /**
   * Property purgeAt
   *
   * @description
   * ISO retention deadline supplied by the owner.
   *
   * @type {string}
   */
  readonly purgeAt: string;

  /**
   * Property version
   *
   * @description
   * Observed optimistic-lock version carried into subsequent writes.
   *
   * @type {number}
   */
  readonly version: number;
  // #endregion
};
