import type { DialogRef } from '@angular/cdk/dialog';
import { type InputSignal, Directive, TemplateRef, inject, input } from '@angular/core';
import { DialogTriggerBase } from '@internal/ui/lib/dialog/directives/dialog-trigger/dialog-trigger.directive';
import type { DialogContext } from '@internal/ui/lib/dialog/models/dialog/dialog-context.interface';
import { SheetService } from '@internal/ui/lib/sheet/sheet.service';
import type { SheetSide } from '@internal/ui/lib/sheet/constants/sheet.variants';

/**
 * Directive SheetContentDirective
 * @class SheetContentDirective
 *
 * @description
 * Captures the template and presentation inputs used by a sheet trigger to open its panel.
 */
@Directive({ selector: 'ng-template[uiSheetContent]', exportAs: 'uiSheetContent' })
export class SheetContentDirective {
  // #region Properties
  /**
   * Property template
   * @readonly
   *
   * @description
   * Template rendered inside the sheet and supplied with the dialog context.
   *
   * @type {TemplateRef<DialogContext>}
   */
  public readonly template: TemplateRef<DialogContext<unknown, unknown>> =
    inject<TemplateRef<DialogContext>>(TemplateRef);

  /**
   * Property side
   * @readonly
   *
   * @description
   * Viewport edge used to anchor the panel, defaulting to the right side.
   *
   * @type {InputSignal<SheetSide>}
   */
  public readonly side: InputSignal<SheetSide> = input<SheetSide>('right');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged onto the sheet panel.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property ariaLabel
   * @readonly
   *
   * @description
   * Optional accessible name used when the projected sheet has no linked title.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly ariaLabel: InputSignal<string | undefined> = input<string>();

  /**
   * Property closeLabel
   * @readonly
   *
   * @description
   * Optional accessible label for the built-in close button.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly closeLabel: InputSignal<string | undefined> = input<string>();

  /**
   * Property showClose
   * @readonly
   *
   * @description
   * Controls whether the panel includes its built-in close button.
   *
   * @type {InputSignal<boolean>}
   */
  public readonly showClose: InputSignal<boolean> = input<boolean>(true);
  // #endregion

  // #region Methods
  /**
   * Method ngTemplateContextGuard
   * @method ngTemplateContextGuard
   * @static
   *
   * @description
   * Narrows Angular's template context type; the guard exists for compile-time checking and is not called at runtime.
   *
   * @param {SheetContentDirective} directive - Directive associated with the template.
   * @param {unknown} context - Context value inferred by Angular.
   * @returns {context is DialogContext} Whether the context can be treated as a dialog context.
   */
  public static ngTemplateContextGuard(
    directive: SheetContentDirective,
    context: unknown,
  ): context is DialogContext {
    // Type narrowing only: Angular never calls the guard at runtime.
    return directive !== null && context !== null;
  }
  // #endregion
}

/**
 * Directive SheetTriggerDirective
 * @class SheetTriggerDirective
 * @template R
 *
 * @description
 * Opens the referenced sheet template using its side, accessibility labels and panel presentation settings.
 */
@Directive({
  selector: '[uiSheetTrigger]',
  exportAs: 'uiSheetTrigger',
  host: { 'data-slot': 'sheet-trigger' },
})
export class SheetTriggerDirective<R = unknown> extends DialogTriggerBase<R> {
  // #region Properties
  /**
   * Property content
   * @readonly
   *
   * @description
   * Required sheet template and presentation configuration opened by this trigger.
   *
   * @type {InputSignal<SheetContentDirective>}
   */
  public readonly content: InputSignal<SheetContentDirective> =
    input.required<SheetContentDirective>({ alias: 'uiSheetTrigger' });

  /**
   * Property sheets
   * @readonly
   *
   * @description
   * Service that creates and positions the modal sheet panel.
   *
   * @type {SheetService}
   */
  private readonly sheets: SheetService = inject<SheetService>(SheetService);
  // #endregion

  // #region Methods
  /**
   * Method openPanel
   * @method openPanel
   *
   * @description
   * Opens the referenced template and forwards trigger data and all sheet presentation inputs.
   *
   * @returns {DialogRef<R, unknown>} Reference to the opened sheet dialog.
   */
  protected openPanel(): DialogRef<R, unknown> {
    const content: SheetContentDirective = this.content();
    return this.sheets.open<R>(content.template, {
      data: this.data(),
      side: content.side(),
      class: content.class(),
      ariaLabel: content.ariaLabel(),
      closeLabel: content.closeLabel(),
      showClose: content.showClose(),
      injector: this.injector,
    });
  }
  // #endregion
}
