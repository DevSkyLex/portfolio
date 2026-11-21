import type { AdminFaqEntry } from '@internal/content-web-data-access/lib/admin/models/admin-faq-entry/admin-faq-entry.interface';

/**
 * Interface AdminFaqList
 * @interface AdminFaqList
 *
 * @description
 * Questions as the API lists them (by position) and the list version.
 */
export interface AdminFaqList {
  // #region Properties
  /**
   * Property version
   * @readonly
   *
   * @description
   * List version, quoted in `If-Match` by a reorder: creations, deletions and moves change it, text
   * edits do not.
   *
   * @type {number}
   */
  readonly version: number;

  /**
   * Property entries
   * @readonly
   *
   * @description
   * Questions by position.
   *
   * @type {readonly AdminFaqEntry[]}
   */
  readonly entries: readonly AdminFaqEntry[];
  // #endregion
}
