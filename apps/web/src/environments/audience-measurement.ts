import type { AudienceMeasurementSettings } from '@vfortin/web-shell';

/**
 * Constant audienceMeasurement
 *
 * @description
 * Public build-time setting of the audience measurement (D48): the Google Analytics 4 measurement id
 * (`G-…`, GA4 › Admin › Data streams › Web) of the public site. Empty, the site measures nothing: no
 * consent banner, no « Gérer les cookies » link, no request to Google. The `e2e` build configuration
 * replaces this file with `audience-measurement.e2e.ts`.
 */
export const audienceMeasurement: AudienceMeasurementSettings = {
  ga4MeasurementId: 'G-93B30YHEMG',
};
