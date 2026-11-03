import type { CallState } from '@vfortin/web-http';

/**
 * Interface SessionState
 * @interface SessionState
 *
 * @description
 * In-memory administrator session data; the refresh credential remains in an HttpOnly cookie.
 */
export interface SessionState {
  /** Revocation request result; failure remains visible while the browser stays locally signed out. */
  readonly logoutCallState: CallState;
  // #region Properties
  /**
   * Property accessToken
   * @readonly
   *
   * @description
   * Short-lived bearer token held only in application memory.
   *
   * @type {string | null}
   */
  readonly accessToken: string | null;

  /**
   * Property expiresAt
   * @readonly
   *
   * @description
   * Access token expiration time in Unix milliseconds, or `null` without a session.
   *
   * @type {number | null}
   */
  readonly expiresAt: number | null;
  // #endregion
}
