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
import {
  type BadgeAppearance,
  type BadgeShape,
  type BadgeSize,
  type BadgeVariant,
  badgeVariants,
} from '@internal/ui/lib/badge/constants/badge.variants';

/**
 * Directive BadgeDirective
 * @class BadgeDirective
 *
 * @description
 * Applies compact label styling to inline text or link hosts: a colour family (`variant`), a treatment
 * (`appearance`), a shape, a size and an optional status dot; the defaults give the neutral outlined
 * 20 px badge.
 */
@Directive({
  selector: '[uiBadge]',
  host: {
    '[class]': 'classes()',
    '[attr.data-variant]': 'variant()',
    '[attr.data-appearance]': 'appearance()',
    'data-slot': 'badge',
  },
})
export class BadgeDirective {
  // #region Properties
  /**
   * Property variant
   * @readonly
   *
   * @description
   * Colour family: the neutral `default` (alias `outline`), `secondary`, a D37 status or `accent`.
   *
   * @type {InputSignal<BadgeVariant>}
   */
  public readonly variant: InputSignal<BadgeVariant> = input<BadgeVariant>('default');

  /**
   * Property appearance
   * @readonly
   *
   * @description
   * Treatment: `outline` (no fill, a hairline, the colour on the dot and icon), `ghost` (without the
   * hairline), `soft` (a tint and ink text) or `solid` (the fill and `on-fill` text).
   *
   * @type {InputSignal<BadgeAppearance>}
   */
  public readonly appearance: InputSignal<BadgeAppearance> = input<BadgeAppearance>('outline');

  /**
   * Property shape
   * @readonly
   *
   * @description
   * Corners: the D43 `xs` radius (`default`) or a `pill`.
   *
   * @type {InputSignal<BadgeShape>}
   */
  public readonly shape: InputSignal<BadgeShape> = input<BadgeShape>('default');

  /**
   * Property size
   * @readonly
   *
   * @description
   * Height: `sm` 20 px with 12 px text (default), `md` 24 px with 13 px text.
   *
   * @type {InputSignal<BadgeSize>}
   */
  public readonly size: InputSignal<BadgeSize> = input<BadgeSize>('sm');

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
    cn(
      badgeVariants({
        variant: this.variant(),
        appearance: this.appearance(),
        shape: this.shape(),
        size: this.size(),
        dot: this.dot(),
      }),
      this.class(),
    ),
  );
  // #endregion
}
