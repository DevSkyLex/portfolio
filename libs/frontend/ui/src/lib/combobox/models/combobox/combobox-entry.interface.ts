/**
 * Interface ComboboxEntry
 * @interface ComboboxEntry
 *
 * @description
 * One option of a combobox given as data (`[entries]`) rather than as a projected
 * `ui-combobox-option`: the list is then virtualized, only the rows in view exist in the DOM.
 */
export interface ComboboxEntry<T = unknown> {
  // #region Properties
  /** Value written to the control when the entry is chosen. */
  readonly value: T;

  /** Text shown, searched and written back in the field. */
  readonly label: string;

  /** More words the search matches, beside the label. */
  readonly keywords?: readonly string[];

  /** Whether the entry is shown but cannot be chosen. */
  readonly disabled?: boolean;
  // #endregion
}
