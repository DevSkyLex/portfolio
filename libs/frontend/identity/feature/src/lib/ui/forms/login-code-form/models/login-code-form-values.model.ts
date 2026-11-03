/**
 * Interface LoginCodeFormValues
 * @interface LoginCodeFormValues
 *
 * @description
 * Signal Form model of the second login screen: the one-time code and "Faire confiance à cet appareil".
 */
export interface LoginCodeFormValues {
  // #region Properties
  /**
   * Property totp
   *
   * @description
   * Six-digit code from the administrator's authenticator application.
   *
   * @type {string}
   */
  totp: string;

  /**
   * Property trustDevice
   *
   * @description
   * Whether this browser skips the code at the next logins (30 days).
   *
   * @type {boolean}
   */
  trustDevice: boolean;
  // #endregion
}
