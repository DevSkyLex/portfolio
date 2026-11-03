import type { ModelSignal, Signal } from '@angular/core';
import type { NavigationMenuItemRef } from '@internal/ui/lib/navigation-menu/models/navigation-menu/navigation-menu-item-ref.interface';

/**
 * Interface NavigationMenuHost
 * @interface NavigationMenuHost
 *
 * @description
 * Narrow root menu contract consumed by navigation parts without importing the root directive implementation.
 */
export interface NavigationMenuHost {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Two-way value of the open item, or `null` when all items are closed.
   *
   * @type {ModelSignal<string | null>}
   */
  readonly value: ModelSignal<string | null>;

  /**
   * Property openItem
   * @readonly
   *
   * @description
   * Current item with an open panel, or `null` when the root has no open item.
   *
   * @type {Signal<NavigationMenuItemRef | null>}
   */
  readonly openItem: Signal<NavigationMenuItemRef | null>;

  /**
   * Property element
   * @readonly
   *
   * @description
   * Root navigation element used to constrain pointer and focus dismissal.
   *
   * @type {HTMLElement}
   */
  readonly element: HTMLElement;
  // #endregion

  // #region Methods
  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Opens the requested item or closes it when it is already the active item.
   *
   * @param {string} value - Stable value identifying the item to toggle.
   * @returns {void} Updates the root open-item model.
   */
  toggle(value: string): void;

  /**
   * Method close
   * @method close
   *
   * @description
   * Closes any currently open item in this navigation root.
   *
   * @returns {void} Sets the root open-item model to `null`.
   */
  close(): void;
  // #endregion
}
