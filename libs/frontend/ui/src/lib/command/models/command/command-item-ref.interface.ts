/**
 * Interface CommandItemRef
 * @interface CommandItemRef
 *
 * @description
 * The keyboard palette contract for a selectable command, kept independent of its directive class.
 */
export interface CommandItemRef {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable DOM identifier used by the listbox's active-descendant relationship.
   *
   * @type {string}
   */
  readonly id: string;
  // #endregion

  // #region Methods
  /**
   * Method text
   * @method text
   *
   * @description
   * Returns the searchable and selectable label presented for this command.
   *
   * @returns {string} Command label without auxiliary shortcut text.
   */
  text(): string;

  /**
   * Method keywords
   * @method keywords
   *
   * @description
   * Returns additional terms that make this command discoverable in the palette.
   *
   * @returns {readonly string[]} Search aliases in addition to the visible label.
   */
  keywords(): readonly string[];

  /**
   * Method isDisabled
   * @method isDisabled
   *
   * @description
   * Reports whether the item can receive the active state or run in the current view.
   *
   * @returns {boolean} Whether command execution is disabled.
   */
  isDisabled(): boolean;

  /**
   * Method run
   * @method run
   *
   * @description
   * Executes the command's selection action when it is enabled.
   *
   * @returns {void} Completes after the item's selection action has been invoked.
   */
  run(): void;
  // #endregion
}
