/**
 * Constant dataTableColumnWidths
 *
 * @description
 * Pixel bounds and steps of resizable columns (D36): a fixed column resizes within 64 to 640 px unless
 * it sets `minWidth` / `maxWidth`; the fill column (a column without `width`) never narrows below
 * 200 px unless it sets `minWidth`, the table scrolling sideways instead; the arrows move an edge by
 * 16 px, 64 px with Shift. The selection column is 40 px in a framed table (12 px on each side of a
 * 16 px checkbox) and 52 px in a flush one, whose first cell carries the 24 px page gutter.
 *
 * @type {Readonly<{ min: number; max: number; fillMin: number; step: number; largeStep: number; selection: number; flushSelection: number }>}
 */
export const dataTableColumnWidths = {
  min: 64,
  max: 640,
  fillMin: 200,
  step: 16,
  largeStep: 64,
  selection: 40,
  flushSelection: 52,
} as const;
