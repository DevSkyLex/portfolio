import { InjectionToken } from '@angular/core';
import type { DialogPanel } from '@internal/ui/lib/dialog/models/dialog/dialog-panel.interface';

/**
 * Constant DIALOG_PANEL
 *
 * @description
 * Injection key through which dialog services provide panel styling and close-control settings.
 *
 * @type {InjectionToken<DialogPanel>}
 */
export const DIALOG_PANEL: InjectionToken<DialogPanel> = new InjectionToken<DialogPanel>(
  'DialogPanel',
);
