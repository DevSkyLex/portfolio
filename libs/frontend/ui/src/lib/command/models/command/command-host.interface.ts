import type { ModelSignal, Signal } from '@angular/core';
import type { CommandItemRef } from '@internal/ui/lib/command/models/command/command-item-ref.interface';

/**
 * Interface CommandHost
 * @interface CommandHost
 *
 * @description
 * Shared palette state and operations consumed by command parts through dependency injection.
 */
export interface CommandHost {
  // #region Properties
  /**
   * Property search
   * @readonly
   *
   * @description
   * Two-way query shared by the search input and item filtering.
   *
   * @type {ModelSignal<string>}
   */
  readonly search: ModelSignal<string>;

  /**
   * Property listId
   * @readonly
   *
   * @description
   * Listbox identifier referenced by the search input's `aria-controls` attribute.
   *
   * @type {string}
   */
  readonly listId: string;

  /**
   * Property activeItem
   * @readonly
   *
   * @description
   * Visible enabled item currently represented by `aria-activedescendant`, or `null` for an empty list.
   *
   * @type {Signal<CommandItemRef | null>}
   */
  readonly activeItem: Signal<CommandItemRef | null>;

  /**
   * Property empty
   * @readonly
   *
   * @description
   * Whether no command item remains visible after applying the query.
   *
   * @type {Signal<boolean>}
   */
  readonly empty: Signal<boolean>;
  // #endregion

  // #region Methods
  /**
   * Method isVisible
   * @method isVisible
   *
   * @description
   * Applies the current query and filtering mode to decide whether an item is rendered.
   *
   * @param {CommandItemRef} item - Candidate command item.
   * @returns {boolean} Whether the item matches the active search.
   */
  isVisible(item: CommandItemRef): boolean;

  /**
   * Method isActive
   * @method isActive
   *
   * @description
   * Checks whether the item is the enabled command currently selected for keyboard navigation.
   *
   * @param {CommandItemRef} item - Candidate command item.
   * @returns {boolean} Whether the item is active.
   */
  isActive(item: CommandItemRef): boolean;

  /**
   * Method activate
   * @method activate
   *
   * @description
   * Selects an enabled item as the current keyboard-navigation target.
   *
   * @param {CommandItemRef} item - Item requested by pointer interaction.
   * @returns {void} Completes after the active item has been selected when enabled.
   */
  activate(item: CommandItemRef): void;

  /**
   * Method onKeydown
   * @method onKeydown
   *
   * @description
   * Handles Arrow navigation and Enter execution while preserving IME composition behavior.
   *
   * @param {KeyboardEvent} event - Keyboard event from the palette search field.
   * @returns {void} Completes after handling navigation or command execution when applicable.
   */
  onKeydown(event: KeyboardEvent): void;
  // #endregion
}
