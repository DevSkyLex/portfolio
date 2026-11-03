import { _IdGenerator } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  booleanAttribute,
  computed,
  inject,
  input,
  model,
  output,
  viewChild,
  type InputSignal,
  type InputSignalWithTransform,
  type ModelSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import type { FormCheckboxControl } from '@angular/forms/signals';
import { NgIcon } from '@ng-icons/core';
import { lucideCheck, lucideMinus } from '@ng-icons/lucide';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { CONTROL_CLASSES } from '@internal/ui/lib/checkbox/constants/checkbox.constants';
import {
  type CheckboxSize,
  checkboxVariants,
} from '@internal/ui/lib/checkbox/constants/checkbox.variants';

/**
 * Component CheckboxComponent
 * @class CheckboxComponent
 *
 * @description
 * Implements the Signal Forms checkbox contract with a native input for browser keyboard and form
 * semantics. Bind the value with `[formField]` or `[(checked)]`, and associate a label using
 * `controlId`.
 */
@Component({
  selector: 'ui-checkbox',
  imports: [NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './checkbox.component.html',
  host: { '[class]': 'classes()', 'data-slot': 'checkbox' },
})
export class CheckboxComponent implements FormCheckboxControl {
  // #region Properties
  /**
   * Property checked
   *
   * @description
   * Checked form value exposed as a two-way model.
   *
   * @type {ModelSignal<boolean>}
   */
  public readonly checked: ModelSignal<boolean> = model<boolean>(false);

  /**
   * Property indeterminate
   *
   * @description
   * Mixed visual state; user changes clear it before updating the checked value.
   *
   * @type {ModelSignal<boolean>}
   */
  public readonly indeterminate: ModelSignal<boolean> = model<boolean>(false);

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Disables the native control and prevents user interaction.
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
   * Marks the native control invalid and applies the invalid appearance.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly invalid: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property required
   * @readonly
   *
   * @description
   * Marks the native control as required for browser and form validation.
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
   * Native form field name submitted by the browser.
   *
   * @type {InputSignal<string>}
   */
  public readonly name: InputSignal<string> = input<string>('');

  /**
   * Property size
   * @readonly
   *
   * @description
   * Wrapper dimensions and corresponding check or mixed icon size.
   *
   * @type {InputSignal<CheckboxSize>}
   */
  public readonly size: InputSignal<CheckboxSize> = input<CheckboxSize>('md');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the wrapper size classes.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property controlId
   * @readonly
   *
   * @description
   * Native input identifier used by its label and form field associations; generated when omitted.
   *
   * @type {InputSignal<string>}
   */
  public readonly controlId: InputSignal<string> = input<string>(
    inject<_IdGenerator>(_IdGenerator).getId('ui-checkbox-'),
  );

  /**
   * Property ariaLabel
   * @readonly
   *
   * @description
   * Optional accessible name for cases without a visible associated label.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly ariaLabel: InputSignal<string | undefined> = input<string>();

  /**
   * Property ariaLabelledby
   * @readonly
   *
   * @description
   * Optional identifiers of elements that label the native input.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly ariaLabelledby: InputSignal<string | undefined> = input<string>();

  /**
   * Property ariaDescribedby
   * @readonly
   *
   * @description
   * Optional identifiers of elements that describe the native input.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly ariaDescribedby: InputSignal<string | undefined> = input<string>();

  /**
   * Property touch
   * @readonly
   *
   * @description
   * Emits when the native control is touched through the form interaction contract.
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly touch: OutputEmitterRef<void> = output<void>();

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Check and minus glyphs rendered for checked and mixed values.
   */
  protected readonly icons: {
    readonly check: typeof lucideCheck;
    readonly minus: typeof lucideMinus;
  } = { check: lucideCheck, minus: lucideMinus } as const;

  /**
   * Property controlClasses
   * @readonly
   *
   * @description
   * Shared classes applied to the native checkbox input.
   *
   * @type {string}
   */
  protected readonly controlClasses: string = CONTROL_CLASSES;

  /**
   * Property iconSize
   * @readonly
   *
   * @description
   * Check glyph size selected for the wrapper size.
   *
   * @type {Signal<'12' | '14'>}
   */
  protected readonly iconSize: Signal<'12' | '14'> = computed<'12' | '14'>(() =>
    this.size() === 'sm' ? '12' : '14',
  );

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Wrapper size classes combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(checkboxVariants({ size: this.size() }), this.class()),
  );

  /**
   * Property control
   * @readonly
   *
   * @description
   * Required native input reference used to implement the public focus method.
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
   * Moves browser focus to the native checkbox input.
   *
   * @param {FocusOptions} options - Optional native focus behavior.
   *
   * @returns {void}
   */
  public focus(options?: FocusOptions): void {
    this.control().nativeElement.focus(options);
  }

  /**
   * Method onChange
   * @method onChange
   *
   * @description
   * Clears mixed state and publishes the native input's checked value after user interaction.
   *
   * @param {Event} event - Change event emitted by the native checkbox input.
   *
   * @returns {void}
   */
  protected onChange(event: Event): void {
    this.indeterminate.set(false);
    this.checked.set((event.target as HTMLInputElement).checked);
  }
  // #endregion
}
