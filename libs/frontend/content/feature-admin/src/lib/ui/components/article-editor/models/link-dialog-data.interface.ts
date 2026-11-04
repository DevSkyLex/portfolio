/**
 * Interface LinkDialogData
 * @interface LinkDialogData
 *
 * @description
 * Link opened in the link dialog.
 */
export interface LinkDialogData {
  // #region Properties
  /**
   * Property href
   * @readonly
   *
   * @description
   * Current target, empty for a new link.
   *
   * @type {string}
   */
  readonly href: string;

  /**
   * Property removable
   * @readonly
   *
   * @description
   * Whether the selection already holds a link, which the dialog then offers to remove.
   *
   * @type {boolean}
   */
  readonly removable: boolean;
  // #endregion
}
