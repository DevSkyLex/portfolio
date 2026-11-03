import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  forwardRef,
  inject,
  input,
  model,
  signal,
  type InputSignal,
  type ModelSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import {
  normalizeText,
  stepItem,
} from '@internal/ui/lib/menu-panel/utils/menu-panel/menu-panel.utils';
import { CommandItemDirective } from '@internal/ui/lib/command/directives/command-item/command-item.directive';
import { COMMAND_HOST } from '@internal/ui/lib/command/tokens/command/command.token';
import type { CommandHost } from '@internal/ui/lib/command/models/command/command-host.interface';
import type { CommandItemRef } from '@internal/ui/lib/command/models/command/command-item-ref.interface';

/**
 * Class CommandComponent
 * @class CommandComponent
 *
 * @description
 * Owns command search, filtering and keyboard selection for the composed command list. Focus stays
 * in the search input while Arrow keys move the active item and Enter runs it.
 */
@Component({
  selector: 'ui-command',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: COMMAND_HOST, useExisting: forwardRef(() => CommandComponent) }],
  host: { '[class]': 'classes()', 'data-slot': 'command' },
})
export class CommandComponent implements CommandHost {
  // #region Properties
  /**
   * Property search
   * @readonly
   *
   * @description
   * Search query shared with the command input and used to filter item labels and keywords.
   *
   * @type {ModelSignal<string>}
   */
  public readonly search: ModelSignal<string> = model<string>('');

  /**
   * Property filter
   * @readonly
   *
   * @description
   * Enables local matching; disable it when an external source already filters the rendered items.
   *
   * @type {InputSignal<boolean>}
   */
  public readonly filter: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional host classes merged with the palette's structural and focus styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property listId
   * @readonly
   *
   * @description
   * Per-instance listbox id referenced by the paired search input for assistive technology.
   *
   * @type {string}
   */
  public readonly listId: string =
    inject<RenderIdService>(RenderIdService).next('ui-command-list-');

  /**
   * Property items
   * @readonly
   *
   * @description
   * Descendant command items participating in filtering and keyboard selection.
   *
   * @type {Signal<readonly CommandItemDirective[]>}
   */
  private readonly items: Signal<readonly CommandItemDirective[]> =
    contentChildren<CommandItemDirective>(CommandItemDirective, { descendants: true });

  /**
   * Property visibleItems
   * @readonly
   *
   * @description
   * Items that match the current query, preserving their content order for keyboard navigation.
   *
   * @type {Signal<CommandItemDirective[]>}
   */
  private readonly visibleItems: Signal<CommandItemDirective[]> = computed<CommandItemDirective[]>(
    () => this.items().filter((item) => this.isVisible(item)),
  );

  /**
   * Property chosen
   * @readonly
   *
   * @description
   * Explicitly chosen item; a stale, hidden or disabled choice falls back to the first visible item.
   *
   * @type {WritableSignal<CommandItemDirective | null>}
   */
  private readonly chosen: WritableSignal<CommandItemDirective | null> =
    signal<CommandItemDirective | null>(null);

  /**
   * Property activeItem
   * @readonly
   *
   * @description
   * Enabled item exposed to `aria-activedescendant`, defaulting to the first visible item.
   *
   * @type {Signal<CommandItemDirective | null>}
   */
  public readonly activeItem: Signal<CommandItemDirective | null> =
    computed<CommandItemDirective | null>(() => {
      const items: CommandItemDirective[] = this.visibleItems();
      const chosen: CommandItemDirective | null = this.chosen();
      return chosen && items.includes(chosen) && !chosen.isDisabled()
        ? chosen
        : stepItem(items, null, 'first');
    });

  /**
   * Property empty
   * @readonly
   *
   * @description
   * Whether search and content currently leave the list without a visible command.
   *
   * @type {Signal<boolean>}
   */
  public readonly empty: Signal<boolean> = computed<boolean>(
    () => this.visibleItems().length === 0,
  );

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Palette layout and focus treatment combined with caller-provided classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      'flex w-full flex-col overflow-hidden rounded-field border border-line bg-void-raised text-star light:bg-void',
      'outline-4 outline-transparent focus-within:border-signal/55 focus-within:outline-signal/12',
      this.class(),
    ),
  );
  // #endregion

  // #region Methods
  /**
   * Method isVisible
   * @method isVisible
   *
   * @description
   * Matches the item's visible label and keyword aliases against the normalized search query.
   *
   * @param {CommandItemRef} item - Command candidate to evaluate.
   * @returns {boolean} Whether the item remains visible in the current palette.
   */
  public isVisible(item: CommandItemRef): boolean {
    const query: string = normalizeText(this.search());
    if (!this.filter() || !query) return true;
    return [item.text(), ...item.keywords()].some((word) => normalizeText(word).includes(query));
  }

  /**
   * Method isActive
   * @method isActive
   *
   * @description
   * Compares the candidate with the current active item used by the listbox.
   *
   * @param {CommandItemRef} item - Command candidate to compare.
   * @returns {boolean} Whether the candidate is the active item.
   */
  public isActive(item: CommandItemRef): boolean {
    return this.activeItem() === item;
  }

  /**
   * Method activate
   * @method activate
   *
   * @description
   * Remembers an enabled item as the active candidate when pointer movement selects it.
   *
   * @param {CommandItemRef} item - Item requested by pointer interaction.
   * @returns {void} Completes after the active item has been updated when enabled.
   */
  public activate(item: CommandItemRef): void {
    if (!item.isDisabled()) this.chosen.set(item as CommandItemDirective);
  }

  /**
   * Method onKeydown
   * @method onKeydown
   *
   * @description
   * Moves selection with Arrow keys and runs the active command on Enter outside IME composition.
   *
   * @param {KeyboardEvent} event - Key event from the command search field.
   * @returns {void} Completes after the event has been handled or left untouched.
   */
  public onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step: 1 | -1 = event.key === 'ArrowDown' ? 1 : -1;
      this.chosen.set(stepItem(this.visibleItems(), this.activeItem(), step));
    } else if (event.key === 'Enter' && !event.isComposing) {
      const active: CommandItemDirective | null = this.activeItem();
      if (active) {
        event.preventDefault();
        active.run();
      }
    }
  }
  // #endregion
}
