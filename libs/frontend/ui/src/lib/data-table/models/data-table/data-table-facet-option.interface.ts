/**
 * Interface DataTableFacetOption
 * @interface DataTableFacetOption
 *
 * @description
 * One checkable value of a faceted filter.
 */
export interface DataTableFacetOption {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Value compared with the facet accessor and stored in `DataTableState.facets` (keep it URL-safe).
   *
   * @type {string}
   */
  readonly value: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Text of the option and of its active chip.
   *
   * @type {string}
   */
  readonly label: string;
  // #endregion
}
