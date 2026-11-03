import type { DialogOptions } from '@internal/ui/lib/dialog/models/dialog/dialog-options.interface';
import type { SheetSide } from '@internal/ui/lib/sheet/constants/sheet.variants';

/**
 * Interface SheetOptions
 * @interface SheetOptions
 * @template D
 *
 * @description
 * Extends dialog configuration with the optional edge that anchors the sheet panel.
 */
export interface SheetOptions<D = unknown> extends DialogOptions<D> {
  // #region Properties
  /**
   * Property side
   * @readonly
   *
   * @description
   * Viewport edge used to position the panel; omitted values default to the right side.
   *
   * @type {SheetSide | undefined}
   */
  readonly side?: SheetSide | undefined;
  // #endregion
}
