import {
  Directive,
  ElementRef,
  computed,
  contentChild,
  inject,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import {
  type ButtonVariant,
  buttonVariants,
} from '@internal/ui/lib/button/constants/button.variants';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import {
  type InputGroupAddonAlign,
  inputGroupAddonVariants,
} from '@internal/ui/lib/input-group/constants/input-group-addon.variants';
import {
  type InputGroupButtonSize,
  inputGroupButtonVariants,
} from '@internal/ui/lib/input-group/constants/input-group-button.variants';
import {
  type InputGroupSize,
  inputGroupVariants,
} from '@internal/ui/lib/input-group/constants/input-group.variants';
import { reflectFieldInvalid } from '@internal/ui/lib/field/utils/field-invalid/field-invalid.utils';
import {
  INPUT_GROUP_CONTROL_CLASSES,
  INPUT_GROUP_TEXTAREA_CLASSES,
} from '@internal/ui/lib/input/constants/input-group-control.constants';
import { INPUT_GROUP_HOST } from '@internal/ui/lib/input/tokens/input-group-host.token';

/**
 * Directive InputGroupInputDirective
 * @class InputGroupInputDirective
 *
 * @description
 * Styles a native input or textarea as the flexible, borderless control inside an input group.
 */
@Directive({
  selector: 'input[uiInputGroupInput], textarea[uiInputGroupInput]',
  host: { '[class]': 'classes()', 'data-slot': 'input-group-control' },
})
export class InputGroupInputDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional caller classes merged into the native control styling.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property element
   * @readonly
   *
   * @description
   * Native input or textarea host used for focus delegation and tag-specific styling.
   *
   * @type {HTMLInputElement | HTMLTextAreaElement}
   */
  private readonly element: HTMLInputElement | HTMLTextAreaElement =
    inject<ElementRef<HTMLInputElement | HTMLTextAreaElement>>(ElementRef).nativeElement;

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merges the borderless control styles, textarea-specific layout and caller classes for the host binding.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      INPUT_GROUP_CONTROL_CLASSES,
      this.element.tagName === 'TEXTAREA' && INPUT_GROUP_TEXTAREA_CLASSES,
      this.class(),
    ),
  );
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Exposes the enclosing `ui-field`'s error as `aria-invalid` on the control.
   */
  public constructor() {
    reflectFieldInvalid();
  }
  // #endregion

  // #region Methods
  /**
   * Method focus
   * @method focus
   *
   * @description
   * Moves focus to the native control so its parent group can delegate focus without querying the DOM.
   *
   * @returns {void}
   */
  public focus(): void {
    this.element.focus();
  }
  // #endregion
}

/**
 * Directive InputGroupDirective
 * @class InputGroupDirective
 *
 * @description
 * Groups one native control with its addons and exposes the control's size to the host styles.
 */
@Directive({
  selector: '[uiInputGroup]',
  providers: [{ provide: INPUT_GROUP_HOST, useValue: true }],
  host: {
    role: 'group',
    'data-slot': 'input-group',
    '[class]': 'classes()',
    '[attr.data-size]': 'size()',
  },
})
export class InputGroupDirective {
  // #region Properties
  /**
   * Property size
   * @readonly
   *
   * @description
   * Group size used by the wrapper and the nested control; defaults to medium.
   *
   * @type {InputSignal<InputGroupSize>}
   */
  public readonly size: InputSignal<InputGroupSize> = input<InputGroupSize>('md');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional caller classes merged into the group wrapper.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Resolves group size variants with caller classes for the host binding.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(inputGroupVariants({ size: this.size() }), this.class()),
  );

  /**
   * Property control
   * @readonly
   *
   * @description
   * Descendant input group control, when present, used as the target for delegated focus.
   *
   * @type {Signal<InputGroupInputDirective | undefined>}
   */
  private readonly control: Signal<InputGroupInputDirective | undefined> =
    contentChild<InputGroupInputDirective>(InputGroupInputDirective, { descendants: true });

  /**
   * Property element
   * @readonly
   *
   * @description
   * Group element, searched for a control rendered inside a catalogue component (`ui-autocomplete`),
   * which content queries do not reach.
   *
   * @type {HTMLElement}
   */
  private readonly element: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  // #endregion

  // #region Methods
  /**
   * Method focusControl
   * @method focusControl
   *
   * @description
   * Focuses the group's control: the projected `uiInputGroupInput`, else the first element marked as
   * the group control (a `uiInput` in the group); an empty group is a no-op.
   *
   * @returns {void}
   */
  public focusControl(): void {
    const control: InputGroupInputDirective | undefined = this.control();
    if (control) {
      control.focus();
      return;
    }
    this.element.querySelector<HTMLElement>('[data-slot="input-group-control"]')?.focus();
  }
  // #endregion
}

/**
 * Directive InputGroupAddonDirective
 * @class InputGroupAddonDirective
 *
 * @description
 * Places icon, text or button content beside a group control and delegates non-button clicks to control focus.
 */
@Directive({
  selector: '[uiInputGroupAddon]',
  host: {
    role: 'group',
    'data-slot': 'input-group-addon',
    '[class]': 'classes()',
    '[attr.data-align]': 'align()',
    '(click)': 'onClick($event)',
  },
})
export class InputGroupAddonDirective {
  // #region Properties
  /**
   * Property align
   * @readonly
   *
   * @description
   * Addon edge relative to the control; defaults to the inline start edge.
   *
   * @type {InputSignal<InputGroupAddonAlign>}
   */
  public readonly align: InputSignal<InputGroupAddonAlign> =
    input<InputGroupAddonAlign>('inline-start');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional caller classes merged into the addon's placement styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Resolves the selected edge variant with caller classes for the host binding.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(inputGroupAddonVariants({ align: this.align() }), this.class()),
  );

  /**
   * Property group
   * @readonly
   *
   * @description
   * Optional owning group; absence leaves addon clicks without focus delegation.
   *
   * @type {InputGroupDirective | null}
   */
  private readonly group: InputGroupDirective | null = inject<InputGroupDirective>(
    InputGroupDirective,
    { optional: true },
  );
  // #endregion

  // #region Methods
  /**
   * Method onClick
   * @method onClick
   *
   * @description
   * Focuses the group's control when the click did not originate in a button, preserving button activation behavior.
   *
   * @param {MouseEvent} event - Host click event used to identify button-originated interactions.
   *
   * @returns {void}
   */
  protected onClick(event: MouseEvent): void {
    if (!(event.target as HTMLElement | null)?.closest('button')) {
      this.group?.focusControl();
    }
  }
  // #endregion
}

/**
 * Directive InputGroupTextDirective
 * @class InputGroupTextDirective
 *
 * @description
 * Styles plain addon text such as a unit, prefix or character count without intercepting input interaction.
 */
@Directive({
  selector: '[uiInputGroupText]',
  host: { '[class]': 'classes()', 'data-slot': 'input-group-text' },
})
export class InputGroupTextDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional caller classes merged into the addon text styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merges the standard muted inline text styles with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      'inline-flex items-center gap-2 text-sm text-fg-muted [&_ng-icon]:pointer-events-none',
      this.class(),
    ),
  );
  // #endregion
}

/**
 * Directive InputGroupButtonDirective
 * @class InputGroupButtonDirective
 *
 * @description
 * Styles a compact native button inside an input group addon and binds its native button type explicitly.
 */
@Directive({
  selector: 'button[uiInputGroupButton]',
  host: {
    'data-slot': 'input-group-button',
    '[class]': 'classes()',
    '[attr.type]': 'type()',
  },
})
export class InputGroupButtonDirective {
  // #region Properties
  /**
   * Property variant
   * @readonly
   *
   * @description
   * Button visual variant used inside the group; defaults to the ghost appearance.
   *
   * @type {InputSignal<ButtonVariant>}
   */
  public readonly variant: InputSignal<ButtonVariant> = input<ButtonVariant>('ghost');

  /**
   * Property size
   * @readonly
   *
   * @description
   * Compact input-group button size, independent of the group's control height.
   *
   * @type {InputSignal<InputGroupButtonSize>}
   */
  public readonly size: InputSignal<InputGroupButtonSize> = input<InputGroupButtonSize>('xs');

  /**
   * Property type
   * @readonly
   *
   * @description
   * Native button type; defaults to `button` so addon actions do not submit a surrounding form accidentally.
   *
   * @type {InputSignal<'button' | 'submit' | 'reset'>}
   */
  public readonly type: InputSignal<'button' | 'submit' | 'reset'> = input<
    'button' | 'submit' | 'reset'
  >('button');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional caller classes merged into the compact button styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Combines the selected button appearance and compact size with caller classes for the host binding.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      buttonVariants({ variant: this.variant(), size: 'sm' }),
      inputGroupButtonVariants({ size: this.size() }),
      this.class(),
    ),
  );
  // #endregion
}
