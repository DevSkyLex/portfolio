import type { Clock } from '@vfortin/content-application';

/**
 * Class SystemClock
 * @class SystemClock
 *
 * @description
 * Provides the current system time to application use cases.
 */
export class SystemClock implements Clock {
  // #region Methods
  /**
   * Method now
   * @method now
   *
   * @description
   * Returns the current wall-clock time.
   *
   * @returns {Date} Current system timestamp.
   */
  public now(): Date {
    return new Date();
  }
  // #endregion
}
