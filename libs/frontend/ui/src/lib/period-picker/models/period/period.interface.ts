import type { PeriodBound } from '@internal/ui/lib/month-calendar/models/period-bound/period-bound.interface';

/**
 * Interface Period
 *
 * @description
 * Value of `ui-period-picker`: a start and an inclusive end, months or whole years; a `null` end
 * means ongoing.
 */
export interface Period {
  /**
   * Property start
   *
   * @description
   * First month or year.
   *
   * @type {PeriodBound}
   */
  readonly start: PeriodBound;

  /**
   * Property end
   *
   * @description
   * Last month or year, inclusive, or `null` while the period is ongoing.
   *
   * @type {PeriodBound | null}
   */
  readonly end: PeriodBound | null;
}
