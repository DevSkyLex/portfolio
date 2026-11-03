import type { AdminMessage } from '@internal/contact-web-data-access/lib/models/admin-message/admin-message.type';
/**
 * Interface AdminMessagePage
 *
 * @description
 * Inbox pagination projection owned by contact presentation state.
 */
export interface AdminMessagePage {
  // #region Properties
  /**
   * Property member
   *
   * @description
   * Presentation records on the requested page.
   *
   * @type {readonly AdminMessage[]}
   */
  readonly member: readonly AdminMessage[];

  /**
   * Property totalItems
   *
   * @description
   * Authoritative matching count across every page.
   *
   * @type {number}
   */
  readonly totalItems: number;
  // #endregion
}
