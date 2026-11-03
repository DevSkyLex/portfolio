import type { Signal } from '@angular/core';
import type { ComboboxItem } from '@internal/ui/lib/combobox/models/combobox/combobox-item.interface';
import type { MenuOptionSize } from '@internal/ui/lib/menu-panel/constants/menu-option.variants';

/**
 * Interface ComboboxHost
 * @interface ComboboxHost
 *
 * @description
 * Narrow interaction contract injected by option components to avoid importing the concrete combobox component.
 */
export interface ComboboxHost {
  // #region Properties
  /**
   * Property size
   * @readonly
   *
   * @description
   * Shared option size selected by the owning combobox.
   *
   * @type {Signal<MenuOptionSize>}
   */
  readonly size: Signal<MenuOptionSize>;
  // #endregion

  // #region Methods
  /**
   * Method isVisible
   * @method isVisible
   *
   * @description
   * Determines whether an option matches the current text query.
   *
   * @param {ComboboxItem} item - Row to test against the current query.
   * @returns {boolean} True when the row belongs in the current popup list.
   */
  isVisible(item: ComboboxItem): boolean;

  /**
   * Method isSelected
   * @method isSelected
   *
   * @description
   * Compares an option value with the combobox's current model value.
   *
   * @param {unknown} value - Candidate option value.
   * @returns {boolean} True when the candidate represents the current selection.
   */
  isSelected(value: unknown): boolean;

  /**
   * Method isActive
   * @method isActive
   *
   * @description
   * Reports whether the row is the active descendant used by keyboard navigation.
   *
   * @param {ComboboxItem} item - Row to compare with the active item.
   * @returns {boolean} True when the row is active.
   */
  isActive(item: ComboboxItem): boolean;

  /**
   * Method choose
   * @method choose
   *
   * @description
   * Commits an enabled row and closes the popup; disabled rows are ignored.
   *
   * @param {ComboboxItem} item - Row selected by keyboard or pointer interaction.
   * @returns {void}
   */
  choose(item: ComboboxItem): void;

  /**
   * Method activate
   * @method activate
   *
   * @description
   * Makes an enabled row the active descendant without changing the selected value.
   *
   * @param {ComboboxItem} item - Row activated by pointer movement.
   * @returns {void}
   */
  activate(item: ComboboxItem): void;
  // #endregion
}
