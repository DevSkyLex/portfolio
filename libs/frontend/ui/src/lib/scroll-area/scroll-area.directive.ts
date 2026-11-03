import { type InputSignal, type Signal, Directive, computed, input } from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import {
  type ScrollAreaOrientation,
  scrollAreaVariants,
} from '@internal/ui/lib/scroll-area/constants/scroll-area.variants';

/**
 * Directive ScrollAreaDirective
 * @class ScrollAreaDirective
 *
 * @description
 * Adds themed scrolling and keyboard focus to a native container. It exposes the ARIA region role only when a label
 * or labelled-by reference names the container.
 */
@Directive({
  selector: '[uiScrollArea]',
  host: {
    tabindex: '0',
    '[class]': 'classes()',
    'data-slot': 'scroll-area',
    '[attr.role]': 'label() || labelledBy() ? "region" : null',
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-labelledby]': 'labelledBy() || null',
  },
})
export class ScrollAreaDirective {
  // #region Properties
  /**
   * Property orientation
   * @readonly
   *
   * @description
   * Determines whether the host scrolls vertically, horizontally, or on both axes.
   *
   * @type {InputSignal<ScrollAreaOrientation>}
   */
  public readonly orientation: InputSignal<ScrollAreaOrientation> =
    input<ScrollAreaOrientation>('vertical');

  /**
   * Property label
   * @readonly
   *
   * @description
   * Optional accessible name; when non-empty, the host receives the region role and `aria-label`.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly label: InputSignal<string | undefined> = input<string>();

  /**
   * Property labelledBy
   * @readonly
   *
   * @description
   * Optional id reference used to name the region through `aria-labelledby`.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly labelledBy: InputSignal<string | undefined> = input<string>();

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional caller classes merged after the orientation styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merged scrollbar and caller classes applied to the host element.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(scrollAreaVariants({ orientation: this.orientation() }), this.class()),
  );
  // #endregion
}
