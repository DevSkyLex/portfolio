import { DIALOG_DATA } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  AlertDialogActionDirective,
  AlertDialogCancelDirective,
  AlertDialogDescriptionDirective,
  AlertDialogFooterDirective,
  AlertDialogHeaderDirective,
  AlertDialogTitleDirective,
} from '@internal/ui/lib/alert-dialog/directives/alert-dialog-parts/alert-dialog-parts.directive';
import type { ConfirmDialogOptions } from '@internal/ui/lib/confirm-dialog/models/confirm-dialog/confirm-dialog-options.interface';

/**
 * Component ConfirmDialogComponent
 * @class ConfirmDialogComponent
 *
 * @description
 * Content of the confirmation opened by `ConfirmDialogService`: the question, its consequence, a
 * cancelling button (focused first) and a confirming one, red for a destructive action.
 */
@Component({
  selector: 'ui-confirm-dialog',
  imports: [
    AlertDialogActionDirective,
    AlertDialogCancelDirective,
    AlertDialogDescriptionDirective,
    AlertDialogFooterDirective,
    AlertDialogHeaderDirective,
    AlertDialogTitleDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents', 'data-slot': 'confirm-dialog' },
  template: `
    <div uiAlertDialogHeader>
      <h2 uiAlertDialogTitle class="text-[16px]/6 font-semibold">{{ options.title }}</h2>
      @if (options.description) {
        <p uiAlertDialogDescription class="text-[13px]/5">{{ options.description }}</p>
      }
    </div>
    <div uiAlertDialogFooter>
      <button uiAlertDialogCancel>{{ options.cancelLabel ?? cancelLabel }}</button>
      <button uiAlertDialogAction [variant]="options.tone === 'danger' ? 'danger' : 'primary'">
        {{ options.confirmLabel }}
      </button>
    </div>
  `,
})
export class ConfirmDialogComponent {
  // #region Properties
  /**
   * Property options
   * @readonly
   *
   * @description
   * Question, consequence and labels given to `ConfirmDialogService.confirm`.
   *
   * @type {ConfirmDialogOptions}
   */
  protected readonly options: ConfirmDialogOptions = inject<ConfirmDialogOptions>(DIALOG_DATA);

  /**
   * Property cancelLabel
   * @readonly
   *
   * @description
   * Default label of the cancelling button.
   *
   * @type {string}
   */
  protected readonly cancelLabel: string = $localize`:@@ui.confirm-dialog.cancel:Annuler`;
  // #endregion
}
