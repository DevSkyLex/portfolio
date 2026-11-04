import {
  ChangeDetectionStrategy,
  Component,
  type InputSignal,
  type Signal,
  computed,
  input,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';

/**
 * Component CountBadgeComponent
 * @component CountBadgeComponent
 *
 * @description
 * Grey count beside a label (unread messages, fields to complete): the figure alone, no dot or icon,
 * capped at `max` (« 99+ »). The figure is the visible text; the caller projects the spoken words
 * (`<span class="sr-only"> non lus</span>`) so the accessible name stays a sentence. Classes passed
 * through `class` are merged, so a compact placement (the collapsed sidebar rail) can resize it.
 */
@Component({
  selector: 'ui-count-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-slot': 'count-badge', '[class]': 'classes()' },
  template: `{{ label() }}<ng-content />`,
})
export class CountBadgeComponent {
  // #region Properties
  /**
   * Property count
   * @readonly
   *
   * @description
   * Number shown, a non-negative integer.
   *
   * @type {InputSignal<number>}
   */
  public readonly count: InputSignal<number> = input.required<number>();

  /**
   * Property max
   * @readonly
   *
   * @description
   * Largest figure written in full; above it the badge reads « max+ ».
   *
   * @type {InputSignal<number>}
   */
  public readonly max: InputSignal<number> = input<number>(99);

  /**
   * Property class
   * @readonly
   *
   * @description
   * Extra classes merged over the defaults.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property label
   * @readonly
   *
   * @description
   * Visible figure, capped.
   *
   * @type {Signal<string>}
   */
  protected readonly label: Signal<string> = computed<string>((): string =>
    this.count() > this.max() ? `${this.max()}+` : String(this.count()),
  );

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Neutral fill (`surface-selected`, D41) and muted ink, the badge height and radius (D43).
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(
      'inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-xs bg-surface-selected px-1.5 text-[11px]/4 font-medium whitespace-nowrap text-fg-muted tabular-nums',
      this.class(),
    ),
  );
  // #endregion
}
