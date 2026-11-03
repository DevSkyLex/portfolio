import {
  type InputSignal,
  type InputSignalWithTransform,
  type Signal,
  Directive,
  computed,
  input,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import type { SeparatorOrientation } from '@internal/ui/lib/separator/models/separator/separator-orientation.type';

/**
 * Directive SeparatorDirective
 * @class SeparatorDirective
 *
 * @description
 * Renders a horizontal or vertical rule that is decorative unless explicitly exposed as a separator.
 */
@Directive({
  selector: '[uiSeparator]',
  host: {
    '[class]': 'classes()',
    '[attr.role]': 'decorative() ? "none" : "separator"',
    '[attr.aria-orientation]': 'decorative() ? null : orientation()',
    '[attr.data-orientation]': 'orientation()',
    'data-slot': 'separator',
  },
})
export class SeparatorDirective {
  // #region Properties
  /**
   * Property orientation
   * @readonly
   *
   * @description
   * Axis of the line and the corresponding `aria-orientation` value when semantic.
   *
   * @type {InputSignal<SeparatorOrientation>}
   */
  public readonly orientation: InputSignal<SeparatorOrientation> =
    input<SeparatorOrientation>('horizontal');

  /**
   * Property decorative
   * @readonly
   *
   * @description
   * Whether the host is hidden from assistive technology instead of exposing separator semantics.
   *
   * @type {InputSignalWithTransform<boolean, boolean | '''}}
   */
  public readonly decorative: InputSignalWithTransform<boolean, boolean | ''> = input<
    boolean,
    boolean | ''
  >(true, {
    transform: (value: boolean | ''): value is true | '' => value === '' || value,
  });

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the orientation-specific line layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Borderless line classes sized along the selected orientation.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(
      'm-0 shrink-0 border-0 bg-line',
      this.orientation() === 'horizontal' ? 'h-px w-full' : 'h-full min-h-4 w-px self-stretch',
      this.class(),
    ),
  );
  // #endregion
}
