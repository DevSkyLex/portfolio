/**
 * Interface CookiePreferences
 * @interface CookiePreferences
 *
 * @description
 * Port of the cookie preferences, bound by the shell to its consent service (D48): the privacy page
 * offers « Gérer les cookies » without reading the shell.
 */
export interface CookiePreferences {
  // #region Properties
  /**
   * Property enabled
   * @readonly
   *
   * @description
   * Whether the site measures its audience, hence has a choice to manage.
   *
   * @type {boolean}
   */
  readonly enabled: boolean;
  // #endregion

  // #region Methods
  /**
   * Method openPreferences
   * @method openPreferences
   *
   * @description
   * Opens the cookie preferences dialog.
   *
   * @returns {void}
   */
  openPreferences(): void;
  // #endregion
}
