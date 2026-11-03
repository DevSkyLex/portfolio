/**
 * Interface PopoverContext
 * @interface PopoverContext
 *
 * @description
 * Template context exposed by popover content for closing the open panel.
 */
export interface PopoverContext {
  // #region Properties
  /**
   * Property close
   * @readonly
   *
   * @description
   * Closes the owning panel and restores focus to its trigger.
   *
   * @type {() => void}
   */
  readonly close: () => void;
  // #endregion
}
