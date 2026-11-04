/**
 * Interface DataTableColumnToggle
 * @interface DataTableColumnToggle
 *
 * @description
 * Hideable column as listed in the "Colonnes" menu.
 */
export interface DataTableColumnToggle {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Column id.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property header
   * @readonly
   *
   * @description
   * Column heading.
   *
   * @type {string}
   */
  readonly header: string;

  /**
   * Property visible
   * @readonly
   *
   * @description
   * Whether the column is shown.
   *
   * @type {boolean}
   */
  readonly visible: boolean;
  // #endregion
}
