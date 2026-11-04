import type { TimeParts } from '@internal/ui/lib/time-input/models/time-input/time-parts.interface';
import {
  formatTime,
  parseTime,
} from '@internal/ui/lib/time-input/utils/time-input/time-input.utils';

/**
 * Function withTime
 *
 * @description
 * Local date at a day and a `HH:mm` time; an invalid time gives midnight.
 *
 * @param {Date} day - Day kept from the date (year, month, day of the month).
 * @param {string} time - 24-hour `HH:mm` time.
 * @returns {Date} A new date, seconds and milliseconds at zero.
 */
export function withTime(day: Date, time: string): Date {
  const parts: TimeParts = parseTime(time);
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    parts.hours ?? 0,
    parts.minutes ?? 0,
  );
}

/**
 * Function timeOf
 *
 * @description
 * Local `HH:mm` time of a date.
 *
 * @param {Date | null} date - Date, or `null`.
 * @returns {string} The time, or `''` without a date.
 */
export function timeOf(date: Date | null): string {
  return date ? formatTime({ hours: date.getHours(), minutes: date.getMinutes() }) : '';
}

/**
 * Function isCompleteTime
 *
 * @description
 * Whether a text is a valid 24-hour `HH:mm` time.
 *
 * @param {string} time - Text to check.
 * @returns {boolean} `true` for `'09:30'`, `false` for `''` or `'9:30'`.
 */
export function isCompleteTime(time: string): boolean {
  return formatTime(parseTime(time)) !== '';
}
