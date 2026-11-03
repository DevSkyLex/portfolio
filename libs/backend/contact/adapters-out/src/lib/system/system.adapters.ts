import type { Clock, IdGenerator } from '@vfortin/contact-application';
import { randomUUID } from 'node:crypto';

/**
 * Class SystemClock
 * @class SystemClock
 *
 * @description
 * Supplies the current wall-clock instant to contact application use cases.
 */
export class SystemClock implements Clock {
  // #region Methods
  /**
   * Method now
   * @method now
   *
   * @description
   * Reads the current system time when called.
   * @returns {Date} Current wall-clock instant.
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
 * Generates opaque identifiers using Node's cryptographic UUID implementation.
 */
export class RandomIdGenerator implements IdGenerator {
  // #region Methods
  /**
   * Method next
   * @method next
   *
   * @description
   * Creates a new random UUID for a contact message or notification job.
   * @returns {string} Generated UUID.
   */
  public next(): string {
    return randomUUID();
  }
  // #endregion
}
