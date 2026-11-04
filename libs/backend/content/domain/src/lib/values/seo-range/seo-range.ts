import { InvalidValueError } from '@internal/content-domain/lib/errors/domain-error';

/**
 * Constant SEO_RANGES
 *
 * @description
 * Report lengths offered by the SEO dashboard (D47): the last 7, 28 or 90 days of available data.
 */
export const SEO_RANGES = ['7d', '28d', '90d'] as const;

/**
 * Type SeoRange
 * @type SeoRange
 *
 * @description
 * One report length of the SEO dashboard.
 */
export type SeoRange = (typeof SEO_RANGES)[number];

/**
 * Constant SEO_RANGE_DAYS
 *
 * @description
 * Number of calendar days covered by each report length.
 */
export const SEO_RANGE_DAYS: Readonly<Record<SeoRange, number>> = { '7d': 7, '28d': 28, '90d': 90 };

/**
 * Interface DateSpan
 * @interface DateSpan
 *
 * @description
 * Inclusive span of calendar days, both bounds as `YYYY-MM-DD`, the date format of the Google
 * reporting APIs.
 */
export interface DateSpan {
  // #region Properties
  /**
   * Property start
   * @readonly
   *
   * @description
   * First day of the span.
   */
  readonly start: string;

  /**
   * Property end
   * @readonly
   *
   * @description
   * Last day of the span, included.
   */
  readonly end: string;
  // #endregion
}

/**
 * Interface ReportWindow
 * @interface ReportWindow
 *
 * @description
 * Days of one report and of the period just before it, of the same length, for the deltas.
 */
export interface ReportWindow {
  // #region Properties
  /**
   * Property range
   * @readonly
   *
   * @description
   * Report length.
   */
  readonly range: SeoRange;

  /**
   * Property current
   * @readonly
   *
   * @description
   * Reported days.
   */
  readonly current: DateSpan;

  /**
   * Property previous
   * @readonly
   *
   * @description
   * Days just before `current`, as many of them.
   */
  readonly previous: DateSpan;
  // #endregion
}

/**
 * Constant DAY_MS
 *
 * @description
 * One calendar day in milliseconds (UTC days have no daylight saving shift).
 */
const DAY_MS: number = 86_400_000;

/**
 * Function isoDay
 *
 * @description
 * Formats the UTC day of a time as `YYYY-MM-DD`.
 *
 * @param {number} time - Milliseconds since the epoch.
 * @returns {string} Calendar day.
 */
function isoDay(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

/**
 * Function isSeoRange
 *
 * @description
 * Narrows an untrusted value to a report length.
 *
 * @param {unknown} value - Candidate value.
 * @returns {boolean} Whether the value is one of `SEO_RANGES`.
 */
export function isSeoRange(value: unknown): value is SeoRange {
  return SEO_RANGES.some((range: SeoRange): boolean => range === value);
}

/**
 * Function reportWindow
 *
 * @description
 * Computes the days of a report ending `lagDays` before the UTC day of `today`, the delay after
 * which the source's data is complete (Search Console publishes its final figures two to three days
 * late), and the period of the same length just before it.
 *
 * @param {SeoRange} range - Report length.
 * @param {Date} today - Current time.
 * @param {number} lagDays - Whole days between today and the last reported day, 0 or more.
 * @throws {InvalidValueError} When `lagDays` is negative or not an integer.
 * @returns {ReportWindow} Current and previous spans.
 */
export function reportWindow(range: SeoRange, today: Date, lagDays: number): ReportWindow {
  if (!Number.isInteger(lagDays) || lagDays < 0) {
    throw new InvalidValueError('lagDays', 'a whole number of days, 0 or more, expected');
  }
  const days: number = SEO_RANGE_DAYS[range];
  const midnight: number = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const end: number = midnight - lagDays * DAY_MS;
  const start: number = end - (days - 1) * DAY_MS;
  const previousEnd: number = start - DAY_MS;
  return {
    range,
    current: { start: isoDay(start), end: isoDay(end) },
    previous: { start: isoDay(previousEnd - (days - 1) * DAY_MS), end: isoDay(previousEnd) },
  };
}

/**
 * Function spanDays
 *
 * @description
 * Lists every day of a span in order, so that a daily series can show the days without data as
 * zeros.
 *
 * @param {DateSpan} span - Inclusive span.
 * @returns {string[]} Days from `start` to `end`, empty when `end` precedes `start`.
 */
export function spanDays(span: DateSpan): string[] {
  const days: string[] = [];
  const end: number = Date.parse(`${span.end}T00:00:00Z`);
  for (let day: number = Date.parse(`${span.start}T00:00:00Z`); day <= end; day += DAY_MS) {
    days.push(isoDay(day));
  }
  return days;
}
