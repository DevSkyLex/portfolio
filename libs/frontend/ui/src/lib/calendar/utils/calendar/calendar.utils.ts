import type { CalendarRange } from '@internal/ui/lib/calendar/models/calendar/calendar-range.interface';
import type { Weekday } from '@internal/ui/lib/calendar/models/calendar/weekday.type';

/**
 * Function startOfDay
 *
 * @description
 * Creates a local-time date for the same calendar day with its time fields set to midnight.
 *
 * @param {Date} date - Source date whose local calendar day is preserved.
 *
 * @returns {Date} New date at local midnight.
 */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Function startOfMonth
 *
 * @description
 * Creates a local-time date for the first day of the source date's month at midnight.
 *
 * @param {Date} date - Source date that selects the month and year.
 *
 * @returns {Date} New date for the first day of that month.
 */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Function addDays
 *
 * @description
 * Creates a local-time date offset from the source by a whole number of calendar days.
 *
 * @param {Date} date - Source date for the offset.
 * @param {number} days - Signed number of calendar days to add.
 *
 * @returns {Date} New date after the calendar-day offset.
 */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/**
 * Function addMonths
 *
 * @description
 * Moves by whole calendar months while clamping the day to the last available day in a shorter
 * target month.
 *
 * @param {Date} date - Source date for the month offset.
 * @param {number} months - Signed number of calendar months to add.
 *
 * @returns {Date} New date with the source day preserved when it exists in the target month.
 */
export function addMonths(date: Date, months: number): Date {
  const target: Date = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay: number = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay));
}

/**
 * Function isSameDay
 *
 * @description
 * Compares local year, month, and day fields; missing values never match.
 *
 * @param {Date | null | undefined} a - First optional date.
 * @param {Date | null | undefined} b - Second optional date.
 *
 * @returns {boolean} Whether both values exist and represent the same local calendar day.
 */
export function isSameDay(a: Date | null | undefined, b: Date | null | undefined): boolean {
  return (
    !!a &&
    !!b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Function compareDays
 *
 * @description
 * Orders two dates by their local calendar day, ignoring the time of day.
 *
 * @param {Date} a - First date.
 * @param {Date} b - Second date.
 *
 * @returns {number} Negative when `a` is an earlier day, zero on the same day, positive otherwise.
 */
export function compareDays(a: Date, b: Date): number {
  return startOfDay(a).getTime() - startOfDay(b).getTime();
}

/**
 * Function rangeSpan
 *
 * @description
 * Resolves the days a range draws, normalized to local midnight: both ends in order when they are
 * set; with a single end, from it to the preview day when that day does not precede it, else that
 * end alone.
 *
 * @param {CalendarRange} range - Committed or partially chosen range.
 * @param {Date | null} preview - Day under the pointer or keyboard focus, if any.
 *
 * @returns {{ start: Date; end: Date } | null} Inclusive drawn span, or `null` for an empty range.
 */
export function rangeSpan(
  range: CalendarRange,
  preview: Date | null = null,
): { start: Date; end: Date } | null {
  const { start, end } = range;
  if (start && end) {
    const [first, last] = compareDays(start, end) <= 0 ? [start, end] : [end, start];
    return { start: startOfDay(first), end: startOfDay(last) };
  }
  const anchor: Date | null = start ?? end;
  if (!anchor) return null;
  const last: Date = preview && compareDays(preview, anchor) >= 0 ? preview : anchor;
  return { start: startOfDay(anchor), end: startOfDay(last) };
}

/**
 * Function isSameMonth
 *
 * @description
 * Compares local year and month fields without considering the day or time.
 *
 * @param {Date} a - First date.
 * @param {Date} b - Second date.
 *
 * @returns {boolean} Whether both dates fall in the same local month and year.
 */
export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/**
 * Function dayKey
 *
 * @description
 * Formats the date's local calendar fields into a zero-padded day key for attributes and lookup.
 *
 * @param {Date} date - Date to format using local time.
 *
 * @returns {string} Local date key in `yyyy-mm-dd` form.
 */
export function dayKey(date: Date): string {
  const month: string = String(date.getMonth() + 1).padStart(2, '0');
  const day: string = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Function clampDay
 *
 * @description
 * Normalizes the candidate and optional bounds to local midnight, then clamps to the nearest
 * bound when it falls outside their inclusive range.
 *
 * @param {Date} date - Candidate date to clamp.
 * @param {Date | null | undefined} min - Optional inclusive lower date bound.
 * @param {Date | null | undefined} max - Optional inclusive upper date bound.
 *
 * @returns {Date} Candidate day or the violated bound, normalized to local midnight.
 */
export function clampDay(date: Date, min?: Date | null, max?: Date | null): Date {
  const day: Date = startOfDay(date);
  if (min && day < startOfDay(min)) return startOfDay(min);
  if (max && day > startOfDay(max)) return startOfDay(max);
  return day;
}

/**
 * Function isOutOfRange
 *
 * @description
 * Checks the normalized local calendar day against optional inclusive date bounds.
 *
 * @param {Date} date - Candidate date to check.
 * @param {Date | null | undefined} min - Optional inclusive lower date bound.
 * @param {Date | null | undefined} max - Optional inclusive upper date bound.
 *
 * @returns {boolean} Whether the candidate precedes `min` or follows `max`.
 */
export function isOutOfRange(date: Date, min?: Date | null, max?: Date | null): boolean {
  const day: Date = startOfDay(date);
  return (!!min && day < startOfDay(min)) || (!!max && day > startOfDay(max));
}

/**
 * Function firstDayOfWeek
 *
 * @description
 * Reads the locale's first weekday from `Intl.Locale` when available and falls back to Monday for
 * missing week data or an invalid locale.
 *
 * @param {string} locale - BCP 47 locale identifier used for week data.
 *
 * @returns {Weekday} First day using the Sunday-zero numbering of `Date.getDay()`.
 */
export function firstDayOfWeek(locale: string): Weekday {
  try {
    const info: Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    } = new Intl.Locale(locale);
    const firstDay: number | undefined = (info.getWeekInfo?.() ?? info.weekInfo)?.firstDay;
    if (firstDay) return (firstDay % 7) as Weekday;
  } catch {
    // Unknown locale: fall back to Monday.
  }
  return 1;
}

/**
 * Function monthGrid
 *
 * @description
 * Builds complete calendar weeks from the week containing the month's first day through the week
 * containing its last day.
 *
 * @param {Date} month - Date selecting the displayed month.
 * @param {Weekday} weekStartsOn - Weekday used as the first column.
 *
 * @returns {Date[][]} Rows of seven local dates covering the month.
 */
export function monthGrid(month: Date, weekStartsOn: Weekday): Date[][] {
  const first: Date = startOfMonth(month);
  const start: Date = addDays(first, -((first.getDay() - weekStartsOn + 7) % 7));
  const last: Date = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const weeks: Date[][] = [];
  for (let day: Date = start; day <= last; day = addDays(day, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, index) => addDays(day, index)));
  }
  return weeks;
}

/**
 * Function weekDays
 *
 * @description
 * Produces seven consecutive reference dates ordered from the requested weekday for locale labels.
 *
 * @param {Weekday} weekStartsOn - Weekday used as the first date.
 *
 * @returns {Date[]} Seven dates in weekday display order.
 */
export function weekDays(weekStartsOn: Weekday): Date[] {
  // 2024-01-07 is a Sunday.
  return Array.from({ length: 7 }, (_, index) => new Date(2024, 0, 7 + weekStartsOn + index));
}
