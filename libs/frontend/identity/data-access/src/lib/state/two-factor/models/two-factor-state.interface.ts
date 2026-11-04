import type { CallState } from '@vfortin/web-http';

/**
 * Interface TwoFactorState
 * @interface TwoFactorState
 *
 * @description
 * Page-scoped state of the second-factor settings. The pending secret is deliberately absent: the
 * page keeps it in its own component state while the enrollment dialog is open.
 */
export interface TwoFactorState {
  // #region Properties
  /**
   * Property enabled
   * @readonly
   *
   * @description
   * Whether the login asks for a one-time code, `null` until the first status answer.
   *
   * @type {boolean | null}
   */
  readonly enabled: boolean | null;

  /**
   * Property loadCallState
   * @readonly
   *
   * @description
   * Status read.
   *
   * @type {CallState}
   */
  readonly loadCallState: CallState;

  /**
   * Property setupCallState
   * @readonly
   *
   * @description
   * Password confirmation that returns a new pending secret.
   *
   * @type {CallState}
   */
  readonly setupCallState: CallState;

  /**
   * Property enableCallState
   * @readonly
   *
   * @description
   * Confirmation of the pending secret with a code.
   *
   * @type {CallState}
   */
  readonly enableCallState: CallState;

  /**
   * Property disableCallState
   * @readonly
   *
   * @description
   * Removal of the second factor with the password and a code.
   *
   * @type {CallState}
   */
  readonly disableCallState: CallState;
  // #endregion
}
