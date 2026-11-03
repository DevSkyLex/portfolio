import type { DialogRef } from '@angular/cdk/dialog';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AlertDialogService } from '@internal/ui/lib/alert-dialog/alert-dialog.service';
import type { ConfirmDialogOptions } from '@internal/ui/lib/confirm-dialog/models/confirm-dialog/confirm-dialog-options.interface';
import { ConfirmDialogComponent } from '@internal/ui/lib/confirm-dialog/confirm-dialog.component';

/**
 * Service ConfirmDialogService
 * @class ConfirmDialogService
 *
 * @description
 * Asks for a confirmation in an alert dialog and answers with a promise, replacing `window.confirm`
 * so that every confirmation shares one look and keyboard behaviour (Escape and the cancel button
 * answer `false`).
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  // #region Properties
  /**
   * Property dialogs
   * @readonly
   *
   * @description
   * Opens the alert dialog that holds the confirmation.
   *
   * @type {AlertDialogService}
   */
  private readonly dialogs: AlertDialogService = inject<AlertDialogService>(AlertDialogService);
  // #endregion

  // #region Methods
  /**
   * Method confirm
   * @method confirm
   *
   * @description
   * Opens the confirmation and resolves once it closes.
   *
   * @param {ConfirmDialogOptions} options - Question, consequence, labels and tone.
   *
   * @returns {Promise<boolean>} `true` only when the confirming button was pressed.
   */
  public async confirm(options: ConfirmDialogOptions): Promise<boolean> {
    const ref: DialogRef<boolean, unknown> = this.dialogs.open<boolean, ConfirmDialogOptions>(
      ConfirmDialogComponent,
      {
        data: options,
        class: 'max-w-[420px] gap-4 sm:p-6',
      },
    );
    return (await firstValueFrom(ref.closed)) === true;
  }
  // #endregion
}
