import { Injectable, signal, type Signal, type WritableSignal } from '@angular/core';

/**
 * Service SiteSectionsService
 * @class SiteSectionsService
 *
 * @description
 * Optional home sections the content snapshot fills (the FAQ, absent while it has no question), so
 * that the site layout links only to sections that render. `SiteContentService` publishes them once it
 * has read the snapshot, the way it hands over the links (`SiteLinksService`); a page rendered without
 * the snapshot (error pages) lists none.
 */
@Injectable({ providedIn: 'root' })
export class SiteSectionsService {
  // #region Properties
  /**
   * Property current
   * @readonly
   *
   * @description
   * Fragment identifiers of the optional sections published so far.
   *
   * @type {WritableSignal<readonly string[]>}
   */
  private readonly current: WritableSignal<readonly string[]> = signal<readonly string[]>([]);

  /**
   * Property optional
   * @readonly
   *
   * @description
   * Fragment identifiers of the optional sections the snapshot fills.
   *
   * @type {Signal<readonly string[]>}
   */
  public readonly optional: Signal<readonly string[]> = this.current.asReadonly();
  // #endregion

  // #region Methods
  /**
   * Method publish
   * @method publish
   *
   * @description
   * Replaces the optional sections the snapshot fills.
   *
   * @param {readonly string[]} fragments - Fragment identifiers of the filled optional sections.
   */
  public publish(fragments: readonly string[]): void {
    this.current.set(fragments);
  }
  // #endregion
}
