/**
 * Export provideWebShell
 *
 * @description
 * Browser providers for the web shell.
 */
export { provideWebShell } from '@internal/web-shell/lib/provide-web-shell';

/**
 * Export WebShellOptions
 *
 * @description
 * Required snapshot configuration of `provideWebShell`.
 */
export type { WebShellOptions } from '@internal/web-shell/lib/models/web-shell-options/web-shell-options.interface';

/**
 * Export AudienceMeasurementSettings
 * @description
 * Audience measurement settings of `WebShellOptions` (D48).
 */
export type { AudienceMeasurementSettings } from '@internal/web-shell/lib/consent/models/audience-measurement/audience-measurement.interface';
