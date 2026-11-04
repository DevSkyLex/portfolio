/**
 * Interface DataTableColumnDrag
 * @interface DataTableColumnDrag
 *
 * @description
 * Pointer drag of a column edge in progress: what a frame needs to apply the latest pointer position
 * and what Escape needs to put the column back.
 */
export interface DataTableColumnDrag {
  // #region Properties
  /** Id of the column resized. */
  readonly column: string;

  /** Pointer captured by the handle. */
  readonly pointer: number;

  /** Handle carrying the capture, measured for the guide line. */
  readonly handle: HTMLElement;

  /** Pointer `clientX` when the drag started. */
  readonly x: number;

  /** Column width in pixels when the drag started: the rendered one, since the `col` holds it. */
  readonly start: number;

  /** Sign turning a rightward pointer move into a width change (`resizeDirection`). */
  readonly direction: 1 | -1;

  /**
   * Widest width this drag reaches: the column's maximum, or less where the fill column would narrow
   * below its minimum in a frame that cannot scroll.
   */
  readonly max: number;

  /** Handle centre `clientX` when the drag started. */
  readonly edge: number;

  /**
   * Whether the frame scrolls sideways during this drag: the drag then scrolls it by whatever the
   * edge drifts from the pointer once the fill column is at its minimum.
   */
  readonly scrolls: boolean;

  /** Width the user had stored for the column before the drag, restored by Escape; `undefined` for none. */
  readonly previous: number | undefined;

  /** Latest pointer `clientX`, applied on the next animation frame. */
  latestX: number;

  /** Pending animation frame, or `null`. */
  frame: number | null;
  // #endregion
}
