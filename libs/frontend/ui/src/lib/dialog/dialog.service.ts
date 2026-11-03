import { Dialog, type DialogRef } from '@angular/cdk/dialog';
import { hasModifierKey } from '@angular/cdk/keycodes';
import { Injectable, inject } from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { DialogContainerComponent } from '@internal/ui/lib/dialog/components/dialog-container/dialog-container.component';
import { DIALOG_PANEL } from '@internal/ui/lib/dialog/tokens/dialog-panel/dialog-panel.token';
import type { DialogPanel } from '@internal/ui/lib/dialog/models/dialog/dialog-panel.interface';
import type { DialogContentType } from '@internal/ui/lib/dialog/models/dialog/dialog-content-type.type';
import { dialogContentVariants } from '@internal/ui/lib/dialog/constants/dialog-content.variants';
import type { DialogOptions } from '@internal/ui/lib/dialog/models/dialog/dialog-options.interface';
import type { DialogPanelSetup } from '@internal/ui/lib/dialog/models/dialog/dialog-panel-setup.interface';
import { defaultCloseLabel } from '@internal/ui/lib/dialog/constants/dialog.constants';

export { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

/**
 * Function openDialogPanel
 *
 * @description
 * Opens content in the shared modal container with focus management and independently configured
 * Escape and backdrop dismissal.
 *
 * @template R - Result emitted when the panel closes.
 * @template D - Data value passed to the content.
 * @template C - Template context or component type.
 * @param {Dialog} dialog - CDK dialog service.
 * @param {DialogContentType<C>} content - Component or template rendered in the panel.
 * @param {DialogPanelSetup<D>} setup - Panel role, appearance and behavior settings.
 * @returns {DialogRef<R, C>} Reference controlling the opened panel and its result.
 */
export function openDialogPanel<R, D, C>(
  dialog: Dialog,
  content: DialogContentType<C>,
  setup: DialogPanelSetup<D>,
): DialogRef<R, C> {
  const panel: DialogPanel = {
    class: setup.panelClass,
    slot: setup.slot,
    closeLabel: setup.showClose === false ? null : (setup.closeLabel ?? defaultCloseLabel),
  };
  const ref: DialogRef<R, C> = dialog.open<R, D, C>(content, {
    ...(setup.id ? { id: setup.id } : {}),
    data: setup.data ?? null,
    role: setup.role,
    ariaModal: true,
    ariaLabel: setup.ariaLabel ?? null,
    autoFocus: setup.autoFocus ?? 'first-tabbable',
    restoreFocus: setup.restoreFocus ?? true,
    ...(setup.injector ? { injector: setup.injector } : {}),
    ...(setup.positionStrategy ? { positionStrategy: setup.positionStrategy } : {}),
    width: setup.width ?? '',
    height: setup.height ?? '',
    backdropClass: ['bg-scrim'],
    // Escape and backdrop clicks are handled below, each one on its own.
    disableClose: true,
    container: {
      type: DialogContainerComponent,
      providers: () => [{ provide: DIALOG_PANEL, useValue: panel }],
    },
  });
  if (setup.closeOnEscape !== false) {
    ref.keydownEvents.subscribe((event) => {
      if (event.key === 'Escape' && !hasModifierKey(event)) {
        event.preventDefault();
        ref.close(undefined, { focusOrigin: 'keyboard' });
      }
    });
  }
  if (setup.closeOnBackdropClick !== false) {
    ref.backdropClick.subscribe(() => ref.close(undefined, { focusOrigin: 'mouse' }));
  }
  return ref;
}

/**
 * Class DialogService
 * @class DialogService
 *
 * @description
 * Opens component or template content in the centered Orbite modal panel and closes all active
 * dialogs on request.
 */
@Injectable({ providedIn: 'root' })
export class DialogService {
  // #region Properties
  /**
   * Property dialog
   * @readonly
   *
   * @description
   * CDK dialog service used to create and close modal panels.
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
   * Opens a component or template in the centered dialog variant with caller-provided content options.
   *
   * @template R - Result produced when the content closes.
   * @template D - Data made available to the content.
   * @template C - Component or template context.
   * @param {DialogContentType<C>} content - Content to render in the panel.
   * @param {DialogOptions<D>} options - Optional content, accessibility and close behavior settings.
   * @returns {DialogRef<R, C>} Reference used to observe or close the panel.
   */
  public open<R = unknown, D = unknown, C = unknown>(
    content: DialogContentType<C>,
    options: DialogOptions<D> = {},
  ): DialogRef<R, C> {
    return openDialogPanel<R, D, C>(this.dialog, content, {
      ...options,
      role: 'dialog',
      slot: 'dialog-content',
      panelClass: cn(dialogContentVariants(), options.class),
    });
  }

  /**
   * Method closeAll
   * @method closeAll
   *
   * @description
   * Closes every dialog currently managed by the CDK dialog service.
   *
   * @returns {void} Completes after requesting closure of all open dialogs.
   */
  public closeAll(): void {
    this.dialog.closeAll();
  }
  // #endregion
}
