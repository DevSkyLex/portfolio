import { Directive, computed, input, type InputSignal, type Signal } from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import type { AspectRatioValue } from '@internal/ui/lib/aspect-ratio/models/aspect-ratio/aspect-ratio-value.type';
import { parseAspectRatio } from '@internal/ui/lib/aspect-ratio/utils/aspect-ratio/aspect-ratio.utils';

/**
 * Directive AspectRatioDirective
 * @class AspectRatioDirective
 *
 * @description
 * Applies a parsed CSS aspect ratio to a box and positions its direct children to fill that box.
 */
@Directive({
  selector: '[uiAspectRatio]',
  host: {
    '[class]': 'classes()',
    '[style.aspect-ratio]': 'value()',
    'data-slot': 'aspect-ratio',
  },
})
export class AspectRatioDirective {
  // #region Properties
  /**
   * Property ratio
   * @readonly
   *
   * @description
   * Numeric or slash-separated width-to-height ratio; invalid values resolve to a square box.
   *
   * @type {InputSignal<AspectRatioValue>}
   */
  public readonly ratio: InputSignal<AspectRatioValue> = input<AspectRatioValue>(1);

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the box layout utilities.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property value
   * @readonly
   *
   * @description
   * Parsed CSS ratio recomputed when the input changes.
   *
   * @type {Signal<number>}
   */
  protected readonly value: Signal<number> = computed<number>(() => parseAspectRatio(this.ratio()));

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Box and child-fill utilities combined with the caller's additional classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      'relative block w-full overflow-hidden [&>*]:absolute [&>*]:inset-0 [&>*]:size-full [&>img]:object-cover [&>video]:object-cover',
      this.class(),
    ),
  );
  // #endregion
}
