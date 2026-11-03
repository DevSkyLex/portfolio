import type { DialogRef } from '@angular/cdk/dialog';
import { Directive, TemplateRef, inject, input, type InputSignal } from '@angular/core';
import { DialogTriggerBase } from '@internal/ui/lib/dialog/directives/dialog-trigger/dialog-trigger.directive';
import type { DialogContext } from '@internal/ui/lib/dialog/models/dialog/dialog-context.interface';
import { AlertDialogService } from '@internal/ui/lib/alert-dialog/alert-dialog.service';

/**
 * Directive AlertDialogContentDirective
 * @class AlertDialogContentDirective
 *
 * @description
 * Exposes an alert-dialog template, its optional panel classes, and an accessible label to the
 * trigger that opens it.
 */
@Directive({ selector: 'ng-template[uiAlertDialogContent]', exportAs: 'uiAlertDialogContent' })
export class AlertDialogContentDirective {
  // #region Properties
  /**
   * Property template
   * @readonly
   *
   * @description
   * Template reference supplied to the dialog opener with the dialog context type.
   *
   * @type {TemplateRef<DialogContext>}
   */
  public readonly template: TemplateRef<DialogContext<unknown, unknown>> =
    inject<TemplateRef<DialogContext>>(TemplateRef);

  /**
   * Property class
   * @readonly
   *
   * @description
   * Optional panel classes passed to the alert dialog service.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property ariaLabel
   * @readonly
   *
   * @description
   * Optional accessible name used when the content does not provide a linked title.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly ariaLabel: InputSignal<string | undefined> = input<string>();
  // #endregion

  // #region Methods
  /**
   * Method ngTemplateContextGuard
   * @method ngTemplateContextGuard
   *
   * @description
   * Declares the shared dialog context to Angular's template checker. When called directly, it only
   * checks that the directive and context are non-null; it does not validate the context's shape.
   *
   * @param {AlertDialogContentDirective} directive - Directive associated with the template.
   * @param {unknown} context - Context value checked only by Angular's template type system.
   *
   * @returns {context is DialogContext} Whether the template context has the declared type.
   */
  public static ngTemplateContextGuard(
    directive: AlertDialogContentDirective,
    context: unknown,
  ): context is DialogContext {
    // Type narrowing only: Angular never calls the guard at runtime.
    return directive !== null && context !== null;
  }
  // #endregion
}

/**
 * Directive AlertDialogTriggerDirective
 * @class AlertDialogTriggerDirective
 *
 * @description
 * Opens the referenced alert-dialog template through the alert-dialog service and preserves the
 * base trigger's data and focus-restoration behavior.
 *
 * @template R - Result value returned when the dialog closes.
 */
@Directive({
  selector: '[uiAlertDialogTrigger]',
  exportAs: 'uiAlertDialogTrigger',
  host: { 'data-slot': 'alert-dialog-trigger' },
})
export class AlertDialogTriggerDirective<R = unknown> extends DialogTriggerBase<R> {
  // #region Properties
  /**
   * Property content
   * @readonly
   *
   * @description
   * Required template content opened when the host trigger is activated.
   *
   * @type {InputSignal<AlertDialogContentDirective>}
   */
  public readonly content: InputSignal<AlertDialogContentDirective> =
    input.required<AlertDialogContentDirective>({
      alias: 'uiAlertDialogTrigger',
    });

  /**
   * Property alertDialogs
   * @readonly
   *
   * @description
   * Service that opens the content with alert-dialog dismissal and focus defaults.
   *
   * @type {AlertDialogService}
   */
  private readonly alertDialogs: AlertDialogService =
    inject<AlertDialogService>(AlertDialogService);
  // #endregion

  // #region Methods
  /**
   * Method openPanel
   * @method openPanel
   *
   * @description
   * Opens the required template with trigger data, content accessibility settings, and the trigger
   * injector so dialog providers remain available.
   *
   * @returns {DialogRef<R, unknown>} Reference to the opened alert dialog.
   */
  protected openPanel(): DialogRef<R, unknown> {
    const content: AlertDialogContentDirective = this.content();
    return this.alertDialogs.open<R>(content.template, {
      data: this.data(),
      class: content.class(),
      ariaLabel: content.ariaLabel(),
      injector: this.injector,
    });
  }
  // #endregion
}
