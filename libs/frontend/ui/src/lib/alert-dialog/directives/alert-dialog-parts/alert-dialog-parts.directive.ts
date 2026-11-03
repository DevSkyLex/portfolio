import { DialogRef } from '@angular/cdk/dialog';
import {
  Directive,
  computed,
  inject,
  input,
  type InputSignal,
  type InputSignalWithTransform,
  type Signal,
} from '@angular/core';
import {
  type ButtonVariant,
  buttonVariants,
} from '@internal/ui/lib/button/constants/button.variants';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import {
  linkDialogDescription,
  linkDialogTitle,
} from '@internal/ui/lib/dialog/directives/dialog-parts/dialog-parts.directive';
import {
  dialogDescriptionClasses,
  dialogFooterClasses,
  dialogTitleClasses,
} from '@internal/ui/lib/dialog/constants/dialog-parts.constants';

/**
 * Directive AlertDialogHeaderDirective
 * @class AlertDialogHeaderDirective
 *
 * @description
 * Groups the heading content of an alert confirmation panel and applies its header layout.
 */
@Directive({
  selector: '[uiAlertDialogHeader]',
  host: { '[class]': 'classes()', 'data-slot': 'alert-dialog-header' },
})
export class AlertDialogHeaderDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the header layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Column layout, spacing, and alignment classes combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('flex flex-col gap-2 text-left', this.class()),
  );
  // #endregion
}

/**
 * Directive AlertDialogTitleDirective
 * @class AlertDialogTitleDirective
 *
 * @description
 * Styles the confirmation title and assigns an identifier referenced by the dialog's
 * `aria-labelledby` attribute.
 */
@Directive({
  selector: '[uiAlertDialogTitle]',
  host: { '[id]': 'id', '[class]': 'classes()', 'data-slot': 'alert-dialog-title' },
})
export class AlertDialogTitleDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the shared dialog title styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique title identifier linked to the alert dialog container.
   *
   * @type {string}
   */
  protected readonly id: string = linkDialogTitle('ui-alert-dialog-title');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Shared title typography combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(dialogTitleClasses, this.class()),
  );
  // #endregion
}

/**
 * Directive AlertDialogDescriptionDirective
 * @class AlertDialogDescriptionDirective
 *
 * @description
 * Styles the confirmation explanation and assigns an identifier referenced by the dialog's
 * `aria-describedby` attribute.
 */
@Directive({
  selector: '[uiAlertDialogDescription]',
  host: { '[id]': 'id', '[class]': 'classes()', 'data-slot': 'alert-dialog-description' },
})
export class AlertDialogDescriptionDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the shared dialog description styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique description identifier linked to the alert dialog container.
   *
   * @type {string}
   */
  protected readonly id: string = linkDialogDescription('ui-alert-dialog-description');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Shared description typography combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(dialogDescriptionClasses, this.class()),
  );
  // #endregion
}

/**
 * Directive AlertDialogFooterDirective
 * @class AlertDialogFooterDirective
 *
 * @description
 * Provides the footer alignment and spacing for alert-dialog action and cancellation controls.
 */
@Directive({
  selector: '[uiAlertDialogFooter]',
  host: { '[class]': 'classes()', 'data-slot': 'alert-dialog-footer' },
})
export class AlertDialogFooterDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the footer layout.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Footer alignment and spacing classes combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(dialogFooterClasses, this.class()),
  );
  // #endregion
}

/**
 * Directive AlertDialogActionDirective
 * @class AlertDialogActionDirective
 *
 * @description
 * Closes the nearest alert dialog with its configured result when the action button is activated.
 */
@Directive({
  selector: 'button[uiAlertDialogAction]',
  host: {
    type: 'button',
    '[class]': 'classes()',
    'data-slot': 'alert-dialog-action',
    '(click)': 'close()',
  },
})
export class AlertDialogActionDirective {
  // #region Properties
  /**
   * Property result
   * @readonly
   *
   * @description
   * Value returned when the action closes the dialog; an empty attribute becomes `true`.
   *
   * @type {InputSignalWithTransform<unknown, unknown>}
   */
  public readonly result: InputSignalWithTransform<unknown, unknown> = input<unknown, unknown>(
    true,
    {
      alias: 'uiAlertDialogAction',
      transform: (value: unknown) => (value === '' ? true : value),
    },
  );

  /**
   * Property variant
   * @readonly
   *
   * @description
   * Button appearance used for the confirming action.
   *
   * @type {InputSignal<ButtonVariant>}
   */
  public readonly variant: InputSignal<ButtonVariant> = input<ButtonVariant>('primary');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the selected button variant.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property dialogRef
   * @readonly
   *
   * @description
   * Optional reference to the containing dialog; absent when used outside a dialog injector.
   *
   * @type {DialogRef<unknown, unknown> | null}
   */
  private readonly dialogRef: DialogRef<unknown, unknown> | null = inject<
    DialogRef<unknown, unknown>
  >(DialogRef, { optional: true });

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Selected button variant combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(buttonVariants({ variant: this.variant() }), this.class()),
  );
  // #endregion

  // #region Methods
  /**
   * Method close
   * @method close
   *
   * @description
   * Closes the containing dialog with the action's configured result when a dialog is available.
   *
   * @returns {void}
   */
  protected close(): void {
    this.dialogRef?.close(this.result());
  }
  // #endregion
}

/**
 * Directive AlertDialogCancelDirective
 * @class AlertDialogCancelDirective
 *
 * @description
 * Cancels the confirmation by closing the containing dialog without a result; it is the preferred
 * initial-focus target.
 */
@Directive({
  selector: 'button[uiAlertDialogCancel]',
  host: {
    type: 'button',
    '[class]': 'classes()',
    'data-slot': 'alert-dialog-cancel',
    '(click)': 'close()',
  },
})
export class AlertDialogCancelDirective {
  // #region Properties
  /**
   * Property variant
   * @readonly
   *
   * @description
   * Button appearance used for the cancellation control.
   *
   * @type {InputSignal<ButtonVariant>}
   */
  public readonly variant: InputSignal<ButtonVariant> = input<ButtonVariant>('secondary');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the selected button variant.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property dialogRef
   * @readonly
   *
   * @description
   * Optional reference to the containing dialog; absent when used outside a dialog injector.
   *
   * @type {DialogRef<unknown, unknown> | null}
   */
  private readonly dialogRef: DialogRef<unknown, unknown> | null = inject<
    DialogRef<unknown, unknown>
  >(DialogRef, { optional: true });

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Selected button variant combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(buttonVariants({ variant: this.variant() }), this.class()),
  );
  // #endregion

  // #region Methods
  /**
   * Method close
   * @method close
   *
   * @description
   * Closes the containing dialog without an explicit result when a dialog is available.
   *
   * @returns {void}
   */
  protected close(): void {
    this.dialogRef?.close();
  }
  // #endregion
}
