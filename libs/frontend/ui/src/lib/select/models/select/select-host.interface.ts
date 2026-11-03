import type { Signal } from '@angular/core';
import type { MenuOptionSize } from '@internal/ui/lib/menu-panel/constants/menu-option.variants';
import type { SelectOptionRef } from '@internal/ui/lib/select/models/select/select-option-ref.interface';

/**
 * Interface SelectHost
 * @interface SelectHost
 *
 * @description
 * Defines the operations options use to query selection and delegate ordering, activation and choice to their
 * containing select.
 */
export interface SelectHost {
  // #region Properties
  /**
   * Property size
   * @readonly
   *
   * @description
   * Current option size used to keep option rendering aligned with the select trigger.
   *
   * @type {Signal<MenuOptionSize>}
   */
  readonly size: Signal<MenuOptionSize>;
  // #endregion

  // #region Methods
  /**
   * Method isSelected
   * @method isSelected
   *
   * @description
   * Compares a candidate value with the current selection using the host's configured comparator.
   *
   * @param {unknown} value - Candidate option value.
   * @returns {boolean} Whether the candidate matches the selected value.
   */
  isSelected(value: unknown): boolean;

  /**
   * Method indexOf
   * @method indexOf
   *
   * @description
   * Returns the option's current position among the host's projected options.
   *
   * @param {SelectOptionRef} option - Option whose position is requested.
   * @returns {number} Zero-based option index, or the array's `-1` result when absent.
   */
  indexOf(option: SelectOptionRef): number;

  /**
   * Method choose
   * @method choose
   *
   * @description
   * Applies an option selection and closes the host when the option is enabled.
   *
   * @param {SelectOptionRef} option - Option to select.
   * @returns {void}
   */
  choose(option: SelectOptionRef): void;

  /**
   * Method activate
   * @method activate
   *
   * @description
   * Requests that the host highlight the option when it is enabled and not already active.
   *
   * @param {SelectOptionRef} option - Option to highlight.
   * @returns {void}
   */
  activate(option: SelectOptionRef): void;
  // #endregion
}
