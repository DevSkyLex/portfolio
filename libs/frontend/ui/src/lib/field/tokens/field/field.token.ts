import { InjectionToken } from '@angular/core';
import type { FieldHost } from '@internal/ui/lib/field/models/field/field-host.interface';

/**
 * Constant FIELD_HOST
 * @constant
 *
 * @description
 * Injection token through which the controls projected into a `ui-field` read its error state.
 *
 * @type {InjectionToken<FieldHost>}
 */
export const FIELD_HOST: InjectionToken<FieldHost> = new InjectionToken<FieldHost>('FIELD_HOST');
