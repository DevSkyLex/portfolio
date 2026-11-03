import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import {
  Directive,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  output,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { menuOptionVariants } from '@internal/ui/lib/menu-panel/constants/menu-option.variants';
import { COMMAND_HOST } from '@internal/ui/lib/command/tokens/command/command.token';
import type { CommandItemRef } from '@internal/ui/lib/command/models/command/command-item-ref.interface';
import type { CommandHost } from '@internal/ui/lib/command/models/command/command-host.interface';

/**
 * Class CommandItemDirective
 * @class CommandItemDirective
 *
 * @description
 * Turns its host into a searchable listbox option and emits its resolved label when an enabled
 * command is selected.
 */
@Directive({
  selector: '[uiCommandItem]',
  host: {
    role: 'option',
    '[id]': 'id',
    '[attr.hidden]': 'command.isVisible(this) ? null : ""',
    '[attr.aria-selected]': 'active()',
    '[attr.aria-disabled]': 'isDisabled() || null',
    '[attr.data-active]': 'active() ? "" : null',
    '[class]': 'classes()',
    'data-slot': 'command-item',
    '(click)': 'run()',
    '(pointermove)': 'command.activate(this)',
    '(mousedown)': '$event.preventDefault()',
  },
})
export class CommandItemDirective implements CommandItemRef {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Explicit label used for matching and selection; host text supplies the default when omitted.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly value: InputSignal<string | undefined> = input<string>();

  /**
   * Property keywords
   * @readonly
   *
   * @description
   * Additional terms matched alongside the command's label.
   *
   * @type {InputSignal<readonly string[]>}
   */
  public readonly keywords: InputSignal<readonly string[]> = input<readonly string[]>([]);

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Prevents selection and active keyboard state; the transform accepts an empty boolean attribute.
   *
   * @type {InputSignalWithTransform<boolean, boolean | ''>}
   */
  public readonly disabled: InputSignalWithTransform<boolean, boolean | ''> = input<
    boolean,
    boolean | ''
  >(false, {
    transform: (value: boolean | '') => value === '' || value,
  });

  /**
   * Property class
   * @readonly
   *
   * @description
   * Extra classes merged with the shared command option styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property selected
   * @readonly
   *
   * @description
   * Emits the resolved label when this enabled option is activated.
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly selected: OutputEmitterRef<string> = output<string>();
  // #endregion

  // #region Methods
  /**
   * Method isDisabled
   * @method isDisabled
   *
   * @description
   * Exposes the disabled input through the command item contract.
   *
   * @returns {boolean} Whether selection and keyboard activation are disabled.
   */
  public isDisabled(): boolean {
    return this.disabled();
  }
  // #endregion

  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique host identifier referenced by the palette's active-descendant attribute.
   *
   * @type {string}
   */
  public readonly id: string = inject<RenderIdService>(RenderIdService).next('ui-command-item-');

  /**
   * Property command
   * @readonly
   *
   * @description
   * Owning palette contract for visibility and active selection state.
   *
   * @type {CommandHost}
   */
  protected readonly command: CommandHost = inject<CommandHost>(COMMAND_HOST);

  /**
   * Property element
   * @readonly
   *
   * @description
   * Native host used to derive fallback text and scroll active options into view.
   *
   * @type {HTMLElement}
   */
  private readonly element: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Property active
   * @readonly
   *
   * @description
   * Whether this option is the palette's current active item.
   *
   * @type {Signal<boolean>}
   */
  protected readonly active: Signal<boolean> = computed<boolean>(() => this.command.isActive(this));

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Shared option appearance without cascade animation, merged with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(menuOptionVariants({ cascade: false }), this.class()),
  );
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Scrolls the item to the nearest visible position whenever it becomes the active option.
   */
  public constructor() {
    afterRenderEffect(() => {
      if (this.active()) this.element.scrollIntoView?.({ block: 'nearest' });
    });
  }
  // #endregion

  // #region Methods
  /**
   * Method text
   * @method text
   *
   * @description
   * Returns the explicit value when present or trimmed host text after removing the shortcut part.
   *
   * @returns {string} Label searched by the palette and emitted on selection.
   */
  public text(): string {
    const value: string | undefined = this.value();
    if (value !== undefined) return value;

    // The content's text, without its shortcut.
    const copy: HTMLElement = this.element.cloneNode(true) as HTMLElement;
    copy
      .querySelectorAll('[data-slot="command-shortcut"]')
      .forEach((shortcut) => shortcut.remove());
    return copy.textContent?.trim() ?? '';
  }

  /**
   * Method run
   * @method run
   *
   * @description
   * Emits the resolved command label only while the item is enabled.
   *
   * @returns {void} Completes after emitting the label for an enabled item.
   */
  public run(): void {
    if (!this.isDisabled()) this.selected.emit(this.text());
  }
  // #endregion
}
