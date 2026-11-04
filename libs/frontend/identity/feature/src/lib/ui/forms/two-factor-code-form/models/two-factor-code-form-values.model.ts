/**
 * Interface TwoFactorCodeFormValues
 * @interface TwoFactorCodeFormValues
 *
 * @description
 * Signal Form model of the last enrollment step: a code generated from the pending secret.
 */
export interface TwoFactorCodeFormValues {
  // #region Properties
  /**
   * Property totp
   *
   * @description
   * Six-digit code shown by the authenticator application.
   *
   * @type {string}
   */
  totp: string;
  // #endregion
}
