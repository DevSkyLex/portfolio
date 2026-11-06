import type { HeatmapCell, HeatmapRow } from '@vfortin/ui';

/**
 * Interface SeoCalendar
 * @interface SeoCalendar
 *
 * @description
 * Days of a window laid out as a heatmap: one row per weekday (Monday first), one column per week.
 */
export interface SeoCalendar {
  // #region Properties
  /**
   * Property rows
   * @readonly
   *
   * @description
   * Monday to Sunday; a day outside the window is `null`.
   */
  readonly rows: readonly HeatmapRow[];

  /**
   * Property columns
   * @readonly
   *
   * @description
   * Monday of each week, named on every fourth week only so that labels never overlap.
   */
  readonly columns: readonly string[];
  // #endregion
}

/** Days in a week. */
const WEEK: number = 7;

/** Milliseconds in a day. */
const DAY_MS: number = 86_400_000;

/**
 * Function seoCalendar
 *
 * @description
 * Lays daily values out by weekday and week (UTC days, Monday first, as Google reports them), for a
 * heatmap that shows which weekdays draw visits.
 *
 * @param {readonly { date: string }[]} days - Days of the window, ISO dates, any order.
 * @param {(day: T) => number} value - Measure of a day.
 * @param {(value: number) => string} display - Formatter of the measure.
 * @param {string} locale - Locale of the build.
 * @returns {SeoCalendar} Rows and column labels.
 */
export function seoCalendar<T extends { readonly date: string }>(
  days: readonly T[],
  value: (day: T) => number,
  display: (value: number) => string,
  locale: string,
): SeoCalendar {
  const weekday: Intl.DateTimeFormat = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    timeZone: 'UTC',
  });
  const full: Intl.DateTimeFormat = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
  const short: Intl.DateTimeFormat = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  const placed: { time: number; week: number; row: number; day: T }[] = days.map((day: T) => {
    const time: number = Date.parse(`${day.date}T00:00:00Z`);
    const row: number = (new Date(time).getUTCDay() + WEEK - 1) % WEEK;
    return { time, week: time - row * DAY_MS, row, day };
  });
  // Every week from the first to the last, so that a week without any reported day keeps its column.
  const starts: number[] = placed.map((entry: { week: number }): number => entry.week);
  const first: number = Math.min(...starts);
  const count: number = starts.length
    ? Math.round((Math.max(...starts) - first) / (WEEK * DAY_MS)) + 1
    : 0;
  const weeks: number[] = Array.from(
    { length: count },
    (_: unknown, index: number): number => first + index * WEEK * DAY_MS,
  );
  // 5 January 1970 was a Monday: the row labels come from that week.
  const rows: { key: string; label: string; cells: (HeatmapCell | null)[] }[] = Array.from(
    { length: WEEK },
    (_: unknown, row: number) => ({
      key: String(row),
      label: weekday.format(new Date((4 + row) * DAY_MS)),
      cells: weeks.map((): HeatmapCell | null => null),
    }),
  );
  for (const entry of placed) {
    const amount: number = value(entry.day);
    const cells: (HeatmapCell | null)[] | undefined = rows[entry.row]?.cells;
    if (cells)
      cells[weeks.indexOf(entry.week)] = {
        label: full.format(new Date(entry.time)),
        value: amount,
        display: display(amount),
      };
  }
  return {
    rows,
    columns: weeks.map((week: number, index: number): string =>
      index % 4 === 0 ? short.format(new Date(week)) : '',
    ),
  };
}
