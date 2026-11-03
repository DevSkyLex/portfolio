import { type InputSignal, type Signal, Directive, computed, input } from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';

/**
 * Directive SkeletonDirective
 * @class SkeletonDirective
 *
 * @description
 * Applies placeholder surface styling to the host and hides it from assistive technology.
 * Announce loading state on the containing element with `aria-busy`.
 */
@Directive({
  selector: '[uiSkeleton]',
  host: { '[class]': 'classes()', 'aria-hidden': 'true', 'data-slot': 'skeleton' },
})
export class SkeletonDirective {
  // #region Properties
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
   * Placeholder surface and pulse classes combined with caller-provided dimensions.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(
      'block rounded-sm bg-void-sunk inset-ring inset-ring-line',
      'animate-[pulse_var(--dur-pulse)_var(--ease-orbit-in-out)_infinite] motion-reduce:animate-none',
      this.class(),
    ),
  );
  // #endregion
}
