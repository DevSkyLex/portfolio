import { InjectionToken } from '@angular/core';
import type { AudienceMeasurementSettings } from '@internal/web-shell/lib/consent/models/audience-measurement/audience-measurement.interface';

/**
 * Constant AUDIENCE_MEASUREMENT
 *
 * @description
 * Audience measurement settings provided by `provideWebShell` from the application's environment
 * (D48); measurement off by default.
 */
export const AUDIENCE_MEASUREMENT: InjectionToken<AudienceMeasurementSettings> =
  new InjectionToken<AudienceMeasurementSettings>('AUDIENCE_MEASUREMENT', {
    factory: (): AudienceMeasurementSettings => ({ ga4MeasurementId: '' }),
  });
