import type { DataTableFacetOptionView } from '@internal/ui/lib/data-table/models/data-table/data-table-facet-option-view.interface';

/**
 * Interface DataTableFacetView
 * @interface DataTableFacetView
 *
 * @description
 * Facet as rendered in the toolbar: its label and counted options.
 */
export interface DataTableFacetView {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Facet key in the state.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Button text and chip prefix.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property icon
   * @readonly
   *
   * @description
   * ng-icons glyph of the facet button, when the facet declares one.
   *
   * @type {string | undefined}
   */
  readonly icon?: string;

  /**
   * Property options
   * @readonly
   *
   * @description
   * Options in display order with their counts.
   *
   * @type {readonly DataTableFacetOptionView[]}
   */
  readonly options: readonly DataTableFacetOptionView[];
  // #endregion
}
