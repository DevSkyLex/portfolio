import {
  type InputSignal,
  type InputSignalWithTransform,
  type ModelSignal,
  type OutputEmitterRef,
  type Signal,
  Directive,
  ElementRef,
  booleanAttribute,
  computed,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import type { FormCheckboxControl } from '@angular/forms/signals';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { type SwitchSize, switchVariants } from '@internal/ui/lib/switch/constants/switch.variants';

/**
 * Directive SwitchDirective
 * @class SwitchDirective
 *
 * @description
 * Turns a native button into an accessible on/off switch with Signal Forms integration and checked-state model
 * binding. The label comes from a native label association or `aria-label`.
 */
@Directive({
  selector: 'button[uiSwitch]',
  host: {
    type: 'button',
    role: 'switch',
    'data-slot': 'switch',
    '[class]': 'classes()',
    '[attr.aria-checked]': 'checked()',
    '[attr.aria-invalid]': 'invalid() || null',
    '[attr.aria-required]': 'required() || null',
    '[attr.name]': 'name() || null',
    '[disabled]': 'disabled()',
    '(click)': 'toggle()',
    '(blur)': 'touch.emit()',
  },
})
export class SwitchDirective implements FormCheckboxControl {
  // #region Properties
  /**
   * Property checked
   * @readonly
   *
   * @description
   * Writable checked state exposed through `aria-checked` and the Signal Forms checkbox contract.
   *
   * @type {ModelSignal<boolean>}
   */
  public readonly checked: ModelSignal<boolean> = model<boolean>(false);

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Prevents user toggling and disables the native button when true.
   *
   * @type {import('@angular/core').InputSignalWithTransform<boolean, unknown>}
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
   * Reflects validation failure through the host's `aria-invalid` state.
   *
   * @type {import('@angular/core').InputSignalWithTransform<boolean, unknown>}
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
   * Reflects the required state through the host's `aria-required` attribute.
   *
   * @type {import('@angular/core').InputSignalWithTransform<boolean, unknown>}
   */
  public readonly required: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    {
      transform: booleanAttribute,
    },
  );

  /**
   * Property name
   * @readonly
   *
   * @description
   * Optional form name reflected to the native button when non-empty.
   *
   * @type {InputSignal<string>}
   */
  public readonly name: InputSignal<string> = input<string>('');

  /**
   * Property size
   * @readonly
   *
   * @description
   * Selects the compact or default track and thumb dimensions.
   *
   * @type {InputSignal<SwitchSize>}
   */
  public readonly size: InputSignal<SwitchSize> = input<SwitchSize>('md');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional caller classes merged after the switch variant classes.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property touch
   * @readonly
   *
   * @description
   * Emits when the native button blurs so Signal Forms can mark the control touched.
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly touch: OutputEmitterRef<void> = output<void>();

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merged switch size and caller classes bound to the host button.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(switchVariants({ size: this.size() }), this.class()),
  );

  /**
   * Property element
   * @readonly
   *
   * @description
   * Native switch button used by the public focus method.
   *
   * @type {HTMLButtonElement}
   */
  private readonly element: HTMLButtonElement =
    inject<ElementRef<HTMLButtonElement>>(ElementRef).nativeElement;
  // #endregion

  // #region Methods
  /**
   * Method focus
   * @method focus
   *
   * @description
   * Moves browser focus to the native button, forwarding standard focus options.
   *
   * @param {FocusOptions} options - Optional browser focus configuration.
   * @returns {void}
   */
  public focus(options?: FocusOptions): void {
    this.element.focus(options);
  }

  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Inverts checked state only while the control is enabled.
   *
   * @returns {void}
   */
  protected toggle(): void {
    if (!this.disabled()) {
      this.checked.update((checked: boolean): boolean => !checked);
    }
  }
  // #endregion
}
