import type { PeriodBound } from '@internal/ui/lib/month-calendar/models/period-bound/period-bound.interface';

/**
 * Interface MonthCalendarCell
 *
 * @description
 * Display and interaction state of one month or year cell.
 */
export interface MonthCalendarCell {
  /**
   * Property bound
   *
   * @description
   * Month or year the cell stands for.
   *
   * @type {PeriodBound}
   */
  readonly bound: PeriodBound;

  /**
   * Property key
   *
   * @description
   * Stable key (`yyyy` or `yyyy-mm`), also the `data-cell` attribute used to focus the cell.
   *
   * @type {string}
   */
  readonly key: string;

  /**
   * Property text
   *
   * @description
   * Visible label: the short month name or the year.
   *
   * @type {string}
   */
  readonly text: string;

  /**
   * Property label
   *
   * @description
   * Accessible name: the full month and year, or the year.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property selected
   *
   * @description
   * Whether the cell is the chosen value or an end of the range.
   *
   * @type {boolean}
   */
  readonly selected: boolean;

  /**
   * Property inRange
   *
   * @description
   * Whether the cell lies strictly inside the range or its preview.
   *
   * @type {boolean}
   */
  readonly inRange: boolean;

  /**
   * Property focused
   *
   * @description
   * Whether the cell holds the grid's roving tab stop.
   *
   * @type {boolean}
   */
  readonly focused: boolean;

  /**
   * Property current
   *
   * @description
   * Whether the cell is the current month or year.
   *
   * @type {boolean}
   */
  readonly current: boolean;

  /**
   * Property disabled
   *
   * @description
   * Whether the cell lies outside the bounds or the control is disabled.
   *
   * @type {boolean}
   */
  readonly disabled: boolean;
}
