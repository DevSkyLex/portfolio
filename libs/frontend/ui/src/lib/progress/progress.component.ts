import {
  type InputSignal,
  type Signal,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import type { ProgressState } from '@internal/ui/lib/progress/models/progress/progress-state.type';
import {
  type ProgressSize,
  progressVariants,
} from '@internal/ui/lib/progress/constants/progress.variants';

/**
 * Component ProgressComponent
 * @class ProgressComponent
 *
 * @description
 * Renders a determinate or indeterminate progress bar with matching accessible value attributes.
 * A missing or non-finite value leaves `aria-valuenow` unset and animates the indicator.
 */
@Component({
  selector: 'ui-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    role: 'progressbar',
    'aria-valuemin': '0',
    '[attr.aria-valuemax]': 'maximum()',
    '[attr.aria-valuenow]': 'current()',
    '[attr.aria-valuetext]': 'valueText() || null',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.data-state]': 'state()',
    'data-slot': 'progress',
  },
  template: `<span
    [class]="indicatorClasses()"
    [style.transform]="'scaleX(' + ratio() + ')'"
    data-slot="progress-indicator"
  ></span>`,
})
export class ProgressComponent {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Current progress amount; `null` or a non-finite value selects indeterminate rendering.
   *
   * @type {InputSignal<number | null>}
   */
  public readonly value: InputSignal<number | null> = input<number | null>(null);

  /**
   * Property max
   * @readonly
   *
   * @description
   * Upper bound for the progress value; invalid bounds fall back to 100.
   *
   * @type {InputSignal<number>}
   */
  public readonly max: InputSignal<number> = input<number>(100);

  /**
   * Property size
   * @readonly
   *
   * @description
   * Track thickness variant used by the progress bar.
   *
   * @type {InputSignal<ProgressSize>}
   */
  public readonly size: InputSignal<ProgressSize> = input<ProgressSize>('md');

  /**
   * Property ariaLabel
   * @readonly
   *
   * @description
   * Accessible name for the bar; pass `null` when `aria-labelledby` names it instead.
   *
   * @type {InputSignal<string | null>}
   */
  public readonly ariaLabel: InputSignal<string | null> = input<string | null>(
    $localize`:@@ui.progress.label:Progression`,
  );

  /**
   * Property valueText
   * @readonly
   *
   * @description
   * Optional spoken description for values whose meaning is not clear from the number alone.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly valueText: InputSignal<string | undefined> = input<string>();

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional utility classes merged with the selected track size.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property maximum
   * @readonly
   *
   * @description
   * Positive finite upper bound used for clamping and the `aria-valuemax` attribute.
   *
   * @type {Signal<number>}
   */
  protected readonly maximum: Signal<number> = computed<number>((): number => {
    const max: number = this.max();
    return Number.isFinite(max) && max > 0 ? max : 100;
  });

  /**
   * Property current
   * @readonly
   *
   * @description
   * Finite progress value clamped between zero and the normalized maximum.
   *
   * @type {Signal<number | null>}
   */
  protected readonly current: Signal<number | null> = computed<number | null>((): number | null => {
    const value: number | null = this.value();
    return value === null || !Number.isFinite(value)
      ? null
      : Math.min(Math.max(value, 0), this.maximum());
  });

  /**
   * Property ratio
   * @readonly
   *
   * @description
   * Scale ratio for the indicator; indeterminate progress keeps the indicator fully scaled.
   *
   * @type {Signal<number>}
   */
  protected readonly ratio: Signal<number> = computed<number>((): number => {
    const value: number | null = this.current();
    return value === null ? 1 : value / this.maximum();
  });

  /**
   * Property state
   * @readonly
   *
   * @description
   * Determines whether the bar is indeterminate, still loading, or has reached its maximum.
   *
   * @type {Signal<ProgressState>}
   */
  protected readonly state: Signal<ProgressState> = computed<ProgressState>(
    (): 'indeterminate' | 'loading' | 'complete' => {
      const value: number | null = this.current();
      if (value === null) {
        return 'indeterminate';
      }
      return value >= this.maximum() ? 'complete' : 'loading';
    },
  );

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Track classes combining the selected size variant and caller-provided classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(progressVariants({ size: this.size() }), this.class()),
  );

  /**
   * Property indicatorClasses
   * @readonly
   *
   * @description
   * Indicator animation classes, including a pulse only for indeterminate progress.
   *
   * @type {Signal<string>}
   */
  protected readonly indicatorClasses: Signal<string> = computed<string>((): string =>
    cn(
      'block size-full origin-left bg-accent transition-transform duration-(--dur-roll) ease-orbit motion-reduce:transition-none',
      this.current() === null &&
        'animate-[pulse_var(--dur-pulse)_var(--ease-orbit-in-out)_infinite] motion-reduce:animate-none',
    ),
  );
  // #endregion
}
