import { EMPTY_TIME } from '@internal/ui/lib/time-input/constants/time-input.constants';
import type { TimeParts } from '@internal/ui/lib/time-input/models/time-input/time-parts.interface';

/**
 * Constant TIME_PATTERN
 *
 * @description
 * Accepted value: 24-hour `HH:mm`, two digits each.
 *
 * @type {RegExp}
 */
const TIME_PATTERN: RegExp = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Function parseTime
 *
 * @description
 * Splits a `HH:mm` value into its segments; any other text, the empty string included, gives two
 * empty segments.
 *
 * @param {string} value - Bound value.
 * @returns {TimeParts} Hours and minutes, both `null` when the value is not a 24-hour `HH:mm` time.
 */
export function parseTime(value: string): TimeParts {
  const match: RegExpExecArray | null = TIME_PATTERN.exec(value);
  return match ? { hours: Number(match[1]), minutes: Number(match[2]) } : EMPTY_TIME;
}

/**
 * Function formatTime
 *
 * @description
 * Joins complete segments into `HH:mm`.
 *
 * @param {TimeParts} parts - Edited segments.
 * @returns {string} The time, or `''` while a segment is empty.
 */
export function formatTime(parts: TimeParts): string {
  if (parts.hours === null || parts.minutes === null) return '';
  return `${padSegment(parts.hours)}:${padSegment(parts.minutes)}`;
}

/**
 * Function padSegment
 *
 * @description
 * Two-digit text of a segment.
 *
 * @param {number | null} value - Segment value.
 * @returns {string} `'07'` for 7, `''` for an empty segment.
 */
export function padSegment(value: number | null): string {
  return value === null ? '' : String(value).padStart(2, '0');
}

/**
 * Function stepSegment
 *
 * @description
 * Moves a segment by `delta` steps along the multiples of `step` from 0 to `max`, wrapping at both
 * ends. A value between two multiples (typed by hand) first snaps to the next one in the direction
 * of travel; an empty segment starts at 0 going up and at the last multiple going down.
 *
 * @param {number | null} value - Current segment value.
 * @param {number} delta - Signed number of steps.
 * @param {number} step - Positive integer step.
 * @param {number} max - Largest value of the segment.
 * @returns {number} The new segment value.
 */
export function stepSegment(
  value: number | null,
  delta: number,
  step: number,
  max: number,
): number {
  const count: number = Math.floor(max / step) + 1;
  if (value === null) return delta > 0 ? 0 : (count - 1) * step;
  const index: number = delta > 0 ? Math.floor(value / step) : Math.ceil(value / step);
  return ((((index + delta) % count) + count) % count) * step;
}

/**
 * Function minuteStepAttribute
 *
 * @description
 * Input transform of `minuteStep`: an integer from 1 to 59, anything else falls back to 1.
 *
 * @param {unknown} value - Bound or attribute value.
 * @returns {number} The step in minutes.
 */
export function minuteStepAttribute(value: unknown): number {
  const step: number = Number(value);
  return Number.isInteger(step) && step >= 1 && step <= 59 ? step : 1;
}
