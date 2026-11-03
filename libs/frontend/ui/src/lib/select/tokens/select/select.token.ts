import { InjectionToken } from '@angular/core';
import type { SelectHost } from '@internal/ui/lib/select/models/select/select-host.interface';

/**
 * Constant SELECT_HOST
 * @constant
 *
 * @description
 * Injection token through which select options access their containing host contract.
 *
 * @type {InjectionToken<SelectHost>}
 */
export const SELECT_HOST: InjectionToken<SelectHost> = new InjectionToken<SelectHost>(
  'SELECT_HOST',
);
