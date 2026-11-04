/**
 * Interface DateRangePickerPrompts
 * @interface DateRangePickerPrompts
 *
 * @description
 * Status lines `ui-date-range-picker` shows under its calendar, in a polite live region, to tell
 * which end of the range the next pick chooses.
 */
export interface DateRangePickerPrompts {
  // #region Properties
  /**
   * Property start
   * @readonly
   *
   * @description
   * Prompt while the next pick chooses the first day.
   *
   * @type {string}
   */
  readonly start: string;

  /**
   * Property end
   * @readonly
   *
   * @description
   * Prompt once the first day is chosen and the next pick chooses the last one.
   *
   * @type {string}
   */
  readonly end: string;
  // #endregion
}
