import type { DataTableColumn } from '@internal/ui/lib/data-table/models/data-table/data-table-column.interface';

/**
 * Function storedColumnWidths
 *
 * @description
 * Parses the column widths a table stored for this viewer: a JSON object of column ids to pixel
 * widths. Anything else (absent, malformed, a non-object) gives no width, and an entry that is not a
 * finite positive number is dropped; the bounds of each column are applied where the widths are used.
 *
 * @param {string | null} raw - Stored text.
 * @returns {ReadonlyMap<string, number>} Widths by column id, rounded to the pixel.
 */
export function storedColumnWidths(raw: string | null): ReadonlyMap<string, number> {
  if (!raw) return new Map<string, number>();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return new Map<string, number>();
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return new Map<string, number>();
  }
  return new Map<string, number>(
    Object.entries(parsed as Record<string, unknown>).flatMap(
      ([id, width]: [string, unknown]): [string, number][] =>
        typeof width === 'number' && Number.isFinite(width) && width > 0
          ? [[id, Math.round(width)]]
          : [],
    ),
  );
}

/**
 * Function clampWidth
 *
 * @description
 * Restricts a column width to its inclusive bounds, rounded to the pixel.
 *
 * @param {number} width - Candidate width in pixels.
 * @param {number} min - Lower bound in pixels.
 * @param {number} max - Upper bound in pixels.
 * @returns {number} Width within the bounds.
 */
export function clampWidth(width: number, min: number, max: number): number {
  return Math.round(Math.min(Math.max(width, min), Math.max(min, max)));
}

/**
 * Function keptColumnWidths
 *
 * @description
 * Widths of a table's resizable columns among those it stored: an entry only counts for a column that
 * still exists, has a `width` and does not opt out (`resizable: false`), within that column's bounds.
 * A width stored for the fill column (no `width`) or for a removed column is dropped, so that the
 * remainder always goes to the fill column.
 *
 * @param {ReadonlyMap<string, number>} stored - Widths by column id, as stored.
 * @param {readonly C[]} columns - Column definitions.
 * @param {(column: C) => { readonly min: number; readonly max: number }} bounds - Bounds of a column.
 * @param {boolean} pinned - Whether a pinned spread layout (`distributeColumns`) keeps the widths of the
 * columns that do not resize too.
 * @returns {ReadonlyMap<string, number>} Kept widths by column id.
 */
export function keptColumnWidths<
  C extends Pick<DataTableColumn<never>, 'id' | 'width' | 'resizable'>,
>(
  stored: ReadonlyMap<string, number>,
  columns: readonly C[],
  bounds: (column: C) => { readonly min: number; readonly max: number },
  pinned: boolean = false,
): ReadonlyMap<string, number> {
  const kept: Map<string, number> = new Map<string, number>();
  for (const column of columns) {
    const width: number | undefined = stored.get(column.id);
    if (
      width === undefined ||
      column.width === undefined ||
      (column.resizable === false && !pinned)
    )
      continue;
    const { min, max }: { readonly min: number; readonly max: number } = bounds(column);
    kept.set(column.id, clampWidth(width, min, max));
  }
  return kept;
}

/**
 * Function resizeDirection
 *
 * @description
 * Sign turning a horizontal pointer or arrow move into a width change: a handle on a column's end edge
 * widens it when moved towards the end, one on its start edge when moved towards the start, and the
 * end lies on the left in right-to-left text.
 *
 * @param {'start' | 'end'} side - Edge of the column carrying the handle.
 * @param {boolean} rtl - Whether the table runs right to left.
 * @returns {1 | -1} `1` when a rightward move widens the column.
 */
export function resizeDirection(side: 'start' | 'end', rtl: boolean): 1 | -1 {
  return (side === 'end') !== rtl ? 1 : -1;
}

/**
 * Function contentWidth
 *
 * @description
 * Width a cell needs to show its content on one line: the farthest reach of its text and of its
 * content-sized elements (inline-level, replaced, flex or grid items: badges, buttons, icons),
 * measured from the cell's start edge, plus its end padding. Any other block-level box stretches to
 * the column, so it only counts through its content, or through its scroll width when it clips an
 * overflow (a truncated label, a row of badges cut by its wrapper). Elements matching `skip` (the
 * resize handle) are left out with their content, and so are boxes that are not rendered. Measure
 * with the content unwrapped (`white-space: nowrap`) and the column wide enough for its shrinking
 * items to take their size.
 *
 * @param {HTMLElement} cell - Heading or body cell.
 * @param {boolean} rtl - Whether the table runs right to left.
 * @param {string} skip - Selector of the elements left out.
 * @returns {number} Pixels, rounded up.
 */
export function contentWidth(cell: HTMLElement, rtl: boolean, skip: string): number {
  const box: DOMRect = cell.getBoundingClientRect();
  const style: CSSStyleDeclaration = getComputedStyle(cell);
  let reach: number = parseFloat(rtl ? style.paddingRight : style.paddingLeft) || 0;
  const end: number = parseFloat(rtl ? style.paddingLeft : style.paddingRight) || 0;
  const extend = (rect: DOMRect, scroll: number): void => {
    if (rect.width === 0 && rect.height === 0) return;
    const offset: number = rtl ? box.right - rect.right : rect.left - box.left;
    reach = Math.max(reach, offset + Math.max(rect.width, scroll));
  };
  const doc: Document = cell.ownerDocument;
  const range: Range = doc.createRange();
  const walker: TreeWalker = doc.createTreeWalker(
    cell,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node: Node): number =>
        node instanceof Element && node.matches(skip)
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT,
    },
  );
  for (let node: Node | null = walker.nextNode(); node; node = walker.nextNode()) {
    if (node instanceof Element) {
      const own: CSSStyleDeclaration = getComputedStyle(node);
      const overflow: string = own.overflowX || own.overflow || 'visible';
      const clipped: boolean = overflow !== 'visible' && node.scrollWidth > node.clientWidth;
      const scroll: number = clipped ? node.scrollWidth : 0;
      const parent: string = node.parentElement ? getComputedStyle(node.parentElement).display : '';
      // Inline-level boxes, replaced ones and flex or grid items take the size of their content.
      if (
        own.display.startsWith('inline') ||
        node instanceof SVGElement ||
        parent.endsWith('flex') ||
        parent.endsWith('grid')
      ) {
        extend(node.getBoundingClientRect(), scroll);
      } else if (clipped) {
        const rect: DOMRect = node.getBoundingClientRect();
        extend(
          new DOMRect(rtl ? rect.right - scroll : rect.left, rect.top, scroll, rect.height),
          0,
        );
      }
    } else if (node.textContent?.trim() && typeof range.getBoundingClientRect === 'function') {
      range.selectNodeContents(node);
      extend(range.getBoundingClientRect(), 0);
    }
  }
  return Math.ceil(reach + end);
}

/**
 * Function distributedColumnWidths
 *
 * @description
 * Spreads a frame's width over columns in proportion to their widths (`distributeColumns`): each
 * width is a share and a minimum, a column stops at its maximum and its share of what is left goes
 * to the others. Whole pixels, the rounding remainder to the first column still below its maximum;
 * nothing when the frame does not exceed the widths (the table then keeps them and scrolls).
 *
 * @param {readonly { id: string; width: number; max: number }[]} columns - Columns in display order.
 * @param {number} available - Room in pixels.
 * @returns {ReadonlyMap<string, number>} Width of each column, empty when nothing is spread.
 */
export function distributedColumnWidths(
  columns: readonly { readonly id: string; readonly width: number; readonly max: number }[],
  available: number,
): ReadonlyMap<string, number> {
  const total: number = columns.reduce(
    (sum: number, column: { readonly width: number }): number => sum + column.width,
    0,
  );
  if (columns.length === 0 || total <= 0 || available <= total) return new Map<string, number>();
  const widths: Map<string, number> = new Map<string, number>(
    columns.map((column: { readonly id: string; readonly width: number }): [string, number] => [
      column.id,
      column.width,
    ]),
  );
  let extra: number = available - total;
  let open: (typeof columns)[number][] = columns.filter(
    (column: { readonly width: number; readonly max: number }): boolean =>
      column.width < column.max,
  );
  // Each pass gives every open column its share; a column that reaches its maximum closes.
  while (extra > 0.5 && open.length > 0) {
    const weight: number = open.reduce(
      (sum: number, column: { readonly width: number }): number => sum + column.width,
      0,
    );
    let given: number = 0;
    const still: (typeof columns)[number][] = [];
    for (const column of open) {
      const current: number = widths.get(column.id) ?? column.width;
      const wanted: number = current + (extra * column.width) / weight;
      const next: number = Math.min(column.max, wanted);
      given += next - current;
      widths.set(column.id, next);
      if (next < column.max) still.push(column);
    }
    extra -= given;
    if (still.length === open.length) break;
    open = still;
  }
  const rounded: Map<string, number> = new Map<string, number>(
    [...widths].map(([id, width]: [string, number]): [string, number] => [id, Math.floor(width)]),
  );
  const used: number = [...rounded.values()].reduce(
    (sum: number, width: number): number => sum + width,
    0,
  );
  const target: number = Math.min(
    available,
    columns.reduce((sum: number, column: { readonly max: number }): number => sum + column.max, 0),
  );
  const first: (typeof columns)[number] | undefined = columns.find(
    (column: { readonly id: string; readonly max: number }): boolean =>
      (rounded.get(column.id) ?? 0) < column.max,
  );
  if (first && target > used)
    rounded.set(first.id, Math.min(first.max, (rounded.get(first.id) ?? 0) + target - used));
  return rounded;
}
