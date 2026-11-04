import { Dialog, type DialogRef } from '@angular/cdk/dialog';
import { Injectable, inject } from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { openDialogPanel } from '@internal/ui/lib/dialog/dialog.service';
import type { DialogContentType } from '@internal/ui/lib/dialog/models/dialog/dialog-content-type.type';
import { alertDialogContentVariants } from '@internal/ui/lib/alert-dialog/constants/alert-dialog-content.variants';
import type { AlertDialogOptions } from '@internal/ui/lib/alert-dialog/models/alert-dialog/alert-dialog-options.type';
import { INITIAL_FOCUS } from '@internal/ui/lib/alert-dialog/constants/alert-dialog.constants';

/**
 * Service AlertDialogService
 * @class AlertDialogService
 *
 * @description
 * Opens confirmation dialogs with alert-dialog semantics, initial focus on cancellation, and no
 * backdrop or close-button dismissal. Escape remains available through the CDK dialog behavior.
 */
@Injectable({ providedIn: 'root' })
export class AlertDialogService {
  // #region Properties
  /**
   * Property dialog
   * @readonly
   *
   * @description
   * CDK dialog service used by the shared dialog panel opener.
   *
   * @type {Dialog}
   */
  private readonly dialog: Dialog = inject<Dialog>(Dialog);
  // #endregion

  // #region Methods
  /**
   * Method open
   * @method open
   *
   * @description
   * Opens the supplied confirmation content with alert-dialog defaults, while caller options may
   * configure other shared dialog details.
   *
   * @template R - Result emitted when the dialog closes.
   * @template D - Data passed into the dialog.
   * @template C - Context exposed to the content template.
   * @param {DialogContentType<C>} content - Template or component displayed in the panel.
   * @param {AlertDialogOptions<D>} options - Additional dialog configuration.
   *
   * @returns {DialogRef<R, C>} Reference that controls and observes the opened dialog.
   */
  public open<R = unknown, D = unknown, C = unknown>(
    content: DialogContentType<C>,
    options: AlertDialogOptions<D> = {},
  ): DialogRef<R, C> {
    return openDialogPanel<R, D, C>(this.dialog, content, {
      autoFocus: INITIAL_FOCUS,
      ...options,
      role: 'alertdialog',
      slot: 'alert-dialog-content',
      panelClass: cn(alertDialogContentVariants({ size: options.size }), options.class),
      showClose: false,
      closeOnBackdropClick: false,
    });
  }
  // #endregion
}
