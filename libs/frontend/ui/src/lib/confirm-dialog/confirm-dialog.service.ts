import type { DialogRef } from '@angular/cdk/dialog';
import { DOCUMENT } from '@angular/common';
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
 * answer `false`). Closing returns the focus to `restoreFocus` when given, otherwise to the element
 * focused at opening; a confirmation chosen in a menu had the focus on a menu item that the menu
 * removes, so the focus then goes to that menu's trigger, or to `opener`.
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

  /**
   * Property document
   * @readonly
   *
   * @description
   * Document whose active element and menu triggers decide where the focus returns.
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);
  // #endregion

  // #region Methods
  /**
   * Method confirm
   * @method confirm
   *
   * @description
   * Opens the confirmation and resolves once it closes and the focus is back.
   *
   * @param {ConfirmDialogOptions} options - Question, consequence, labels, tone and focus return.
   *
   * @returns {Promise<boolean>} `true` only when the confirming button was pressed.
   */
  public async confirm(options: ConfirmDialogOptions): Promise<boolean> {
    const previous: HTMLElement | null = this.focusedElement();
    // Read now: the menu holding the focused item may close as soon as the dialog opens.
    const trigger: HTMLElement | null = this.menuTriggerOf(previous);
    const ref: DialogRef<boolean, unknown> = this.dialogs.open<boolean, ConfirmDialogOptions>(
      ConfirmDialogComponent,
      {
        data: options,
        // The service returns the focus itself, after the dialog has left.
        restoreFocus: false,
        // The inset, not `sm:p-6`, so both bars keep reaching the panel edges; the description
        // carries its own vertical padding between them.
        // Wide enough for the Échap hint and both buttons on one footer row.
        size: 'lg',
        class: 'gap-0',
      },
    );
    const answer: boolean = (await firstValueFrom(ref.closed)) === true;
    const target: HTMLElement | undefined = [
      options.restoreFocus,
      previous,
      trigger,
      options.opener,
    ].find((element): element is HTMLElement => !!element?.isConnected);
    target?.focus();
    return answer;
  }

  /**
   * Method focusedElement
   * @method focusedElement
   *
   * @description
   * Element holding the focus before the confirmation opens, `null` when the body has it.
   *
   * @returns {HTMLElement | null} Focused element.
   */
  private focusedElement(): HTMLElement | null {
    const active: Element | null = this.document.activeElement;
    return active instanceof HTMLElement && active !== this.document.body ? active : null;
  }

  /**
   * Method menuTriggerOf
   * @method menuTriggerOf
   *
   * @description
   * Trigger of the open menu that holds an element: the CDK menu trigger names its menu with
   * `aria-controls` while the menu is open.
   *
   * @param {HTMLElement | null} element - Element focused at opening.
   * @returns {HTMLElement | null} Menu trigger, or `null` outside a menu.
   */
  private menuTriggerOf(element: HTMLElement | null): HTMLElement | null {
    const menu: Element | null | undefined = element?.closest('[role="menu"][id]');
    if (!menu) return null;
    const trigger: Element | undefined = [
      ...this.document.querySelectorAll('[aria-controls]'),
    ].find((one: Element): boolean => one.getAttribute('aria-controls') === menu.id);
    return trigger instanceof HTMLElement ? trigger : null;
  }
  // #endregion
}
