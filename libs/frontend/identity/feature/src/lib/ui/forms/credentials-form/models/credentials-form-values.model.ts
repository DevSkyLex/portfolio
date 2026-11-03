/**
 * Interface CredentialsFormValues
 * @interface CredentialsFormValues
 *
 * @description
 * Signal Form model of the first login screen: the administrator credentials and "Se souvenir de moi".
 */
export interface CredentialsFormValues {
  // #region Properties
  /**
   * Property email
   *
   * @description
   * Administrator account e-mail entered in the form.
   *
   * @type {string}
   */
  email: string;

  /**
   * Property password
   *
   * @description
   * Password entered for the administrator account.
   *
   * @type {string}
   */
  password: string;

  /**
   * Property remember
   *
   * @description
   * Whether the session outlives the browser (persistent cookie) or ends with it.
   *
   * @type {boolean}
   */
  remember: boolean;
  // #endregion
}
