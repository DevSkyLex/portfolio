import type { CellValue } from '@internal/ui/lib/data-table/models/data-table/cell-value.type';

/**
 * Interface DataTableColumn
 * @interface DataTableColumn
 *
 * @description
 * Rendering, alignment and sorting configuration for one column in a generic data table.
 *
 * @template T - Row model accepted by the table.
 */
export interface DataTableColumn<T> {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable column key used by sort state and custom cell templates.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property header
   * @readonly
   *
   * @description
   * Text rendered as the column heading.
   *
   * @type {string}
   */
  readonly header: string;

  /**
   * Property cell
   * @readonly
   *
   * @description
   * Displayed and filtered value; a matching `uiDataTableCell` template replaces its rendering.
   *
   * @type {(row: T) => CellValue | undefined}
   */
  readonly cell?: (row: T) => CellValue;

  /**
   * Property sortValue
   * @readonly
   *
   * @description
   * Value compared for sorting; defaults to the displayed cell value.
   *
   * @type {(row: T) => CellValue | undefined}
   */
  readonly sortValue?: (row: T) => CellValue;

  /**
   * Property sortable
   * @readonly
   *
   * @description
   * Whether the table exposes sorting controls for this column.
   *
   * @type {boolean | undefined}
   */
  readonly sortable?: boolean;

  /**
   * Property align
   * @readonly
   *
   * @description
   * Horizontal alignment applied to the column header and cells.
   *
   * @type {'start' | 'center' | 'end' | undefined}
   */
  readonly align?: 'start' | 'center' | 'end';

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes applied to this column's header and body cells.
   *
   * @type {string | undefined}
   */
  readonly class?: string;
  // #endregion
}
