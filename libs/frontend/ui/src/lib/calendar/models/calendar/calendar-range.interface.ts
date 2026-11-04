/**
 * Interface CalendarRange
 * @interface CalendarRange
 *
 * @description
 * Range a `ui-calendar` draws instead of its single value. With a start and no end, the day under the
 * pointer or reached with the keyboard previews the end when it does not precede the start.
 */
export interface CalendarRange {
  // #region Properties
  /**
   * Property start
   * @readonly
   *
   * @description
   * First day of the range, or `null` before anything is chosen.
   *
   * @type {Date | null}
   */
  readonly start: Date | null;

  /**
   * Property end
   * @readonly
   *
   * @description
   * Last day of the range, inclusive; `null` while it is still to choose.
   *
   * @type {Date | null}
   */
  readonly end: Date | null;
  // #endregion
}
