/**
 * Interface MenuMotionParts
 * @interface MenuMotionParts
 *
 * @description
 * DOM elements mutated by the menu animation and reset after closing.
 */
export interface MenuMotionParts {
  // #region Properties
  /**
   * Property trigger
   * @readonly
   *
   * @description
   * Trigger element whose edge rounds while adjacent to the opening list.
   *
   * @type {HTMLElement}
   */
  readonly trigger: HTMLElement;

  /**
   * Property list
   * @readonly
   *
   * @description
   * Floating or in-flow list whose reveal styles are animated.
   *
   * @type {HTMLElement}
   */
  readonly list: HTMLElement;

  /**
   * Property chevron
   * @readonly
   *
   * @description
   * Optional indicator rotated with menu progress.
   *
   * @type {HTMLElement | null}
   */
  readonly chevron: HTMLElement | null;
  // #endregion
}
