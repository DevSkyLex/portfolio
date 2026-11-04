import type { TimeParts } from '@internal/ui/lib/time-input/models/time-input/time-parts.interface';
import type { TimeSegment } from '@internal/ui/lib/time-input/models/time-input/time-segment.type';

/**
 * Constant TIME_SEGMENT_MAX
 *
 * @description
 * Largest value of each segment; both start at 0.
 *
 * @type {Readonly<Record<TimeSegment, number>>}
 */
export const TIME_SEGMENT_MAX: Readonly<Record<TimeSegment, number>> = {
  hours: 23,
  minutes: 59,
};

/**
 * Constant TIME_PAGE_STEP
 *
 * @description
 * PageUp / PageDown jumps: 10 minutes, and 4 hours, the same sixth of its cycle as 10 minutes of an
 * hour. The minute jump rounds up to a multiple of `minuteStep` (15 with a quarter-hour step).
 *
 * @type {Readonly<Record<TimeSegment, number>>}
 */
export const TIME_PAGE_STEP: Readonly<Record<TimeSegment, number>> = {
  hours: 4,
  minutes: 10,
};

/**
 * Constant EMPTY_TIME
 *
 * @description
 * Both segments empty: the state of an empty or unparsable value.
 *
 * @type {TimeParts}
 */
export const EMPTY_TIME: TimeParts = { hours: null, minutes: null };
