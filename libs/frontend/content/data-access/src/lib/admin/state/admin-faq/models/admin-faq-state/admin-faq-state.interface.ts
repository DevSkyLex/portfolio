import type { CallState } from '@vfortin/web-http';
import type { AdminFaqEntry } from '@internal/content-web-data-access/lib/admin/models/admin-faq-entry/admin-faq-entry.interface';

/**
 * Interface AdminFaqState
 * @interface AdminFaqState
 *
 * @description
 * Page-scoped FAQ list, its list version and independent load/write call states.
 */
export interface AdminFaqState {
  // #region Properties
  /**
   * Property version
   * @readonly
   *
   * @description
   * Version of the loaded list, as the last load, deletion or reorder answered it; 0 before a list
   * load.
   *
   * @type {number}
   */
  readonly version: number;

  /**
   * Property entries
   * @readonly
   *
   * @description
   * Questions by position, or the single entry an editor loaded.
   *
   * @type {readonly AdminFaqEntry[]}
   */
  readonly entries: readonly AdminFaqEntry[];

  /**
   * Property loadCallState
   * @readonly
   *
   * @description
   * Status of the list or entry read.
   *
   * @type {CallState}
   */
  readonly loadCallState: CallState;

  /**
   * Property writeCallState
   * @readonly
   *
   * @description
   * Status of the latest creation, save, deletion or reorder.
   *
   * @type {CallState}
   */
  readonly writeCallState: CallState;
  // #endregion
}
