/**
 * Interface TwoFactorPasswordFormValues
 * @interface TwoFactorPasswordFormValues
 *
 * @description
 * Signal Form model of the first enrollment step: the current password, asked again.
 */
export interface TwoFactorPasswordFormValues {
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
  // #endregion
}
