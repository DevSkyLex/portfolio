/**
 * Interface CalendarDay
 * @interface CalendarDay
 *
 * @description
 * Display and interaction state for one date cell in the calendar grid.
 */
export interface CalendarDay {
  // #region Properties
  /**
   * Property date
   * @readonly
   *
   * @description
   * Local date represented by this grid cell.
   *
   * @type {Date}
   */
  readonly date: Date;

  /**
   * Property key
   * @readonly
   *
   * @description
   * Local date key used for the host's data attribute and cell lookup.
   *
   * @type {string}
   */
  readonly key: string;

  /**
   * Property number
   * @readonly
   *
   * @description
   * Locale-formatted day number displayed in the cell.
   *
   * @type {string}
   */
  readonly number: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Locale-formatted full date announced for the cell.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property selected
   * @readonly
   *
   * @description
   * Whether this day matches the selected model value or, in range mode, is an end of the drawn
   * range.
   *
   * @type {boolean}
   */
  readonly selected: boolean;

  /**
   * Property rangeStart
   * @readonly
   *
   * @description
   * Whether this day is the first day of the drawn range (committed or previewed).
   *
   * @type {boolean}
   */
  readonly rangeStart: boolean;

  /**
   * Property rangeEnd
   * @readonly
   *
   * @description
   * Whether this day is the last day of the drawn range; also true on the start of a one-day range
   * or of a range whose end is not chosen nor previewed yet.
   *
   * @type {boolean}
   */
  readonly rangeEnd: boolean;

  /**
   * Property inRange
   * @readonly
   *
   * @description
   * Whether this day lies strictly between the ends of the drawn range.
   *
   * @type {boolean}
   */
  readonly inRange: boolean;

  /**
   * Property focused
   * @readonly
   *
   * @description
   * Whether this day is the current roving-tab-stop date.
   *
   * @type {boolean}
   */
  readonly focused: boolean;

  /**
   * Property today
   * @readonly
   *
   * @description
   * Whether this date matches the current local day.
   *
   * @type {boolean}
   */
  readonly today: boolean;

  /**
   * Property outside
   * @readonly
   *
   * @description
   * Whether this day belongs to an adjacent month included to complete the week row.
   *
   * @type {boolean}
   */
  readonly outside: boolean;

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Whether selection is unavailable because of bounds, component state, or the custom rule.
   *
   * @type {boolean}
   */
  readonly disabled: boolean;
  // #endregion
}
