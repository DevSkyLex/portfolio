import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/**
 * Service ExternalNavigationService
 * @class ExternalNavigationService
 *
 * @description
 * Leaves the administration for another site: the consent page sends the browser back to the MCP
 * client with `location.assign` (D45), outside the router. A plain navigation, not a form post, so the
 * CSP `form-action 'self'` never applies to the client's redirect URI.
 */
@Injectable({ providedIn: 'root' })
export class ExternalNavigationService {
  // #region Properties
  /**
   * Property document
   * @readonly
   *
   * @description
   * Document whose window navigates.
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);
  // #endregion

  // #region Methods
  /**
   * Method assign
   * @method assign
   *
   * @description
   * Navigates the window to an absolute URL already checked by the caller.
   *
   * @param {string} url - Destination.
   */
  public assign(url: string): void {
    this.document.defaultView?.location.assign(url);
  }
  // #endregion
}
