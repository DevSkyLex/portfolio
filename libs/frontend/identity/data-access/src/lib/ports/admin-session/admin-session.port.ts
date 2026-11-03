import type { Signal } from '@angular/core';
import type { CallState } from '@vfortin/web-http';

/**
 * Class AdminSessionPort
 *
 * @description
 * Session capability published to administration shells, with observable and retryable revocation.
 */
export abstract class AdminSessionPort {
  // #region Properties
  /** Whether this application instance holds an authenticated access session. */
  public abstract readonly authenticated: Signal<boolean>;

  /** Last server revocation attempt, including its normalized failure. */
  public abstract readonly logoutCallState: Signal<CallState>;
  // #endregion

  // #region Methods
  /** Resolves true only when server revocation succeeds; failure keeps local refresh disabled. */
  public abstract logout(): Promise<boolean>;
  // #endregion
}
