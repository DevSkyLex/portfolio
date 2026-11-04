import { Directive, computed, input, type InputSignal, type Signal } from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { type AlertVariant, alertVariants } from '@internal/ui/lib/alert/constants/alert.variants';

/**
 * Directive AlertDirective
 * @class AlertDirective
 *
 * @description
 * Styles an alert message container with a default or danger variant and exposes its announcement
 * role. Use `status` for polite updates or `null` for content that should not be announced.
 */
@Directive({
  selector: '[uiAlert]',
  host: {
    '[class]': 'classes()',
    '[attr.role]': 'role()',
    '[attr.data-variant]': 'variant()',
    'data-slot': 'alert',
  },
})
export class AlertDirective {
  // #region Properties
  /**
   * Property variant
   * @readonly
   *
   * @description
   * Visual appearance selected from the alert variant set.
   *
   * @type {InputSignal<AlertVariant>}
   */
  public readonly variant: InputSignal<AlertVariant> = input<AlertVariant>('default');

  /**
   * Property role
   * @readonly
   *
   * @description
   * Announcement role applied to the host; `null` leaves the message static.
   *
   * @type {InputSignal<'alert' | 'status' | null>}
   */
  public readonly role: InputSignal<'alert' | 'status' | null> = input<'alert' | 'status' | null>(
    'alert',
  );

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the selected alert appearance.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Variant and caller classes applied to the alert host.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(alertVariants({ variant: this.variant() }), this.class()),
  );
  // #endregion
}

/**
 * Directive AlertTitleDirective
 * @class AlertTitleDirective
 *
 * @description
 * Positions and styles the heading of an alert message.
 */
@Directive({
  selector: '[uiAlertTitle]',
  host: { '[class]': 'classes()', 'data-slot': 'alert-title' },
})
export class AlertTitleDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the title layout and typography.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Grid placement and alert-title typography combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      'col-start-2 min-h-5 text-control text-fg group-data-[variant=danger]/alert:text-danger-ink group-data-[variant=info]/alert:text-info-ink group-data-[variant=success]/alert:text-success-ink group-data-[variant=warning]/alert:text-warning-ink',
      this.class(),
    ),
  );
  // #endregion
}

/**
 * Directive AlertDescriptionDirective
 * @class AlertDescriptionDirective
 *
 * @description
 * Positions and styles supporting copy within an alert message.
 */
@Directive({
  selector: '[uiAlertDescription]',
  host: { '[class]': 'classes()', 'data-slot': 'alert-description' },
})
export class AlertDescriptionDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the description layout and typography.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Grid placement, spacing, and muted description typography combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('col-start-2 grid justify-items-start gap-1 text-small text-fg-muted', this.class()),
  );
  // #endregion
}
