import { Directive, computed, inject, input, type InputSignal, type Signal } from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import {
  menuSeparatorClasses,
  menuShortcutClasses,
} from '@internal/ui/lib/menu-panel/constants/menu-panel.constants';
import { COMMAND_HOST } from '@internal/ui/lib/command/tokens/command/command.token';
import type { CommandHost } from '@internal/ui/lib/command/models/command/command-host.interface';

/**
 * Class CommandListDirective
 * @class CommandListDirective
 *
 * @description
 * Provides the scrollable listbox and the identifier linked from the command search input.
 */
@Directive({
  selector: '[uiCommandList]',
  host: {
    role: 'listbox',
    '[id]': 'command.listId',
    '[class]': 'classes()',
    'data-slot': 'command-list',
  },
})
export class CommandListDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional listbox classes merged with its scrolling layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property command
   * @readonly
   *
   * @description
   * Owning palette contract supplying this list's accessible identifier.
   *
   * @type {CommandHost}
   */
  protected readonly command: CommandHost = inject<CommandHost>(COMMAND_HOST);

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Scrollable listbox layout with caller classes merged onto the host.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('flex max-h-80 flex-col overflow-y-auto overscroll-contain p-1', this.class()),
  );
  // #endregion
}

/**
 * Class CommandEmptyDirective
 * @class CommandEmptyDirective
 *
 * @description
 * Marks an empty-state message that is visible only when the owning palette has no visible items.
 */
@Directive({
  selector: '[uiCommandEmpty]',
  host: {
    role: 'status',
    '[attr.hidden]': 'command.empty() ? null : ""',
    '[class]': 'classes()',
    'data-slot': 'command-empty',
  },
})
export class CommandEmptyDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional empty-state classes merged with its centered muted text treatment.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property command
   * @readonly
   *
   * @description
   * Owning palette contract used to determine whether the empty state is shown.
   *
   * @type {CommandHost}
   */
  protected readonly command: CommandHost = inject<CommandHost>(COMMAND_HOST);

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Left-aligned empty-state typography, inset like the options, with caller classes merged onto the host.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('px-2.5 py-6 text-sm text-star-faint', this.class()),
  );
  // #endregion
}

/**
 * Class CommandSeparatorDirective
 * @class CommandSeparatorDirective
 *
 * @description
 * Renders a decorative divider between command groups and hides it while a query is active.
 */
@Directive({
  selector: '[uiCommandSeparator]',
  host: {
    'aria-hidden': 'true',
    '[attr.hidden]': 'command.search() ? "" : null',
    '[class]': 'classes()',
    'data-slot': 'command-separator',
  },
})
export class CommandSeparatorDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional separator classes merged with the shared menu divider style.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property command
   * @readonly
   *
   * @description
   * Owning palette query used to suppress separators during filtering.
   *
   * @type {CommandHost}
   */
  protected readonly command: CommandHost = inject<CommandHost>(COMMAND_HOST);

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Shared divider style combined with caller-provided classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(menuSeparatorClasses, this.class()),
  );
  // #endregion
}

/**
 * Class CommandShortcutDirective
 * @class CommandShortcutDirective
 *
 * @description
 * Styles trailing shortcut text and marks it so command-label extraction can omit it.
 */
@Directive({
  selector: '[uiCommandShortcut]',
  host: { '[class]': 'classes()', 'data-slot': 'command-shortcut' },
})
export class CommandShortcutDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional shortcut classes merged with the shared menu shortcut style.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Shared shortcut typography combined with caller-provided classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(menuShortcutClasses, this.class()),
  );
  // #endregion
}
