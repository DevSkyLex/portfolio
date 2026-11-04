/**
 * Interface AdminLink
 * @interface AdminLink
 *
 * @description
 * Administration section offered by the sidebar and the command palette.
 */
export interface AdminLink {
  // #region Properties
  /**
   * Property path
   * @readonly
   *
   * @description
   * Absolute admin path of the section.
   *
   * @type {string}
   */
  readonly path: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Localized label of the section (French source, English target).
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property icon
   * @readonly
   *
   * @description
   * Lucide SVG shown before the label.
   *
   * @type {string}
   */
  readonly icon: string;
  // #endregion
}
