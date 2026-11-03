/**
 * Interface Countdown
 * @interface Countdown
 *
 * @description
 * Internal timer state needed to pause and resume a toast's remaining lifetime.
 */
export interface Countdown {
  // #region Properties
  /**
   * Property remaining
   *
   * @description
   * Milliseconds left before the toast is dismissed.
   *
   * @type {number}
   */
  remaining: number;

  /**
   * Property startedAt
   *
   * @description
   * Epoch time when the current countdown interval began.
   *
   * @type {number}
   */
  startedAt: number;

  /**
   * Property handle
   *
   * @description
   * Active timeout handle, absent before the countdown starts.
   *
   * @type {ReturnType<typeof setTimeout> | undefined}
   */
  handle?: ReturnType<typeof setTimeout>;
  // #endregion
}
