import type { AdminTimelineEntry } from '@internal/content-web-data-access/lib/admin/models/admin-timeline-entry/admin-timeline-entry.interface';
import type { YearMonth } from '@internal/content-web-data-access/lib/admin/models/year-month/year-month.interface';

/**
 * Function monthIndex
 *
 * @description
 * Month as one increasing number, so that two months compare by subtraction.
 *
 * @param {YearMonth} value - Year and one-based month.
 *
 * @returns {number} Month index.
 */
function monthIndex(value: YearMonth): number {
  return value.year * 12 + value.month - 1;
}

/**
 * Function compareTimelineRecency
 *
 * @description
 * Administration order of the timeline entries (D36 timeline selection revision): the public
 * timeline places the entries by date, so the list follows the start date, most recent first; on the
 * same start month an ongoing entry (« aujourd'hui ») comes first, then the later end.
 *
 * @param {AdminTimelineEntry} a - First entry.
 * @param {AdminTimelineEntry} b - Second entry.
 *
 * @returns {number} Negative when `a` comes first, positive when `b` does, 0 on the same period.
 */
export function compareTimelineRecency(a: AdminTimelineEntry, b: AdminTimelineEntry): number {
  const byStart: number = monthIndex(b.start) - monthIndex(a.start);
  if (byStart !== 0) return byStart;
  if (a.end === null || b.end === null) return (a.end === null ? 0 : 1) - (b.end === null ? 0 : 1);
  return monthIndex(b.end) - monthIndex(a.end);
}

/**
 * Function timelineByRecency
 *
 * @description
 * Copy of the entries in the administration order (`compareTimelineRecency`); entries of the same
 * period keep the order they came in (the API's, by position), the sort being stable.
 *
 * @param {readonly AdminTimelineEntry[]} entries - Entries in any order.
 *
 * @returns {AdminTimelineEntry[]} Entries, most recent first.
 */
export function timelineByRecency(entries: readonly AdminTimelineEntry[]): AdminTimelineEntry[] {
  return [...entries].sort(compareTimelineRecency);
}
