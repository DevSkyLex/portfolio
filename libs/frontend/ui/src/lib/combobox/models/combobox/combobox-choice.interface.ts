import type { ComboboxEntry } from '@internal/ui/lib/combobox/models/combobox/combobox-entry.interface';
import type { ComboboxItem } from '@internal/ui/lib/combobox/models/combobox/combobox-item.interface';

/**
 * Interface ComboboxChoice
 * @interface ComboboxChoice
 *
 * @description
 * What the combobox searches, activates and chooses, whether the option is a projected
 * `ui-combobox-option` or a row built from a `ComboboxEntry` (which it then carries as `entry`).
 */
export interface ComboboxChoice extends ComboboxItem {
  // #region Properties
  /** The data entry of a virtualized row; absent for a projected option. */
  readonly entry?: ComboboxEntry;
  // #endregion

  // #region Methods
  /** Value written to the control when chosen. */
  value(): unknown;

  /** More words the search matches, beside the text. */
  keywords(): readonly string[];
  // #endregion
}
