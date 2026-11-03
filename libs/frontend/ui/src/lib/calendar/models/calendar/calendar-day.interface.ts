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
   * Whether this day matches the selected model value.
   *
   * @type {boolean}
   */
  readonly selected: boolean;

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
