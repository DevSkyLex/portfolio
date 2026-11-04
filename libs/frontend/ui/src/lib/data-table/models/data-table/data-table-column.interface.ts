import type { CellValue } from '@internal/ui/lib/data-table/models/data-table/cell-value.type';

/**
 * Interface DataTableColumn
 * @interface DataTableColumn
 *
 * @description
 * Rendering, alignment, search, sorting and visibility configuration for one column of a generic data
 * table.
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
   * Stable column key used by the sort and visibility state and by custom cell templates.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property header
   * @readonly
   *
   * @description
   * Text rendered as the column heading and in the "Colonnes" menu.
   *
   * @type {string}
   */
  readonly header: string;

  /**
   * Property headerHidden
   * @readonly
   *
   * @description
   * Keeps the heading for assistive technologies only (an actions column).
   *
   * @type {boolean | undefined}
   */
  readonly headerHidden?: boolean;

  /**
   * Property cell
   * @readonly
   *
   * @description
   * Displayed value; a matching `uiDataTableCell` template replaces its rendering.
   *
   * @type {((row: T) => CellValue) | undefined}
   */
  readonly cell?: (row: T) => CellValue;

  /**
   * Property searchValue
   * @readonly
   *
   * @description
   * Text matched by the default search; defaults to the displayed cell value. Ignored when the table
   * receives a `searchPredicate`.
   *
   * @type {((row: T) => CellValue | readonly CellValue[]) | undefined}
   */
  readonly searchValue?: (row: T) => CellValue | readonly CellValue[];

  /**
   * Property searchable
   * @readonly
   *
   * @description
   * Set to `false` to leave the column out of the default search.
   *
   * @type {boolean | undefined}
   */
  readonly searchable?: boolean;

  /**
   * Property sortValue
   * @readonly
   *
   * @description
   * Value compared for sorting; defaults to the displayed cell value.
   *
   * @type {((row: T) => CellValue) | undefined}
   */
  readonly sortValue?: (row: T) => CellValue;

  /**
   * Property sortable
   * @readonly
   *
   * @description
   * Whether the header is a sort button.
   *
   * @type {boolean | undefined}
   */
  readonly sortable?: boolean;

  /**
   * Property hideable
   * @readonly
   *
   * @description
   * Set to `false` to keep the column out of the "Colonnes" menu (the row title, the actions).
   *
   * @type {boolean | undefined}
   */
  readonly hideable?: boolean;

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
   * Additional classes applied to this column's header and body cells (width, responsive hiding).
   *
   * @type {string | undefined}
   */
  readonly class?: string;

  /**
   * Property width
   * @readonly
   *
   * @description
   * Width in pixels of a fixed column when the table's columns are resizable (its fixed layout ignores
   * the width classes), the one it resets to. The first visible column without one is the fill
   * column: it takes the room the others leave and has no resize handle.
   *
   * @type {number | undefined}
   */
  readonly width?: number;

  /**
   * Property resizable
   * @readonly
   *
   * @description
   * Set to `false` to keep a column at its width in a table with `resizableColumns` (the actions).
   *
   * @type {boolean | undefined}
   */
  readonly resizable?: boolean;

  /**
   * Property minWidth
   * @readonly
   *
   * @description
   * Narrowest width in pixels a resize reaches; 64 by default. For the fill column, the width below
   * which the table scrolls sideways instead of narrowing it; 200 by default.
   *
   * @type {number | undefined}
   */
  readonly minWidth?: number;

  /**
   * Property maxWidth
   * @readonly
   *
   * @description
   * Widest width in pixels a resize reaches; 640 by default.
   *
   * @type {number | undefined}
   */
  readonly maxWidth?: number;
  // #endregion
}
