import { type InputSignal, type Signal, Directive, computed, input } from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import {
  type SkeletonShape,
  skeletonVariants,
} from '@internal/ui/lib/skeleton/constants/skeleton.variants';

/**
 * Directive SkeletonDirective
 * @class SkeletonDirective
 *
 * @description
 * Placeholder of content still loading, hidden from assistive technology: announce the loading state on
 * the containing element (`aria-busy`, or a polite status). The caller sets the size through `class`
 * (`w-40` for a text line, `size-8` for a circle); the shape rounds it.
 */
@Directive({
  selector: '[uiSkeleton]',
  host: {
    '[class]': 'classes()',
    '[attr.data-shape]': 'shape()',
    'aria-hidden': 'true',
    'data-slot': 'skeleton',
  },
})
export class SkeletonDirective {
  // #region Properties
  /**
   * Property shape
   * @readonly
   *
   * @description
   * Outline of the placeholder: `block` (default), `text` line or `circle`.
   *
   * @type {InputSignal<SkeletonShape>}
   */
  public readonly shape: InputSignal<SkeletonShape> = input<SkeletonShape>('block');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Placeholder dimensions and any additional utility classes supplied by the consumer.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Shimmer and shape classes merged with the caller's dimensions; a caller radius wins.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(skeletonVariants({ shape: this.shape() }), this.class()),
  );
  // #endregion
}
