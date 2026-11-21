/**
 * Interface NavItem
 * @interface NavItem
 *
 * @description
 * Site navigation link and its associated home section.
 */
export interface NavItem {
  // #region Properties
  /**
   * Property fragment
   * @readonly
   *
   * @description
   * Home section element ID, the link's fragment and the scroll spy's target.
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

  /**
   * Property optional
   * @readonly
   *
   * @description
   * Whether the section renders only when the content snapshot fills it (`SiteSectionsService`), so
   * that the link is left out otherwise.
   *
   * @type {boolean | undefined}
   */
  readonly optional?: boolean;
  // #endregion
}
