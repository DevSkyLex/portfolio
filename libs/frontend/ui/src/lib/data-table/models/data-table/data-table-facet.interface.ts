import type { DataTableFacetOption } from '@internal/ui/lib/data-table/models/data-table/data-table-facet-option.interface';

/**
 * Interface DataTableFacet
 * @interface DataTableFacet
 *
 * @description
 * Faceted filter offered in the table toolbar: a button opening its checkable options with their counts.
 *
 * @template T - Row model accepted by the table.
 */
export interface DataTableFacet<T> {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Key of the facet in `DataTableState.facets`, usually the id of the column it filters.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Button text and chip prefix ("Statut").
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property icon
   * @readonly
   *
   * @description
   * ng-icons glyph of the facet button, naming what it filters; the generic filter glyph when absent.
   *
   * @type {string | undefined}
   */
  readonly icon?: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Value or values of a row for this facet (several for a multi-valued field such as tags); a row
   * matches when one of them is checked.
   *
   * @type {(row: T) => string | readonly string[]}
   */
  readonly value: (row: T) => string | readonly string[];

  /**
   * Property options
   * @readonly
   *
   * @description
   * Options in display order; derived from the distinct values of the data, sorted, when absent.
   *
   * @type {readonly DataTableFacetOption[] | undefined}
   */
  readonly options?: readonly DataTableFacetOption[];
  // #endregion
}
