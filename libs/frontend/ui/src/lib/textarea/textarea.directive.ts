import {
  type InputSignal,
  type InputSignalWithTransform,
  type Signal,
  Directive,
  booleanAttribute,
  computed,
  input,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { type InputSize, inputVariants } from '@internal/ui/lib/input/constants/input.variants';
import { textareaVariants } from '@internal/ui/lib/textarea/constants/textarea.variants';

/**
 * Directive TextareaDirective
 * @class TextareaDirective
 *
 * @description
 * Applies Orbite input and multiline sizing classes to a native textarea element.
 */
@Directive({
  selector: 'textarea[uiTextarea]',
  host: { '[class]': 'classes()', 'data-slot': 'textarea' },
})
export class TextareaDirective {
  // #region Properties
  /**
   * Property size
   * @readonly
   *
   * @description
   * Input dimensions shared with the single-line input component.
   *
   * @type {InputSignal<InputSize>}
   */
  public readonly size: InputSignal<InputSize> = input<InputSize>('md');

  /**
   * Property autoResize
   * @readonly
   *
   * @description
   * Whether the textarea grows with its content when browser field sizing is available.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly autoResize: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
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
   * Additional utility classes merged with the input and textarea size classes.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Multiline input classes combining shared input styling, resize behavior and caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(
      inputVariants({ size: this.size(), multiline: true }),
      textareaVariants({ size: this.size(), autoResize: this.autoResize() }),
      this.class(),
    ),
  );
  // #endregion
}
