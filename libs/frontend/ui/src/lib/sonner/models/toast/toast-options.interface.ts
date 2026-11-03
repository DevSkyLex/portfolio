import type { ToastAction } from '@internal/ui/lib/sonner/models/toast/toast-action.interface';

/**
 * Interface ToastOptions
 * @interface ToastOptions
 *
 * @description
 * Optional identity, descriptive text, lifetime and action for a toast notification.
 */
export interface ToastOptions {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Optional stable id; an existing visible toast with this id is replaced.
   *
   * @type {string | undefined}
   */
  readonly id?: string | undefined;

  /**
   * Property description
   * @readonly
   *
   * @description
   * Optional secondary text announced with the main toast message.
   *
   * @type {string | undefined}
   */
  readonly description?: string | undefined;

  /**
   * Property duration
   * @readonly
   *
   * @description
   * Milliseconds before automatic dismissal; `Infinity` or non-positive values keep it visible.
   *
   * @type {number | undefined}
   */
  readonly duration?: number | undefined;

  /**
   * Property action
   * @readonly
   *
   * @description
   * Optional action button; its callback runs before the toast is dismissed.
   *
   * @type {ToastAction | undefined}
   */
  readonly action?: ToastAction | undefined;
  // #endregion
}
