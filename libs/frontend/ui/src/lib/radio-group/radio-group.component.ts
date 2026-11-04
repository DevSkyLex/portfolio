import { FocusKeyManager, _IdGenerator } from '@angular/cdk/a11y';
import { Directionality } from '@angular/cdk/bidi';
import {
  type InputSignal,
  type InputSignalWithTransform,
  type ModelSignal,
  type OutputEmitterRef,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  Injector,
  type Signal,
  booleanAttribute,
  computed,
  contentChildren,
  inject,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import {
  type RadioGroupOrientation,
  radioGroupVariants,
} from '@internal/ui/lib/radio-group/constants/radio-group.variants';

/**
 * Component RadioGroupItemComponent
 * @class RadioGroupItemComponent
 *
 * @description
 * Renders one radio option whose projected content supplies its visible label.
 */
@Component({
  selector: 'ui-radio-group-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './radio-group-item.component.html',
  host: { '[class]': 'classes()', 'data-slot': 'radio-group-item' },
})
export class RadioGroupItemComponent {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Option value compared with the group's selected value.
   *
   * @type {InputSignal<unknown>}
   */
  public readonly value: InputSignal<unknown> = input.required<unknown>();

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Whether this option is unavailable in addition to any disabled group state.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly disabled: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    {
      transform: booleanAttribute,
    },
  );

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes applied to the option host.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property controlId
   * @readonly
   *
   * @description
   * Id applied to the native radio button, generated when no id is supplied.
   *
   * @type {InputSignal<string>}
   */
  public readonly controlId: InputSignal<string> = input<string>(
    inject<_IdGenerator>(_IdGenerator).getId('ui-radio-'),
  );

  /**
   * Property ariaLabel
   * @readonly
   *
   * @description
   * Optional accessible label override for the radio control.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly ariaLabel: InputSignal<string | undefined> = input<string>();

  /**
   * Property ariaDescribedby
   * @readonly
   *
   * @description
   * Optional id reference to descriptive text for the radio control.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly ariaDescribedby: InputSignal<string | undefined> = input<string>();

  /**
   * Property group
   * @readonly
   *
   * @description
   * Owning group that supplies the selected value and shared disabled state.
   *
   * @type {RadioGroupDirective<unknown>}
   */
  private readonly group: RadioGroupDirective<unknown> =
    inject<RadioGroupDirective>(RadioGroupDirective);

  /**
   * Property control
   * @readonly
   *
   * @description
   * Required native button reference used for focus management.
   *
   * @type {Signal<ElementRef<HTMLButtonElement>>}
   */
  private readonly control: Signal<ElementRef<HTMLButtonElement>> =
    viewChild.required<ElementRef<HTMLButtonElement>>('control');

  /**
   * Property checked
   * @readonly
   *
   * @description
   * Whether the group's selected value equals this option's value.
   *
   * @type {Signal<boolean>}
   */
  public readonly checked: Signal<boolean> = computed<boolean>((): boolean =>
    Object.is(this.group.value(), this.value()),
  );

  /**
   * Property isDisabled
   * @readonly
   *
   * @description
   * Whether this option or its containing group is disabled.
   *
   * @type {Signal<boolean>}
   */
  public readonly isDisabled: Signal<boolean> = computed<boolean>(
    (): boolean => this.disabled() || this.group.disabled(),
  );

  /**
   * Property tabbable
   * @readonly
   *
   * @description
   * Whether the group has selected this option as its single tab stop.
   *
   * @type {Signal<boolean>}
   */
  protected readonly tabbable: Signal<boolean> = computed<boolean>(
    (): boolean => this.group.tabbableItem() === this,
  );

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Host layout classes combined with caller-provided utilities.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn('inline-flex', this.class()),
  );

  /**
   * Property indicatorClasses
   * @readonly
   *
   * @description
   * Radio indicator styling, including group checked, invalid and focus-visible states; the unchecked
   * ring is `border-strong` for 3:1 against every surface (WCAG 1.4.11).
   *
   * @type {Signal<string>}
   */
  protected readonly indicatorClasses: Signal<string> = computed<string>((): string =>
    cn(
      'inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border-strong',
      'transition-[border-color,outline-color] duration-(--dur-pop) ease-orbit motion-reduce:transition-none',
      'outline-2 outline-offset-0 outline-transparent group-hover/radio:border-fg-faint',
      'group-aria-checked/radio:border-fg',
      this.group.invalid() && 'border-danger group-aria-checked/radio:border-danger',
      'group-focus-visible/radio:outline-accent/55',
    ),
  );
  // #endregion

  // #region Methods
  /**
   * Method focus
   * @method focus
   *
   * @description
   * Moves focus to the native button that implements this option.
   *
   * @param {FocusOptions} options - Native focus options forwarded to the button.
   * @returns {void} Focuses the option control.
   */
  public focus(options?: FocusOptions): void {
    this.control().nativeElement.focus(options);
  }

  /**
   * Method owns
   * @method owns
   *
   * @description
   * Checks whether an event target is this option's native button.
   *
   * @param {EventTarget | null} target - Target to compare with the button element.
   * @returns {boolean} Whether the target is the option control.
   */
  public owns(target: EventTarget | null): boolean {
    return this.control().nativeElement === target;
  }

  /**
   * Method select
   * @method select
   *
   * @description
   * Writes this option's value to the owning group when the option is enabled.
   *
   * @returns {void} Updates the group model when selection is allowed.
   */
  public select(): void {
    if (!this.isDisabled()) {
      this.group.value.set(this.value());
    }
  }
  // #endregion
}

/**
 * Directive RadioGroupDirective
 * @class RadioGroupDirective
 *
 * @description
 * Implements a one-tab-stop radio group with arrow-key selection, wrap-around and RTL handling.
 * The value can be bound with Signal Forms or the component's two-way model.
 */
@Directive({
  selector: '[uiRadioGroup]',
  host: {
    role: 'radiogroup',
    'data-slot': 'radio-group',
    '[class]': 'classes()',
    '[attr.aria-orientation]': 'orientation()',
    '[attr.aria-disabled]': 'disabled() || null',
    '[attr.aria-required]': 'required() || null',
    '[attr.aria-invalid]': 'invalid() || null',
    '(keydown)': 'onKeydown($event)',
    '(focusout)': 'onFocusout($event)',
  },
})
export class RadioGroupDirective<T = unknown> implements FormValueControl<T | null> {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Two-way selected value model; `null` represents no selected option.
   *
   * @type {ModelSignal<T | null>}
   */
  public readonly value: ModelSignal<T | null> = model<T | null>(null);

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Whether all options in the group are disabled.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly disabled: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    {
      transform: booleanAttribute,
    },
  );

  /**
   * Property invalid
   * @readonly
   *
   * @description
   * Whether the group is invalid, reflected by the host and option indicators.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly invalid: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    {
      transform: booleanAttribute,
    },
  );

  /**
   * Property required
   * @readonly
   *
   * @description
   * Whether a selected option is required for the group.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly required: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    {
      transform: booleanAttribute,
    },
  );

  /**
   * Property orientation
   * @readonly
   *
   * @description
   * Layout direction and corresponding `aria-orientation` of the group.
   *
   * @type {InputSignal<RadioGroupOrientation>}
   */
  public readonly orientation: InputSignal<RadioGroupOrientation> =
    input<RadioGroupOrientation>('vertical');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the selected group layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property touch
   * @readonly
   *
   * @description
   * Emits when focus leaves the group so Signal Forms can mark the control as touched.
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly touch: OutputEmitterRef<void> = output<void>();

  /**
   * Property items
   * @readonly
   *
   * @description
   * Descendant radio options owned by this group.
   *
   * @type {Signal<readonly RadioGroupItemComponent[]>}
   */
  public readonly items: Signal<readonly RadioGroupItemComponent[]> =
    contentChildren<RadioGroupItemComponent>(RadioGroupItemComponent, { descendants: true });

  /**
   * Property tabbableItem
   * @readonly
   *
   * @description
   * Checked enabled option, or the first enabled option when the group has no selection.
   *
   * @type {Signal<RadioGroupItemComponent | undefined>}
   */
  public readonly tabbableItem: Signal<RadioGroupItemComponent | undefined> = computed<
    RadioGroupItemComponent | undefined
  >((): RadioGroupItemComponent | undefined => {
    const enabled: RadioGroupItemComponent[] = this.items().filter(
      (item: RadioGroupItemComponent): boolean => !item.isDisabled(),
    );
    return enabled.find((item: RadioGroupItemComponent): boolean => item.checked()) ?? enabled[0];
  });

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Group layout classes selected by orientation and merged with caller utilities.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(radioGroupVariants({ orientation: this.orientation() }), this.class()),
  );

  /**
   * Property host
   * @readonly
   *
   * @description
   * Native group element used to determine when focus has left the radio group.
   *
   * @type {HTMLElement}
   */
  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Property keyManager
   * @readonly
   *
   * @description
   * CDK manager that wraps navigation, supports Home and End, and applies RTL arrow behavior.
   *
   * @type {FocusKeyManager<FocusableOption>}
   */
  private readonly keyManager: FocusKeyManager<{ focus: () => void; readonly disabled: boolean }> =
    new FocusKeyManager(
      computed<{ focus: () => void; readonly disabled: boolean }[]>(
        (): { focus: () => void; readonly disabled: boolean }[] =>
          this.items().map(
            (item: RadioGroupItemComponent): { focus: () => void; readonly disabled: boolean } => ({
              focus: (): void => item.focus(),
              get disabled(): boolean {
                return item.isDisabled();
              },
            }),
          ),
      ),
      inject<Injector>(Injector),
    )
      .withWrap()
      .withHomeAndEnd()
      .withHorizontalOrientation(inject<Directionality>(Directionality).value);
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Disposes the CDK key manager when Angular destroys the group.
   */
  public constructor() {
    inject<DestroyRef>(DestroyRef).onDestroy((): void => this.keyManager.destroy());
  }
  // #endregion

  // #region Methods
  /**
   * Method focus
   * @method focus
   *
   * @description
   * Moves focus to the group's selected tab stop when one is enabled.
   *
   * @param {FocusOptions} options - Native focus options forwarded to the selected control.
   * @returns {void} Focuses the group's current tab stop when present.
   */
  public focus(options?: FocusOptions): void {
    this.tabbableItem()?.focus(options);
  }

  /**
   * Method onKeydown
   * @method onKeydown
   *
   * @description
   * Delegates supported arrow and boundary keys to the CDK manager and selects the newly focused option.
   *
   * @param {KeyboardEvent} event - Key event originating from an option control.
   * @returns {void} Updates focus and selection for a recognized group key.
   */
  protected onKeydown(event: KeyboardEvent): void {
    const index: number = this.items().findIndex((item: RadioGroupItemComponent): boolean =>
      item.owns(event.target),
    );
    if (index < 0) {
      return;
    }
    this.keyManager.updateActiveItem(index);
    this.keyManager.onKeydown(event);
    const next: number | null = this.keyManager.activeItemIndex;
    if (next !== null && next !== index) {
      this.items()[next]?.select();
    }
  }

  /**
   * Method onFocusout
   * @method onFocusout
   *
   * @description
   * Emits the touch event when focus moves outside the group's native host.
   *
   * @param {FocusEvent} event - Focus transition from within the group.
   * @returns {void} Emits `touch` only when the destination is outside the host.
   */
  protected onFocusout(event: FocusEvent): void {
    if (!this.host.contains(event.relatedTarget as Node | null)) {
      this.touch.emit();
    }
  }
  // #endregion
}
