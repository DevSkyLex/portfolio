import type { DialogOptions } from '@internal/ui/lib/dialog/models/dialog/dialog-options.interface';

/**
 * Type AlertDialogOptions
 * @type AlertDialogOptions
 *
 * @description
 * Dialog options accepted by an alert confirmation, excluding controls that would permit backdrop
 * dismissal or a close button.
 *
 * @template D - Data made available to the dialog content.
 */
export type AlertDialogOptions<D = unknown> = Omit<
  DialogOptions<D>,
  'closeOnBackdropClick' | 'showClose' | 'closeLabel'
>;
