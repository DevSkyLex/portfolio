import type { CallState } from '@vfortin/web-http';
import type { AdminTimelineEntry } from '@internal/content-web-data-access/lib/admin/models/admin-timeline-entry/admin-timeline-entry.interface';
import type { TimelineKind } from '@internal/content-web-data-access/lib/admin/models/timeline-kind/timeline-kind.type';

/**
 * Interface AdminTimelineState
 * @interface AdminTimelineState
 *
 * @description
 * Page-scoped list of one timeline kind, its list version and independent load/write call states.
 */
export interface AdminTimelineState {
  // #region Properties
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Kind of the loaded list, `null` before a list load.
   *
   * @type {TimelineKind | null}
   */
  readonly kind: TimelineKind | null;

  /**
   * Property version
   * @readonly
   *
   * @description
   * Version of the loaded list, as the last load or deletion answered it; 0 before a list load.
   *
   * @type {number}
   */
  readonly version: number;

  /**
   * Property entries
   * @readonly
   *
   * @description
   * Entries most recent first (start date, then ongoing and later end first), or the single entry
   * an editor loaded.
   *
   * @type {readonly AdminTimelineEntry[]}
   */
  readonly entries: readonly AdminTimelineEntry[];

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
   * Status of the latest creation, save, deletion or move.
   *
   * @type {CallState}
   */
  readonly writeCallState: CallState;
  // #endregion
}
