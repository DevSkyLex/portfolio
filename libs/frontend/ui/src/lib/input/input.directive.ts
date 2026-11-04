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
import { reflectFieldInvalid } from '@internal/ui/lib/field/utils/field-invalid/field-invalid.utils';
import {
  INPUT_GROUP_CONTROL_CLASSES,
  INPUT_GROUP_TEXTAREA_CLASSES,
} from '@internal/ui/lib/input/constants/input-group-control.constants';
import { INPUT_GROUP_HOST } from '@internal/ui/lib/input/tokens/input-group-host.token';

/**
 * Directive InputDirective
 * @class InputDirective
 *
 * @description
 * Applies Orbite input styling to native input, textarea and select elements while preserving
 * native control behavior. Inside a `uiInputGroup`, directly or through a catalogue control built on
 * it (`ui-autocomplete`), the control drops its own frame and becomes the group control: the group
 * draws the border, focus ring and invalid state around it and its addons.
 */
@Directive({
  selector: 'input[uiInput], textarea[uiInput], select[uiInput]',
  host: {
    '[class]': 'classes()',
    '[attr.data-slot]': 'group ? "input-group-control" : "input"',
  },
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
   * Property group
   * @readonly
   *
   * @description
   * Whether an input group encloses the control (`INPUT_GROUP_HOST`): its frame replaces the
   * control's own.
   *
   * @type {boolean}
   */
  protected readonly group: boolean = inject<true>(INPUT_GROUP_HOST, { optional: true }) ?? false;

  /**
   * Property tag
   * @readonly
   *
   * @description
   * Tag of the host: a native select reserves room for the parent-drawn arrow, a textarea keeps its
   * own height in a group.
   *
   * @type {string}
   */
  private readonly tag: string = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName;

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merges the selected control variants, or the frameless group control classes, with caller-provided
   * classes for the host binding.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    this.group
      ? cn(
          INPUT_GROUP_CONTROL_CLASSES,
          this.tag === 'TEXTAREA' && INPUT_GROUP_TEXTAREA_CLASSES,
          this.class(),
        )
      : cn(
          inputVariants({
            size: this.size(),
            multiline: this.multiline(),
            select: this.tag === 'SELECT',
          }),
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
}
