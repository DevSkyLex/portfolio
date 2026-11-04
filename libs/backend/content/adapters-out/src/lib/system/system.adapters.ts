import type { Clock, IdGenerator } from '@vfortin/content-application';
import { randomUUID } from 'node:crypto';

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

/**
 * Class RandomIdGenerator
 * @class RandomIdGenerator
 *
 * @description
 * Generates unguessable identifiers using Node's cryptographic UUID implementation.
 */
export class RandomIdGenerator implements IdGenerator {
  // #region Methods
  /**
   * Method next
   * @method next
   *
   * @description
   * Creates a new random (version 4) UUID.
   *
   * @returns {string} Generated UUID.
   */
  public next(): string {
    return randomUUID();
  }
  // #endregion
}
