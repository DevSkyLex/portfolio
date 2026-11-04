import type { YearMonth } from '@vfortin/content-web-data-access/admin';
import { TIMELINE_MONTHS } from '@internal/content-web-feature-admin/lib/constants/timeline-months.constants';

/**
 * Function monthLabel
 *
 * @description
 * Short month and year in the admin's language: « janv. 2022 ».
 *
 * @param {YearMonth} value - Month.
 *
 * @returns {string} Label.
 */
function monthLabel(value: YearMonth): string {
  const month: string = TIMELINE_MONTHS[value.month - 1]?.short ?? String(value.month);
  return `${month} ${value.year}`;
}

/**
 * Function timelinePeriod
 *
 * @description
 * Period of a timeline entry as the list shows it: « janv. 2022 – juin 2023 », « janv. 2022 –
 * aujourd’hui » while ongoing, and a single month when it starts and ends in the same month.
 *
 * @param {YearMonth} start - First month.
 * @param {YearMonth | null} end - Last month, or `null` while ongoing.
 *
 * @returns {string} Period label.
 */
export function timelinePeriod(start: YearMonth, end: YearMonth | null): string {
  if (end === null)
    return $localize`:@@admin.timeline.period.ongoing:${monthLabel(start)}:start: – aujourd’hui`;
  if (end.year === start.year && end.month === start.month) return monthLabel(start);
  return `${monthLabel(start)} – ${monthLabel(end)}`;
}
