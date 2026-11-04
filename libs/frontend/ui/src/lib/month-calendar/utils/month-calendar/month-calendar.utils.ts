import type { MonthCalendarUnit } from '@internal/ui/lib/month-calendar/models/month-calendar-unit/month-calendar-unit.type';
import type { PeriodBound } from '@internal/ui/lib/month-calendar/models/period-bound/period-bound.interface';

/**
 * Constant MONTH_CALENDAR_PAGE
 *
 * @description
 * Cells per page: the twelve months of a year, or twelve years.
 *
 * @type {number}
 */
export const MONTH_CALENDAR_PAGE: number = 12;

/**
 * Constant MONTH_CALENDAR_COLUMNS
 *
 * @description
 * Cells per grid row; the arrow keys move a row up or down by this many cells.
 *
 * @type {number}
 */
export const MONTH_CALENDAR_COLUMNS: number = 4;

/**
 * Function compareBounds
 *
 * @description
 * Orders two bounds by year, then by month when both carry one; a whole year compares equal to each
 * of its months, so a year-precision range contains the months of its years.
 *
 * @param {PeriodBound} a - First bound.
 * @param {PeriodBound} b - Second bound.
 *
 * @returns {number} Negative when `a` comes first, positive when it comes last, 0 otherwise.
 */
export function compareBounds(a: PeriodBound, b: PeriodBound): number {
  if (a.year !== b.year) return a.year - b.year;
  return a.month === null || b.month === null ? 0 : a.month - b.month;
}

/**
 * Function sameBound
 *
 * @description
 * Whether two optional bounds name the same year and month (a whole year only equals a whole year).
 *
 * @param {PeriodBound | null | undefined} a - First bound.
 * @param {PeriodBound | null | undefined} b - Second bound.
 *
 * @returns {boolean} Whether both exist and match.
 */
export function sameBound(
  a: PeriodBound | null | undefined,
  b: PeriodBound | null | undefined,
): boolean {
  return !!a && !!b && a.year === b.year && a.month === b.month;
}

/**
 * Function toUnit
 *
 * @description
 * Expresses a bound in a calendar unit: a whole year in the year unit, a month (January for a whole
 * year) in the month unit.
 *
 * @param {PeriodBound} bound - Bound to convert.
 * @param {MonthCalendarUnit} unit - Target unit.
 *
 * @returns {PeriodBound} Bound in that unit.
 */
export function toUnit(bound: PeriodBound, unit: MonthCalendarUnit): PeriodBound {
  return unit === 'year'
    ? { year: bound.year, month: null }
    : { year: bound.year, month: bound.month ?? 1 };
}

/**
 * Function currentBound
 *
 * @description
 * Current month or year in local time.
 *
 * @param {MonthCalendarUnit} unit - Unit of the result.
 * @param {Date} today - Reference date, now by default.
 *
 * @returns {PeriodBound} Current month or year.
 */
export function currentBound(unit: MonthCalendarUnit, today: Date = new Date()): PeriodBound {
  return toUnit({ year: today.getFullYear(), month: today.getMonth() + 1 }, unit);
}

/**
 * Function shiftBound
 *
 * @description
 * Moves a bound by whole cells of its unit: months (across years) or years.
 *
 * @param {PeriodBound} bound - Bound to move, already in the unit.
 * @param {MonthCalendarUnit} unit - Unit of the cells.
 * @param {number} cells - Signed number of cells.
 *
 * @returns {PeriodBound} Moved bound.
 */
export function shiftBound(
  bound: PeriodBound,
  unit: MonthCalendarUnit,
  cells: number,
): PeriodBound {
  if (unit === 'year') return { year: bound.year + cells, month: null };
  const ordinal: number = bound.year * 12 + (bound.month ?? 1) - 1 + cells;
  return { year: Math.floor(ordinal / 12), month: (((ordinal % 12) + 12) % 12) + 1 };
}

/**
 * Function pageStart
 *
 * @description
 * First cell of the page holding a bound: January of its year, or the first year of its block of
 * twelve (2016 to 2027, 2028 to 2039…).
 *
 * @param {PeriodBound} bound - Bound on the page.
 * @param {MonthCalendarUnit} unit - Unit of the cells.
 *
 * @returns {PeriodBound} First cell of the page.
 */
export function pageStart(bound: PeriodBound, unit: MonthCalendarUnit): PeriodBound {
  if (unit === 'month') return { year: bound.year, month: 1 };
  const offset: number =
    ((bound.year % MONTH_CALENDAR_PAGE) + MONTH_CALENDAR_PAGE) % MONTH_CALENDAR_PAGE;
  return { year: bound.year - offset, month: null };
}

/**
 * Function isOutOfBounds
 *
 * @description
 * Whether a bound lies before `min` or after `max` (both inclusive, compared with `compareBounds`).
 *
 * @param {PeriodBound} bound - Candidate.
 * @param {PeriodBound | undefined} min - Lower bound.
 * @param {PeriodBound | undefined} max - Upper bound.
 *
 * @returns {boolean} Whether it is outside.
 */
export function isOutOfBounds(bound: PeriodBound, min?: PeriodBound, max?: PeriodBound): boolean {
  return (!!min && compareBounds(bound, min) < 0) || (!!max && compareBounds(bound, max) > 0);
}

/**
 * Function clampBound
 *
 * @description
 * Brings a bound of a unit back between `min` and `max`, converted to that unit.
 *
 * @param {PeriodBound} bound - Candidate, already in the unit.
 * @param {MonthCalendarUnit} unit - Unit of the result.
 * @param {PeriodBound | undefined} min - Lower bound.
 * @param {PeriodBound | undefined} max - Upper bound.
 *
 * @returns {PeriodBound} The bound, or the violated limit in the unit.
 */
export function clampBound(
  bound: PeriodBound,
  unit: MonthCalendarUnit,
  min?: PeriodBound,
  max?: PeriodBound,
): PeriodBound {
  if (min && compareBounds(bound, min) < 0) return toUnit(min, unit);
  if (max && compareBounds(bound, max) > 0) return toUnit(max, unit);
  return bound;
}

/**
 * Function boundKey
 *
 * @description
 * Stable key of a bound: `yyyy` for a year, `yyyy-mm` for a month.
 *
 * @param {PeriodBound} bound - Bound.
 *
 * @returns {string} Key.
 */
export function boundKey(bound: PeriodBound): string {
  return bound.month === null
    ? String(bound.year)
    : `${bound.year}-${String(bound.month).padStart(2, '0')}`;
}
