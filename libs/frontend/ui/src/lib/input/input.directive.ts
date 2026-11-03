import {
  Directive,
  ElementRef,
  computed,
  inject,
  input,
  type InputSignal,
  type InputSignalWithTransform,
  type Signal,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { type InputSize, inputVariants } from '@internal/ui/lib/input/constants/input.variants';

/**
 * Directive InputDirective
 * @class InputDirective
 *
 * @description
 * Applies Orbite input styling to native input, textarea and select elements while preserving native control behavior.
 */
@Directive({
  selector: 'input[uiInput], textarea[uiInput], select[uiInput]',
  host: { '[class]': 'classes()', 'data-slot': 'input' },
})
export class InputDirective {
  // #region Properties
  /**
   * Property size
   * @readonly
   *
   * @description
   * Visual size variant applied to the native control; defaults to the medium layout.
   *
   * @type {InputSignal<InputSize>}
   */
  public readonly size: InputSignal<InputSize> = input<InputSize>('md');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional caller classes merged after the component's variant classes.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property multiline
   * @readonly
   *
   * @description
   * Enables free-height textarea styling; the attribute transform treats an empty attribute as true.
   *
   * @type {InputSignalWithTransform<boolean, boolean | '''}}
   */
  public readonly multiline: InputSignalWithTransform<boolean, boolean | ''> = input<
    boolean,
    boolean | ''
  >(false, {
    transform: (value: boolean | '') => value === '' || value,
  });

  /**
   * Property select
   * @readonly
   *
   * @description
   * Records whether the host is a native select so its variant reserves room for the parent-drawn arrow.
   *
   * @type {boolean}
   */
  private readonly select: boolean =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'SELECT';

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merges the selected control variants with caller-provided classes for the host binding.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      inputVariants({ size: this.size(), multiline: this.multiline(), select: this.select }),
      this.class(),
    ),
  );
  // #endregion
}
