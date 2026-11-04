import type { AdminTimelineEntry } from '@internal/content-web-data-access/lib/admin/models/admin-timeline-entry/admin-timeline-entry.interface';
import type { TimelineKind } from '@internal/content-web-data-access/lib/admin/models/timeline-kind/timeline-kind.type';

/**
 * Interface AdminTimelineList
 * @interface AdminTimelineList
 *
 * @description
 * Entries of one kind as the API lists them (by position) and the list version.
 */
export interface AdminTimelineList {
  // #region Properties
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Kind of the list.
   *
   * @type {TimelineKind}
   */
  readonly kind: TimelineKind;

  /**
   * Property version
   * @readonly
   *
   * @description
   * List version: creations, deletions and moves change it, text edits do not.
   *
   * @type {number}
   */
  readonly version: number;

  /**
   * Property entries
   * @readonly
   *
   * @description
   * Entries by position.
   *
   * @type {readonly AdminTimelineEntry[]}
   */
  readonly entries: readonly AdminTimelineEntry[];
  // #endregion
}
