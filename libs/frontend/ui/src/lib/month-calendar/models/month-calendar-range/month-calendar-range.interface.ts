import type { PeriodBound } from '@internal/ui/lib/month-calendar/models/period-bound/period-bound.interface';

/**
 * Interface MonthCalendarRange
 *
 * @description
 * Range a month calendar highlights. With a start and no end, the cell under the pointer or the
 * keyboard focus previews the end; an ongoing range runs from its start to the current month.
 */
export interface MonthCalendarRange {
  /**
   * Property start
   *
   * @description
   * First bound, or `null` before anything is chosen.
   *
   * @type {PeriodBound | null}
   */
  readonly start: PeriodBound | null;

  /**
   * Property end
   *
   * @description
   * Last bound, inclusive; `null` while it is still to choose or for an ongoing range.
   *
   * @type {PeriodBound | null}
   */
  readonly end: PeriodBound | null;

  /**
   * Property ongoing
   *
   * @description
   * Whether the range has no end: it is drawn up to the current month and previews nothing.
   *
   * @type {boolean | undefined}
   */
  readonly ongoing?: boolean;
}
