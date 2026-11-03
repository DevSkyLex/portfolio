import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { type WebShellOptions, provideWebShell } from '@vfortin/web-shell';

/**
 * Constant appConfig
 *
 * @description
 * Configures browser-wide error reporting and the public web shell.
 * Content snapshots are selected by locale and dynamically loaded as separate build chunks.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideWebShell({
      contentSnapshot: (
        locale: Parameters<WebShellOptions['contentSnapshot']>[0],
      ): Promise<unknown> =>
        locale === 'en'
          ? import('@internal/web-snapshot/en.json').then((m): unknown => m.default)
          : import('@internal/web-snapshot/fr.json').then((m): unknown => m.default),
    }),
  ],
};
