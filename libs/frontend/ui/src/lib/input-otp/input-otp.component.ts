import { _IdGenerator } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  type ElementRef,
  booleanAttribute,
  computed,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
  viewChild,
  type InputSignal,
  type InputSignalWithTransform,
  type ModelSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { NgIcon } from '@ng-icons/core';
import { lucideMinus } from '@ng-icons/lucide';
import type { FieldHost } from '@internal/ui/lib/field/models/field/field-host.interface';
import { FIELD_HOST } from '@internal/ui/lib/field/tokens/field/field.token';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import {
  type InputOtpSize,
  inputOtpSlotVariants,
} from '@internal/ui/lib/input-otp/constants/input-otp-slot.variants';

/**
 * Component InputOtpComponent
 * @class InputOtpComponent
 *
 * @description
 * Provides one native one-time-code input for autofill, paste and assistive technology, with projected visual slots.
 * Bind its value through Signal Forms or the model signal; the transparent input remains the semantic control.
 *
 * ```html
 * <ui-input-otp [length]="6">
 *   <div uiInputOtpGroup><ui-input-otp-slot [index]="0" />…</div>
 *   <ui-input-otp-separator />
 * </ui-input-otp>
 * ```
 */
@Component({
  selector: 'ui-input-otp',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './input-otp.component.html',
  host: { '[class]': 'classes()', 'data-slot': 'input-otp' },
})
export class InputOtpComponent implements FormValueControl<string> {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Current code value, exposed as a model signal for Signal Forms and two-way binding.
   *
   * @type {ModelSignal<string>}
   */
  public readonly value: ModelSignal<string> = model<string>('');

  /**
   * Property length
   * @readonly
   *
   * @description
   * Number of accepted code characters; the input transform converts attribute text to a number.
   *
   * @type {InputSignalWithTransform<number, unknown>}
   */
  public readonly length: InputSignalWithTransform<number, unknown> = input<number, unknown>(6, {
    transform: numberAttribute,
  });

  /**
   * Property charPattern
   * @readonly
   *
   * @description
   * Regular expression applied separately to each incoming character; characters that fail it are discarded.
   *
   * @type {InputSignal<RegExp>}
   */
  public readonly charPattern: InputSignal<RegExp> = input<RegExp>(/\d/);

  /**
   * Property inputMode
   * @readonly
   *
   * @description
   * Native keyboard hint for the single semantic input.
   *
   * @type {InputSignal<'numeric' | 'text'>}
   */
  public readonly inputMode: InputSignal<'text' | 'numeric'> = input<'numeric' | 'text'>('numeric');

  /**
   * Property size
   * @readonly
   *
   * @description
   * Visual cell size applied consistently to each projected OTP slot.
   *
   * @type {InputSignal<InputOtpSize>}
   */
  public readonly size: InputSignal<InputOtpSize> = input<InputOtpSize>('md');

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Disables the native code input; the boolean attribute transform supports an empty HTML attribute.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly disabled: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property invalid
   * @readonly
   *
   * @description
   * Marks the OTP control invalid for visual styling and the native `aria-invalid` binding.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly invalid: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property touched
   * @readonly
   *
   * @description
   * Whether the control was visited. Signal Forms binds it, so an empty required code only turns red
   * once the field is left or the form submitted, like the native fields; unbound, `invalid` shows at
   * once.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly touched: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    true,
    { transform: booleanAttribute },
  );

  /**
   * Property showInvalid
   * @readonly
   *
   * @description
   * Invalid state as displayed: invalid and touched, or the error shown by the enclosing `ui-field`
   * (a server answer such as a wrong code).
   *
   * @type {Signal<boolean>}
   */
  public readonly showInvalid: Signal<boolean> = computed<boolean>(
    () => (this.invalid() && this.touched()) || !!this.field?.invalid(),
  );

  /**
   * Property field
   * @readonly
   *
   * @description
   * Enclosing `ui-field`, if any.
   *
   * @type {FieldHost | null}
   */
  private readonly field: FieldHost | null = inject<FieldHost>(FIELD_HOST, { optional: true });

  /**
   * Property required
   * @readonly
   *
   * @description
   * Sets the native required state for form validation.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly required: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property name
   * @readonly
   *
   * @description
   * Native form-control name; an empty value is omitted from the input element.
   *
   * @type {InputSignal<string>}
   */
  public readonly name: InputSignal<string> = input<string>('');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional caller classes merged onto the component host.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property controlId
   * @readonly
   *
   * @description
   * Native input id generated once per application when the caller does not provide an explicit id.
   *
   * @type {InputSignal<string>}
   */
  public readonly controlId: InputSignal<string> = input<string>(
    inject<_IdGenerator>(_IdGenerator).getId('ui-input-otp-'),
  );

  /**
   * Property ariaLabel
   * @readonly
   *
   * @description
   * Default French accessible name, used only when no visible label id is supplied.
   *
   * @type {InputSignal<string>}
   */
  public readonly ariaLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.input-otp.label:Code à usage unique`,
  );

  /**
   * Property ariaLabelledby
   * @readonly
   *
   * @description
   * Optional id reference to a visible label, which takes precedence over the default accessible name.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly ariaLabelledby: InputSignal<string | undefined> = input<string>();

  /**
   * Property ariaDescribedby
   * @readonly
   *
   * @description
   * Optional id reference to descriptive text associated with the native input.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly ariaDescribedby: InputSignal<string | undefined> = input<string>();

  /**
   * Property touch
   * @readonly
   *
   * @description
   * Emits when the native input loses focus so a form control can be marked touched.
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly touch: OutputEmitterRef<void> = output<void>();

  /**
   * Property completed
   * @readonly
   *
   * @description
   * Emits the accepted code whenever its length reaches the configured number of slots.
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly completed: OutputEmitterRef<string> = output<string>();

  /**
   * Property focused
   * @readonly
   *
   * @description
   * Tracks whether the native input is focused so the visual slots can expose one active caret.
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly focused: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property chars
   * @readonly
   *
   * @description
   * Current code split into display characters for projected slot components.
   *
   * @type {Signal<string[]>}
   */
  public readonly chars: Signal<string[]> = computed<string[]>(() => [...this.value()]);

  /**
   * Property activeIndex
   * @readonly
   *
   * @description
   * Active visual slot while focused; it follows the next character and clamps to the last slot when full.
   *
   * @type {Signal<number>}
   */
  public readonly activeIndex: Signal<number> = computed<number>(() =>
    this.focused() ? Math.min(this.chars().length, this.length() - 1) : -1,
  );

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merges component host layout classes with caller-provided classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('relative flex w-full items-center gap-2 has-[input:disabled]:opacity-50', this.class()),
  );

  /**
   * Property control
   * @readonly
   *
   * @description
   * Required reference to the overlaid native input used by focus, selection and input handlers.
   *
   * @type {Signal<ElementRef<HTMLInputElement>>}
   */
  private readonly control: Signal<ElementRef<HTMLInputElement>> =
    viewChild.required<ElementRef<HTMLInputElement>>('control');
  // #endregion

  // #region Methods
  /**
   * Method focus
   * @method focus
   *
   * @description
   * Moves focus to the native input and forwards browser focus options.
   *
   * @param {FocusOptions} options - Native focus options, such as whether scrolling should occur.
   *
   * @returns {void}
   */
  public focus(options?: FocusOptions): void {
    this.control().nativeElement.focus(options);
  }

  /**
   * Method onInput
   * @method onInput
   *
   * @description
   * Sends the native input value through the shared character filter and length bound.
   *
   * @param {Event} event - Native input event from the single semantic control.
   *
   * @returns {void}
   */
  protected onInput(event: Event): void {
    this.write(event.target as HTMLInputElement, (event.target as HTMLInputElement).value);
  }

  /**
   * Method onPaste
   * @method onPaste
   *
   * @description
   * Prevents native insertion and replaces the current code with clipboard text after character filtering.
   *
   * @param {ClipboardEvent} event - Paste event providing clipboard text for the replacement value.
   *
   * @returns {void}
   */
  protected onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    this.write(event.target as HTMLInputElement, event.clipboardData?.getData('text') ?? '');
  }

  /**
   * Method onKeydown
   * @method onKeydown
   *
   * @description
   * Prevents arrow, Home and End navigation so the native caret stays aligned with the visual slot model.
   *
   * @param {KeyboardEvent} event - Key event from the native input.
   *
   * @returns {void}
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
    }
  }

  /**
   * Method moveCaretToEnd
   * @method moveCaretToEnd
   *
   * @description
   * Places the native caret after the current value to match the visual OTP slots.
   *
   * @returns {void}
   */
  protected moveCaretToEnd(): void {
    const element: HTMLInputElement = this.control().nativeElement;
    element.setSelectionRange(element.value.length, element.value.length);
  }

  /**
   * Method write
   * @method write
   *
   * @description
   * Filters each character with a non-global copy of the configured pattern, truncates to the slot count,
   * updates the native and model values, and emits completion when the code is full.
   *
   * @param {HTMLInputElement} element - Native input whose value is synchronized with the model.
   * @param {string} raw - Unfiltered input or clipboard text.
   *
   * @returns {void}
   */
  private write(element: HTMLInputElement, raw: string): void {
    // A global regex would keep its lastIndex between characters.
    const { source, flags } = this.charPattern();
    const accepted: RegExp = new RegExp(source, flags.replace('g', ''));
    const next: string = [...raw]
      .filter((char) => accepted.test(char))
      .join('')
      .slice(0, this.length());
    element.value = next;
    this.value.set(next);
    if (next.length === this.length()) {
      this.completed.emit(next);
    }
  }
  // #endregion
}

/**
 * Directive InputOtpGroupDirective
 * @class InputOtpGroupDirective
 *
 * @description
 * Lays out projected OTP slots as a joined row while keeping the input semantics in the parent component.
 */
@Directive({
  selector: '[uiInputOtpGroup]',
  host: { '[class]': 'classes()', 'data-slot': 'input-otp-group' },
})
export class InputOtpGroupDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional caller classes merged into the joined slot row.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Provides the horizontal slot-row layout with caller classes merged in.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('flex min-w-0 flex-1 items-center', this.class()),
  );
  // #endregion
}

/**
 * Component InputOtpSlotComponent
 * @class InputOtpSlotComponent
 *
 * @description
 * Renders one aria-hidden visual character cell; accessible input semantics remain on the parent's native input.
 */
@Component({
  selector: 'ui-input-otp-slot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    {{ char() }}
    @if (caret()) {
      <span class="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span class="h-5 w-px bg-fill motion-safe:animate-pulse"></span>
      </span>
    }
  `,
  host: {
    'aria-hidden': 'true',
    'data-slot': 'input-otp-slot',
    '[class]': 'classes()',
    '[attr.data-active]': 'active() || null',
  },
})
export class InputOtpSlotComponent {
  // #region Properties
  /**
   * Property index
   * @readonly
   *
   * @description
   * Zero-based position represented by this slot in the parent code value.
   *
   * @type {InputSignalWithTransform<number, unknown>}
   */
  public readonly index: InputSignalWithTransform<number, unknown> = input.required<
    number,
    unknown
  >({ transform: numberAttribute });

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional caller classes merged into the visual slot styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property otp
   * @readonly
   *
   * @description
   * Parent OTP component providing the value, active index, invalid state and shared size.
   *
   * @type {InputOtpComponent}
   */
  private readonly otp: InputOtpComponent = inject<InputOtpComponent>(InputOtpComponent);

  /**
   * Property char
   * @readonly
   *
   * @description
   * Character displayed at this slot, or an empty string when the code has not reached this position.
   *
   * @type {Signal<string>}
   */
  protected readonly char: Signal<string> = computed<string>(
    () => this.otp.chars()[this.index()] ?? '',
  );

  /**
   * Property active
   * @readonly
   *
   * @description
   * Whether the parent currently places its visual caret in this slot.
   *
   * @type {Signal<boolean>}
   */
  protected readonly active: Signal<boolean> = computed<boolean>(
    () => this.otp.activeIndex() === this.index(),
  );

  /**
   * Property caret
   * @readonly
   *
   * @description
   * Whether this slot is active and empty, which displays the pulsing visual caret.
   *
   * @type {Signal<boolean>}
   */
  protected readonly caret: Signal<boolean> = computed<boolean>(
    () => this.active() && this.char() === '',
  );

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Resolves the parent's size and validation state with this slot's active state and caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      inputOtpSlotVariants({
        size: this.otp.size(),
        active: this.active(),
        invalid: this.otp.showInvalid(),
      }),
      this.class(),
    ),
  );
  // #endregion
}

/**
 * Component InputOtpSeparatorComponent
 * @class InputOtpSeparatorComponent
 *
 * @description
 * Displays a decorative dash between groups of visual OTP slots; it is hidden from assistive technology.
 */
@Component({
  selector: 'ui-input-otp-separator',
  imports: [NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-icon [svg]="icons.minus" size="16" aria-hidden="true" />`,
  host: {
    'aria-hidden': 'true',
    'data-slot': 'input-otp-separator',
    class: 'flex items-center text-fg-faint',
  },
})
export class InputOtpSeparatorComponent {
  // #region Properties
  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide minus icon supplied to the separator template.
   *
   * @type {{ readonly minus: typeof lucideMinus }}
   */
  protected readonly icons: { readonly minus: typeof lucideMinus } = {
    minus: lucideMinus,
  } as const;
  // #endregion
}
