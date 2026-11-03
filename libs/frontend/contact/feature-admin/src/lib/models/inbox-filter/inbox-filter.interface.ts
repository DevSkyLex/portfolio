import type { AdminMessageStatus } from '@vfortin/contact-web-data-access';
import type { InboxFilterKey } from '@internal/contact-web-feature-admin/lib/models/inbox-filter/inbox-filter-key.type';

/**
 * Interface InboxFilter
 * @interface InboxFilter
 *
 * @description
 * One status filter of the inbox title bar.
 */
export interface InboxFilter {
  // #region Properties
  /**
   * Property key
   * @readonly
   *
   * @description
   * Toggle group value of the filter.
   *
   * @type {InboxFilterKey}
   */
  readonly key: InboxFilterKey;

  /**
   * Property label
   * @readonly
   *
   * @description
   * French label of the filter.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Status passed to the inbox store, `null` for every status.
   *
   * @type {AdminMessageStatus | null}
   */
  readonly status: AdminMessageStatus | null;
  // #endregion
}
