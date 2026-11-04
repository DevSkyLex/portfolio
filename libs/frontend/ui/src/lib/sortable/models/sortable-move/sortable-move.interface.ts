/**
 * Interface SortableMove
 *
 * @description
 * An item of a `uiSortableList` moved from one position to another; the list does not reorder its
 * data itself, the owner of the array applies the move.
 */
export interface SortableMove {
  /**
   * Property previousIndex
   *
   * @description
   * Position before the move.
   *
   * @type {number}
   */
  readonly previousIndex: number;

  /**
   * Property currentIndex
   *
   * @description
   * Position after the move.
   *
   * @type {number}
   */
  readonly currentIndex: number;

  /**
   * Property keyboard
   *
   * @description
   * Whether the move came from the handle's arrow keys, so the owner can keep the focus on the
   * moved item's handle once the list re-renders.
   *
   * @type {boolean}
   */
  readonly keyboard: boolean;
}
