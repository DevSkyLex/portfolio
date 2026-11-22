import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Injectable,
  PLATFORM_ID,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { ADMIN_PRESENCE_STORAGE_KEY } from '@internal/web-shell/lib/maintenance-preview/constants/maintenance-preview.constants';

/**
 * Service MaintenancePreviewService
 * @class MaintenancePreviewService
 *
 * @description
 * Lets the administrator see the public site while the maintenance mode is on (D56 revision). The
 * admin layout marks this browser while the owner is signed in and unmarks it on logout; the
 * maintenance screen, once rendered, turns the preview on for a marked browser and the site layout
 * shows a banner while it lasts. The mark is a plain flag, never a credential: forging it only reveals
 * the public pages a maintenance hides, which every crawler and visitor still receives as a 503.
 */
@Injectable({ providedIn: 'root' })
export class MaintenancePreviewService {
  // #region Properties
  private readonly storage: Storage | null = isPlatformBrowser(inject<object>(PLATFORM_ID))
    ? (inject<Document>(DOCUMENT).defaultView?.localStorage ?? null)
    : null;

  private readonly previewing: WritableSignal<boolean> = signal<boolean>(false);

  /** Whether this browser shows the site through a maintenance; always false during SSR. */
  public readonly active: Signal<boolean> = this.previewing.asReadonly();
  // #endregion

  // #region Methods
  /** Marks this browser as the administrator's, from the signed-in admin layout. */
  public markAdmin(): void {
    try {
      this.storage?.setItem(ADMIN_PRESENCE_STORAGE_KEY, '1');
    } catch {
      // Storage refused (private mode, quota): the maintenance screen simply stays.
    }
  }

  /** Removes the mark on logout and ends a running preview. */
  public unmarkAdmin(): void {
    try {
      this.storage?.removeItem(ADMIN_PRESENCE_STORAGE_KEY);
    } catch {
      // Nothing was stored.
    }
    this.previewing.set(false);
  }

  /**
   * Turns the preview on when this browser carries the administrator's mark.
   *
   * @returns {boolean} Whether the preview is now on.
   */
  public startIfAdmin(): boolean {
    let marked: boolean = false;
    try {
      marked = this.storage?.getItem(ADMIN_PRESENCE_STORAGE_KEY) === '1';
    } catch {
      marked = false;
    }
    if (marked) this.previewing.set(true);
    return marked;
  }
  // #endregion
}
