import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideWebShell } from '@vfortin/web-shell';
import { audienceMeasurement } from '@internal/web/environments/audience-measurement';
import { contentSnapshot } from '@internal/web/environments/content-snapshot';

/**
 * Constant appConfig
 *
 * @description
 * Configures browser-wide error reporting and the public web shell.
 * Content snapshots are selected by locale: the committed ones, loaded as separate build chunks, or
 * the content API's on the dev server (`content-snapshot.development.ts`). The audience measurement id
 * comes from `environments/audience-measurement.ts` (D48).
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideWebShell({ contentSnapshot, audienceMeasurement }),
  ],
};
