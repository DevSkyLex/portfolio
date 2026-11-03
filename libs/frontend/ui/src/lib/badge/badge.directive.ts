import {
  Directive,
  booleanAttribute,
  computed,
  input,
  type InputSignal,
  type InputSignalWithTransform,
  type Signal,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { type BadgeVariant, badgeVariants } from '@internal/ui/lib/badge/constants/badge.variants';

/**
 * Directive BadgeDirective
 * @class BadgeDirective
 *
 * @description
 * Applies compact label styling and a selected visual variant to inline text or link hosts.
 */
@Directive({
  selector: '[uiBadge]',
  host: { '[class]': 'classes()', '[attr.data-variant]': 'variant()', 'data-slot': 'badge' },
})
export class BadgeDirective {
  // #region Properties
  /**
   * Property variant
   * @readonly
   *
   * @description
   * Visual treatment selected from the badge variant set.
   *
   * @type {InputSignal<BadgeVariant>}
   */
  public readonly variant: InputSignal<BadgeVariant> = input<BadgeVariant>('default');

  /**
   * Property dot
   * @readonly
   *
   * @description
   * Draws a status dot in the badge colour before the label ("Publié", "Non lu").
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly dot: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(false, {
    transform: booleanAttribute,
  });

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the selected badge styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Selected variant classes combined with caller classes for the host.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(badgeVariants({ variant: this.variant(), dot: this.dot() }), this.class()),
  );
  // #endregion
}
