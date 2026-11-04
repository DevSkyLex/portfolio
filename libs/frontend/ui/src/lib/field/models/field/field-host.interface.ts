import type { Signal } from '@angular/core';

/**
 * Interface FieldHost
 * @interface FieldHost
 *
 * @description
 * State a `ui-field` shares with the controls projected into it.
 */
export interface FieldHost {
  // #region Properties
  /**
   * Property invalid
   * @readonly
   *
   * @description
   * Whether the field shows a validation message, which its controls expose as `aria-invalid`.
   *
   * @type {Signal<boolean>}
   */
  readonly invalid: Signal<boolean>;
  // #endregion
}
