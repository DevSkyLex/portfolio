/**
 * Interface Credentials
 * @interface Credentials
 *
 * @description
 * First login step: the administrator credentials and whether the session outlives the browser.
 */
export interface Credentials {
  // #region Properties
  /**
   * Property email
   *
   * @description
   * Administrator account e-mail.
   *
   * @type {string}
   */
  readonly email: string;

  /**
   * Property password
   *
   * @description
   * Administrator password.
   *
   * @type {string}
   */
  readonly password: string;

  /**
   * Property remember
   *
   * @description
   * "Se souvenir de moi": a persistent session instead of one that ends with the browser.
   *
   * @type {boolean}
   */
  readonly remember: boolean;
  // #endregion
}
