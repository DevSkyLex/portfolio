import type { ComboboxItem } from '@internal/ui/lib/combobox/models/combobox/combobox-item.interface';

/**
 * Interface Suggestion
 * @interface Suggestion
 * @extends ComboboxItem
 *
 * @description
 * Accessible listbox item backed by the exact text selected into the autocomplete field.
 */
export interface Suggestion extends ComboboxItem {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Text committed to the editable field when this option is chosen.
   *
   * @type {string}
   */
  readonly value: string;
  // #endregion
}
