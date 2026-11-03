import { Injectable } from '@angular/core';

/**
 * Service SessionAuthorityService
 *
 * @description
 * Lightweight request-origin authority shared by the lazy session store and HTTP entry point.
 * Capturing authority never loads NgRx or starts a refresh request.
 */
@Injectable({ providedIn: 'root' })
export class SessionAuthorityService {
  // #region Properties
  /** Monotonic authority generation for this application instance. */
  private value: number = 0;
  // #endregion

  // #region Methods
  /** Returns the generation owning a newly initiated request. */
  public capture(): number {
    return this.value;
  }

  /** Invalidates requests originating from the previous login/logout authority. */
  public invalidate(): void {
    this.value++;
  }
  // #endregion
}
