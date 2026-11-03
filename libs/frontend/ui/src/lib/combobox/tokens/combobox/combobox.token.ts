import { InjectionToken } from '@angular/core';
import type { ComboboxHost } from '@internal/ui/lib/combobox/models/combobox/combobox-host.interface';

/**
 * Constant COMBOBOX_HOST
 * @readonly
 *
 * @description
 * Injection token through which option components call the narrow host interaction contract.
 *
 * @type {InjectionToken<ComboboxHost>}
 */
export const COMBOBOX_HOST: InjectionToken<ComboboxHost> = new InjectionToken<ComboboxHost>(
  'COMBOBOX_HOST',
);
