import { InjectionToken } from '@angular/core';
import type { CommandHost } from '@internal/ui/lib/command/models/command/command-host.interface';

/**
 * Constant COMMAND_HOST
 *
 * @description
 * Injection key through which command subcomponents access their owning palette contract.
 *
 * @type {InjectionToken<CommandHost>}
 */
export const COMMAND_HOST: InjectionToken<CommandHost> = new InjectionToken<CommandHost>(
  'COMMAND_HOST',
);
