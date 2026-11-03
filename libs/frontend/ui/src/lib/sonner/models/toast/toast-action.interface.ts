/**
 * Interface ToastAction
 * @interface ToastAction
 *
 * @description
 * Button action displayed with a toast and invoked before the toast is dismissed.
 */
export interface ToastAction {
  // #region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Visible and accessible button text for the action.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property onClick
   * @readonly
   *
   * @description
   * Callback invoked when the user activates the action button.
   *
   * @type {() => void}
   */
  readonly onClick: () => void;
  // #endregion
}
