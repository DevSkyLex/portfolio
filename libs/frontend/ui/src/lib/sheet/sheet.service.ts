import { Dialog, type DialogRef } from '@angular/cdk/dialog';
import { type GlobalPositionStrategy, createGlobalPositionStrategy } from '@angular/cdk/overlay';
import { Injectable, Injector, inject } from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { openDialogPanel } from '@internal/ui/lib/dialog/dialog.service';
import type { DialogContentType } from '@internal/ui/lib/dialog/models/dialog/dialog-content-type.type';
import type { SheetOptions } from '@internal/ui/lib/sheet/models/sheet/sheet-options.interface';
import { type SheetSide, sheetVariants } from '@internal/ui/lib/sheet/constants/sheet.variants';

/**
 * Service SheetService
 * @class SheetService
 *
 * @description
 * Opens modal component or template content in a panel anchored to a viewport edge, sizing the panel according to
 * its orientation.
 */
@Injectable({ providedIn: 'root' })
export class SheetService {
  // #region Properties
  /**
   * Property dialog
   * @readonly
   *
   * @description
   * CDK dialog service used to attach modal sheet content.
   *
   * @type {Dialog}
   */
  private readonly dialog: Dialog = inject<Dialog>(Dialog);

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Current injector passed to the global overlay position strategy.
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject<Injector>(Injector);
  // #endregion

  // #region Methods
  /**
   * Method open
   * @method open
   * @template R
   * @template D
   * @template C
   *
   * @description
   * Opens modal content with the requested side, panel classes and dimensions; unspecified sides use `right`.
   *
   * @param {DialogContentType<C>} content - Component or template rendered inside the sheet.
   * @param {SheetOptions<D>} options - Optional side, data, accessibility and panel configuration.
   * @returns {DialogRef<R, C>} Reference for closing the opened sheet and observing its result.
   */
  public open<R = unknown, D = unknown, C = unknown>(
    content: DialogContentType<C>,
    options: SheetOptions<D> = {},
  ): DialogRef<R, C> {
    const side: SheetSide = options.side ?? 'right';
    const position: GlobalPositionStrategy = createGlobalPositionStrategy(this.injector);
    if (side === 'bottom') {
      position.bottom('0').left('0');
    } else if (side === 'right') {
      position.top('0').right('0');
    } else {
      position.top('0').left('0');
    }
    const vertical: boolean = side === 'left' || side === 'right' || side === 'full';
    const horizontal: boolean = side === 'top' || side === 'bottom' || side === 'full';
    return openDialogPanel<R, D, C>(this.dialog, content, {
      ...options,
      role: 'dialog',
      slot: 'sheet-content',
      panelClass: cn(sheetVariants({ side }), options.class),
      positionStrategy: position,
      height: vertical ? '100%' : undefined,
      width: horizontal ? '100%' : undefined,
    });
  }
  // #endregion
}
