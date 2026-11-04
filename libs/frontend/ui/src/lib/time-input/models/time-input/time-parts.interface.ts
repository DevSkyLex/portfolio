/**
 * Interface TimeParts
 * @interface TimeParts
 *
 * @description
 * Segments of a 24-hour time being edited; a `null` segment is empty, and the time is complete only
 * when both segments hold a value.
 */
export interface TimeParts {
  // #region Properties
  /**
   * Property hours
   * @readonly
   *
   * @description
   * Hour of the day, 0 to 23, or `null` while empty.
   *
   * @type {number | null}
   */
  readonly hours: number | null;

  /**
   * Property minutes
   * @readonly
   *
   * @description
   * Minute of the hour, 0 to 59, or `null` while empty.
   *
   * @type {number | null}
   */
  readonly minutes: number | null;
  // #endregion
}
