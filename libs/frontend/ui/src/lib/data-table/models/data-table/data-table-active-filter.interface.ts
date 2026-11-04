/**
 * Interface DataTableActiveFilter
 * @interface DataTableActiveFilter
 *
 * @description
 * Checked facet value shown as a removable chip in the toolbar.
 */
export interface DataTableActiveFilter {
  // #region Properties
  /**
   * Property facet
   * @readonly
   *
   * @description
   * Facet id.
   *
   * @type {string}
   */
  readonly facet: string;

  /**
   * Property facetLabel
   * @readonly
   *
   * @description
   * Facet label, the chip prefix.
   *
   * @type {string}
   */
  readonly facetLabel: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Checked value.
   *
   * @type {string}
   */
  readonly value: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Option label of the value, or the value itself when no option declares it (a URL value).
   *
   * @type {string}
   */
  readonly label: string;
  // #endregion
}
