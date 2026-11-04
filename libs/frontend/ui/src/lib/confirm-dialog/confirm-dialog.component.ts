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
import { KbdHintComponent } from '@internal/ui/lib/kbd/components/kbd-hint/kbd-hint.component';

/**
 * Component ConfirmDialogComponent
 * @class ConfirmDialogComponent
 *
 * @description
 * Content of the confirmation opened by `ConfirmDialogService`: the question in a header bar, its
 * consequence, then a footer bar with the Escape hint, a cancelling button (focused first) and a
 * confirming one, red for a destructive action.
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
    KbdHintComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents', 'data-slot': 'confirm-dialog' },
  template: `
    @let cancel = options.cancelLabel ?? cancelLabel;
    <div uiAlertDialogHeader variant="bar">
      <h2 uiAlertDialogTitle class="text-[16px]/6 font-semibold">{{ options.title }}</h2>
    </div>
    @if (options.description) {
      <p uiAlertDialogDescription class="py-5 text-[13px]/5">{{ options.description }}</p>
    }
    <!-- Without a body the two bars touch: one hairline between them, not two. -->
    <div uiAlertDialogFooter variant="bar" [class]="options.description ? '' : 'border-t-0'">
      <ui-kbd-hint [keys]="[escapeKey]" [label]="cancel" />
      <div class="ml-auto flex items-center gap-2">
        <button uiAlertDialogCancel variant="ghost" class="h-8 rounded-sm px-3 text-[13px]">
          {{ cancel }}
        </button>
        <button
          uiAlertDialogAction
          class="h-8 rounded-sm px-3 text-[13px]"
          [variant]="options.tone === 'danger' ? 'danger' : 'primary'"
        >
          {{ options.confirmLabel }}
        </button>
      </div>
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
   * Default label of the cancelling button, also the label of the Escape hint.
   *
   * @type {string}
   */
  protected readonly cancelLabel: string = $localize`:@@ui.confirm-dialog.cancel:Annuler`;

  /**
   * Property escapeKey
   * @readonly
   *
   * @description
   * Keycap of the Escape key in the footer hint, named as the locale's keyboards print it.
   *
   * @type {string}
   */
  protected readonly escapeKey: string = $localize`:@@ui.confirm-dialog.escape-key:Échap`;
  // #endregion
}
