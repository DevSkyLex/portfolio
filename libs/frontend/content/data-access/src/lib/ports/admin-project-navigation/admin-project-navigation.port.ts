import { type Signal } from '@angular/core';
import type { CallState } from '@vfortin/web-http';
import type { AdminProjectNavigationItem } from '@internal/content-web-data-access/lib/ports/admin-project-navigation/models/admin-project-navigation-item.interface';

/**
 * Class AdminProjectNavigationPort
 *
 * @description
 * Owner-published project navigation capability consumed by administration shells.
 */
export abstract class AdminProjectNavigationPort {
  // #region Properties
  /**
   * Property items
   *
   * @description
   * Navigation projections, independent of the transport DTO.
   */
  public abstract readonly items: Signal<readonly AdminProjectNavigationItem[]>;

  /**
   * Property callState
   *
   * @description
   * Explicit request outcome; failure is never presented as an empty successful search.
   */
  public abstract readonly callState: Signal<CallState>;
  // #endregion

  // #region Methods
  /**
   * Method refresh
   *
   * @description
   * Reloads the owner projection, ignoring obsolete responses.
   * @returns {Promise<void>} Completion after the latest request settles.
   */
  public abstract refresh(): Promise<void>;
  // #endregion
}
