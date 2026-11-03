import type { ToastAction } from '@internal/ui/lib/sonner/models/toast/toast-action.interface';
import type { ToastType } from '@internal/ui/lib/sonner/models/toast/toast-type.type';

/**
 * Interface Toast
 * @interface Toast
 *
 * @description
 * Renderable toast data stored in the service's notification queue.
 */
export interface Toast {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable identity used to replace or dismiss this toast.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property type
   * @readonly
   *
   * @description
   * Presentation and announcement category for the toast.
   *
   * @type {ToastType}
   */
  readonly type: ToastType;

  /**
   * Property message
   * @readonly
   *
   * @description
   * Primary text displayed and announced by the toast.
   *
   * @type {string}
   */
  readonly message: string;

  /**
   * Property description
   * @readonly
   *
   * @description
   * Optional secondary text displayed below the main message.
   *
   * @type {string | undefined}
   */
  readonly description?: string | undefined;

  /**
   * Property action
   * @readonly
   *
   * @description
   * Optional button action rendered beside the message.
   *
   * @type {ToastAction | undefined}
   */
  readonly action?: ToastAction | undefined;
  // #endregion
}
