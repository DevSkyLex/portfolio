/**
 * Interface ComboboxItem
 * @interface ComboboxItem
 *
 * @description
 * Common list-row contract shared by selectable combobox options and autocomplete suggestions.
 */
export interface ComboboxItem {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable DOM id used by the input's `aria-activedescendant` while this row is active.
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
   * Returns the label presented in the field when this item is chosen.
   *
   * @returns {string} Text used for the field value and filtering.
   */
  text(): string;

  /**
   * Method isDisabled
   * @method isDisabled
   *
   * @description
   * Indicates whether keyboard and pointer interaction must skip this row.
   *
   * @returns {boolean} True when the row cannot be chosen.
   */
  isDisabled(): boolean;
  // #endregion
}
