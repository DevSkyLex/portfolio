import { Injectable, computed, signal, type Signal, type WritableSignal } from '@angular/core';
import type { SiteLink } from '@vfortin/content-web-model';

/**
 * Service SiteLinksService
 * @class SiteLinksService
 *
 * @description
 * Public links of the profile for the site layout (header menu and footer), which also frames the
 * error pages, rendered without the content snapshot. `SiteContentService` publishes the links once
 * it has read the snapshot, which public routes await before they activate; until then the list is
 * empty and the layout leaves the links out rather than loading the snapshot itself.
 */
@Injectable({ providedIn: 'root' })
export class SiteLinksService {
  // #region Properties
  /**
   * Property current
   * @readonly
   *
   * @description
   * Links last published.
   *
   * @type {WritableSignal<readonly SiteLink[]>}
   */
  private readonly current: WritableSignal<readonly SiteLink[]> = signal<readonly SiteLink[]>([]);

  /**
   * Property links
   * @readonly
   *
   * @description
   * Public links in display order, empty before the snapshot is read.
   *
   * @type {Signal<readonly SiteLink[]>}
   */
  public readonly links: Signal<readonly SiteLink[]> = this.current.asReadonly();

  /**
   * Property email
   * @readonly
   *
   * @description
   * The e-mail link, if any.
   *
   * @type {Signal<SiteLink | null>}
   */
  public readonly email: Signal<SiteLink | null> = computed<SiteLink | null>(
    (): SiteLink | null =>
      this.current().find((link: SiteLink): boolean => link.kind === 'email') ?? null,
  );

  /**
   * Property profiles
   * @readonly
   *
   * @description
   * Every link but the e-mail, in display order.
   *
   * @type {Signal<readonly SiteLink[]>}
   */
  public readonly profiles: Signal<readonly SiteLink[]> = computed<readonly SiteLink[]>(
    (): readonly SiteLink[] =>
      this.current().filter((link: SiteLink): boolean => link.kind !== 'email'),
  );
  // #endregion

  // #region Methods
  /**
   * Method publish
   * @method publish
   *
   * @description
   * Replaces the links; called by `SiteContentService` with the snapshot's.
   *
   * @param {readonly SiteLink[]} links - Links of the snapshot.
   */
  public publish(links: readonly SiteLink[]): void {
    this.current.set(links);
  }
  // #endregion
}
