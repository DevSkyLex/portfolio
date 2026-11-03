import { Injectable } from '@angular/core';

/**
 * Service RenderIdService
 * @class RenderIdService
 *
 * @description
 * Generates prefix-scoped element ids from counters owned by the application injector.
 * Per-injector state keeps prerendered ids aligned with the browser during hydration.
 */
@Injectable({ providedIn: 'root' })
export class RenderIdService {
  // #region Properties
  /**
   * Property counters
   * @readonly
   *
   * @description
   * Next numeric suffix for each id prefix in this application instance.
   *
   * @type {Map<string, number>}
   */
  private readonly counters: Map<string, number> = new Map<string, number>();
  // #endregion

  // #region Methods
  /**
   * Method next
   * @method next
   *
   * @description
   * Returns the current id for a prefix and advances that prefix's counter independently.
   *
   * @param {string} prefix - String placed before the generated numeric suffix.
   * @returns {string} Unique id for the next use of this prefix in the injector.
   */
  public next(prefix: string): string {
    return `${prefix}${this.nextNumber(prefix)}`;
  }

  /**
   * Method nextNumber
   *
   * @description
   * Allocates a numeric sequence within an application-owned namespace, for linked identifiers.
   *
   * @param {string} prefix - Namespace whose sequence is advanced.
   * @returns {number} Previous sequence value, starting at zero for each application.
   */
  public nextNumber(prefix: string): number {
    const count: number = this.counters.get(prefix) ?? 0;
    this.counters.set(prefix, count + 1);
    return count;
  }
  // #endregion
}
