/**
 * Interface TwoFactorDisableFormValues
 * @interface TwoFactorDisableFormValues
 *
 * @description
 * Signal Form model of the removal of the second factor: both factors.
 */
export interface TwoFactorDisableFormValues {
  // #region Properties
  /**
   * Property password
   *
   * @description
   * Current password of the administrator (1 to 200 characters, as the contract).
   *
   * @type {string}
   */
  password: string;

  /**
   * Property totp
   *
   * @description
   * Current six-digit code of the authenticator application.
   *
   * @type {string}
   */
  totp: string;
  // #endregion
}
