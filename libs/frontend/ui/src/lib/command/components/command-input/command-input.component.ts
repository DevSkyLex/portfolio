import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideSearch } from '@ng-icons/lucide';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { COMMAND_HOST } from '@internal/ui/lib/command/tokens/command/command.token';
import type { CommandHost } from '@internal/ui/lib/command/models/command/command-host.interface';

/**
 * Class CommandInputComponent
 * @class CommandInputComponent
 *
 * @description
 * Renders the search combobox for a command palette and forwards its text and keyboard events to
 * the owning palette while keeping focus in the input.
 */
@Component({
  selector: 'ui-command-input',
  imports: [NgIcon],
  template: `
    <ng-icon class="shrink-0 text-fg-faint" [svg]="icons.search" size="16" aria-hidden="true" />
    <input
      #field
      type="text"
      role="combobox"
      aria-autocomplete="list"
      aria-expanded="true"
      autocomplete="off"
      spellcheck="false"
      class="h-11 w-full min-w-0 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-faint"
      data-slot="command-input-field"
      [attr.aria-controls]="command.listId"
      [attr.aria-activedescendant]="command.activeItem()?.id ?? null"
      [attr.aria-label]="ariaLabel()"
      [placeholder]="placeholder()"
      [value]="command.search()"
      (input)="command.search.set(field.value)"
      (keydown)="command.onKeydown($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()', 'data-slot': 'command-input' },
})
export class CommandInputComponent {
  // #region Properties
  /**
   * Property placeholder
   * @readonly
   *
   * @description
   * Prompt shown inside the search field when the palette query is empty.
   *
   * @type {InputSignal<string>}
   */
  public readonly placeholder: InputSignal<string> = input<string>(
    $localize`:@@ui.command.placeholder:Tapez une commande ou recherchez…`,
  );

  /**
   * Property ariaLabel
   * @readonly
   *
   * @description
   * Accessible name for the search field when no external label is associated with it.
   *
   * @type {InputSignal<string>}
   */
  public readonly ariaLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.command.label:Rechercher une commande`,
  );

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional wrapper classes merged with the search row layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Search icon passed to the template's decorative magnifier.
   *
   * @type {{ readonly search: typeof lucideSearch }}
   */
  protected readonly icons: { readonly search: typeof lucideSearch } = {
    search: lucideSearch,
  } as const;

  /**
   * Property command
   * @readonly
   *
   * @description
   * Owning palette state used to bind the query, listbox relationships and keyboard navigation.
   *
   * @type {CommandHost}
   */
  protected readonly command: CommandHost = inject<CommandHost>(COMMAND_HOST);

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Search-row layout with optional consumer classes merged into the host.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('flex items-center gap-2.5 border-b border-border px-3', this.class()),
  );
  // #endregion
}
