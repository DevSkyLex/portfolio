import type { DataTableFacetOption } from '@internal/ui/lib/data-table/models/data-table/data-table-facet-option.interface';

/**
 * Interface DataTableFacetOptionView
 * @interface DataTableFacetOptionView
 *
 * @description
 * Facet option as rendered in its popover: the rows it would match and whether it is checked.
 */
export interface DataTableFacetOptionView extends DataTableFacetOption {
  // #region Properties
  /**
   * Property count
   * @readonly
   *
   * @description
   * Rows matching this option within the search and the other facets.
   *
   * @type {number}
   */
  readonly count: number;

  /**
   * Property selected
   * @readonly
   *
   * @description
   * Whether the option is checked in the state.
   *
   * @type {boolean}
   */
  readonly selected: boolean;
  // #endregion
}
