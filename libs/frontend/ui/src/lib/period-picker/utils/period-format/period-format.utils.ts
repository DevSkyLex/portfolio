import type { PeriodBound } from '@internal/ui/lib/month-calendar/models/period-bound/period-bound.interface';
import type { Period } from '@internal/ui/lib/period-picker/models/period/period.interface';

/**
 * Function boundDate
 *
 * @description
 * First day of a bound in local time (January for a whole year).
 *
 * @param {PeriodBound} bound - Bound.
 *
 * @returns {Date} Date.
 */
function boundDate(bound: PeriodBound): Date {
  return new Date(bound.year, (bound.month ?? 1) - 1, 1);
}

/**
 * Function formatPeriod
 *
 * @description
 * Locale label of a period with `Intl.DateTimeFormat#formatRange`, which shares what both ends have
 * in common (« mars – avril 2023 », « 2023–2026 », « mars 2023 »); months show only when both ends
 * carry one. An ongoing period reads through `since` (« Depuis juillet 2026 »).
 *
 * @param {Period} period - Period.
 * @param {string} locale - BCP 47 locale.
 * @param {(start: string) => string} since - Wording of an ongoing period around its start label.
 *
 * @returns {string} Label, lower case where the locale writes month names so.
 */
export function formatPeriod(
  period: Period,
  locale: string,
  since: (start: string) => string,
): string {
  const { start, end } = period;
  const months: boolean = start.month !== null && (end === null || end.month !== null);
  const format: Intl.DateTimeFormat = new Intl.DateTimeFormat(
    locale,
    months ? { month: 'long', year: 'numeric' } : { year: 'numeric' },
  );
  if (end === null) return since(format.format(boundDate(start)));
  return format.formatRange(boundDate(start), boundDate(end));
}
