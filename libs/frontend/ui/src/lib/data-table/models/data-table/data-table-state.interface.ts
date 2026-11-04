import type { DataTableSort } from '@internal/ui/lib/data-table/models/data-table/data-table-sort.interface';

/**
 * Interface DataTableState
 * @interface DataTableState
 *
 * @description
 * Controlled, serialisable view state of a data table, bound with `[(state)]` so that a page can mirror
 * it in its URL. The table never stores rows or functions here.
 */
export interface DataTableState {
  // #region Properties
  /**
   * Property search
   * @readonly
   *
   * @description
   * Text of the global search field; blank keeps every row.
   *
   * @type {string}
   */
  readonly search: string;

  /**
   * Property facets
   * @readonly
   *
   * @description
   * Checked option values per facet id; values of one facet combine with OR, facets with AND. An absent
   * or empty entry leaves the facet open.
   *
   * @type {Readonly<Record<string, readonly string[]>>}
   */
  readonly facets: Readonly<Record<string, readonly string[]>>;

  /**
   * Property sort
   * @readonly
   *
   * @description
   * Sort keys by priority; empty keeps the order of the `data` input. A plain header click keeps one key,
   * Shift+click adds or cycles a secondary key.
   *
   * @type {readonly DataTableSort[]}
   */
  readonly sort: readonly DataTableSort[];

  /**
   * Property page
   * @readonly
   *
   * @description
   * Zero-based requested page; the rendered page is clamped to the available range.
   *
   * @type {number}
   */
  readonly page: number;

  /**
   * Property pageSize
   * @readonly
   *
   * @description
   * Rows per page.
   *
   * @type {number}
   */
  readonly pageSize: number;

  /**
   * Property hidden
   * @readonly
   *
   * @description
   * Ids of the columns hidden through the "Colonnes" menu.
   *
   * @type {readonly string[]}
   */
  readonly hidden: readonly string[];
  // #endregion
}
