import type { AdminTimelineEntry } from '@internal/content-web-data-access/lib/admin/models/admin-timeline-entry/admin-timeline-entry.interface';
import type { YearMonth } from '@internal/content-web-data-access/lib/admin/models/year-month/year-month.interface';
import {
  compareTimelineRecency,
  timelineByRecency,
} from '@internal/content-web-data-access/lib/admin/utils/timeline-order/timeline-order.utils';

/**
 * Function entry
 *
 * @description
 * Builds an experience with its period.
 *
 * @param {string} id - Identifier.
 * @param {YearMonth} start - First month.
 * @param {YearMonth | null} end - Last month, `null` while ongoing.
 *
 * @returns {AdminTimelineEntry} Entry.
 */
const entry = (id: string, start: YearMonth, end: YearMonth | null): AdminTimelineEntry => ({
  id,
  kind: 'experience',
  position: 0,
  version: 1,
  title: { fr: id },
  place: { fr: '' },
  description: { fr: '' },
  start,
  end,
  techs: [],
});

/**
 * Function ids
 *
 * @description
 * Identifiers of the entries in order.
 *
 * @param {readonly AdminTimelineEntry[]} entries - Entries.
 *
 * @returns {string[]} Identifiers.
 */
const ids = (entries: readonly AdminTimelineEntry[]): string[] =>
  entries.map((e: AdminTimelineEntry): string => e.id);

describe('timelineByRecency', () => {
  it('orders by start month, most recent first, whatever the year boundary', () => {
    const entries: AdminTimelineEntry[] = [
      entry('2021-09', { year: 2021, month: 9 }, { year: 2023, month: 6 }),
      entry('2024-01', { year: 2024, month: 1 }, null),
      entry('2023-12', { year: 2023, month: 12 }, { year: 2024, month: 2 }),
    ];
    expect(ids(timelineByRecency(entries))).toEqual(['2024-01', '2023-12', '2021-09']);
    // A copy: the input keeps its order.
    expect(ids(entries)).toEqual(['2021-09', '2024-01', '2023-12']);
  });

  it('puts an ongoing entry first on the same start, then the later end', () => {
    const start: YearMonth = { year: 2023, month: 9 };
    expect(
      ids(
        timelineByRecency([
          entry('short', start, { year: 2023, month: 10 }),
          entry('long', start, { year: 2026, month: 6 }),
          entry('ongoing', start, null),
        ]),
      ),
    ).toEqual(['ongoing', 'long', 'short']);
  });

  it('keeps the incoming order of entries with the same period', () => {
    const start: YearMonth = { year: 2022, month: 1 };
    expect(
      ids(
        timelineByRecency([
          entry('a', start, null),
          entry('b', start, null),
          entry('c', start, null),
        ]),
      ),
    ).toEqual(['a', 'b', 'c']);
    expect(compareTimelineRecency(entry('a', start, null), entry('b', start, null))).toBe(0);
  });
});
