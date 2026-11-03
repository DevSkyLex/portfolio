import { type ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideWebShellServer } from '@vfortin/web-shell/server';
import { appConfig } from '@internal/web/app/app.config';

/**
 * Constant config
 *
 * @description
 * Merges server-only rendering providers into the shared application configuration.
 */
export const config: ApplicationConfig = mergeApplicationConfig(appConfig, {
  providers: [provideWebShellServer()],
});
