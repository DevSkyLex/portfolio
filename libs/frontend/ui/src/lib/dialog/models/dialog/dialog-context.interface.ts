import type { DialogRef } from '@angular/cdk/dialog';

/**
 * Interface DialogContext
 * @interface DialogContext
 *
 * @description
 * Data and dialog reference exposed to an embedded dialog content template.
 *
 * @template D - Data passed to the dialog content.
 * @template R - Result type returned when the dialog closes.
 */
export interface DialogContext<D = unknown, R = unknown> {
  // #region Properties
  /**
   * Property $implicit
   * @readonly
   *
   * @description
   * Dialog data exposed as the template's default `let-data` variable.
   *
   * @type {D}
   */
  readonly $implicit: D;

  /**
   * Property dialogRef
   * @readonly
   *
   * @description
   * Reference used by the content to close its owning dialog and supply a result.
   *
   * @type {DialogRef<R>}
   */
  readonly dialogRef: DialogRef<R>;
  // #endregion
}
