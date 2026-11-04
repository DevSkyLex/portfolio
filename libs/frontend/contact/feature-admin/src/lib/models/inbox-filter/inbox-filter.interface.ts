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
   * Tab value of the filter.
   *
   * @type {InboxFilterKey}
   */
  readonly key: InboxFilterKey;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Localized label of the filter.
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

  /**
   * Property empty
   * @readonly
   *
   * @description
   * Localized title of the empty state shown when the filter matches no message.
   *
   * @type {string}
   */
  readonly empty: string;

  /**
   * Property emptyHint
   * @readonly
   *
   * @description
   * Localized description of that empty state: where messages come from, or how one reaches the tab.
   *
   * @type {string}
   */
  readonly emptyHint: string;

  /**
   * Property listLabel
   * @readonly
   *
   * @description
   * Localized accessible name of the message list while the filter is selected.
   *
   * @type {string}
   */
  readonly listLabel: string;

  /**
   * Property icon
   * @readonly
   *
   * @description
   * ng-icons glyph shown before the tab label; one already bundled elsewhere, since every lucide
   * icon lands in the initial bundle (D31).
   *
   * @type {string}
   */
  readonly icon: string;
  // #endregion
}
