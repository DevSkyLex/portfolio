/**
 * Interface NavItem
 * @interface NavItem
 *
 * @description
 * Site navigation section anchor, localized label, and aurora hue used by the header progress line.
 */
export interface NavItem {
  // #region Properties
  /**
   * Property fragment
   * @readonly
   *
   * @description
   * Section element id targeted by the navigation link and scroll spy.
   *
   * @type {string}
   */
  readonly fragment: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Localized text rendered for this navigation item.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property hue
   * @readonly
   *
   * @description
   * CSS color value applied to the header progress indicator while this section is active.
   *
   * @type {string}
   */
  readonly hue: string;
  // #endregion
}
