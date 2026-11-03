import type { CallState } from '@vfortin/web-http';
import type { AdminMessage } from '@internal/contact-web-data-access/lib/models/admin-message/admin-message.type';
import type { AdminMessageStatus } from '@internal/contact-web-data-access/lib/models/admin-message/admin-message-status.type';

/**
 * Interface AdminInboxState
 * @interface AdminInboxState
 *
 * @description
 * Current inbox filter, page data, and separate load and write operation states.
 */
export interface AdminInboxState {
  // #region Properties
  /**
   * Property status
   * @readonly
   *
   * @description
   * Selected inbox status filter, or `null` when all statuses are shown.
   *
   * @type {AdminMessageStatus | null}
   */
  readonly status: AdminMessageStatus | null;

  /**
   * Property page
   * @readonly
   *
   * @description
   * One-based current inbox page.
   *
   * @type {number}
   */
  readonly page: number;

  /**
   * Property messages
   * @readonly
   *
   * @description
   * Messages returned for the active status filter and page.
   *
   * @type {readonly AdminMessage[]}
   */
  readonly messages: readonly AdminMessage[];

  /**
   * Property total
   * @readonly
   *
   * @description
   * Total matching messages across all pages.
   *
   * @type {number}
   */
  readonly total: number;

  /**
   * Property loadCallState
   * @readonly
   *
   * @description
   * Lifecycle and normalized error for loading the inbox page.
   *
   * @type {CallState}
   */
  readonly loadCallState: CallState;

  /**
   * Property writeCallState
   * @readonly
   *
   * @description
   * Lifecycle and normalized error for the latest read, archive, or delete operation.
   *
   * @type {CallState}
   */
  readonly writeCallState: CallState;
  // #endregion
}
