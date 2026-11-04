import type { AudienceMeasurementSettings } from '@vfortin/web-shell';

/**
 * Constant audienceMeasurement
 *
 * @description
 * Audience measurement of the browser-test build (`web:build:e2e`, D48): a placeholder measurement id
 * so that the consent banner and the Google tag loader are exercised. It belongs to no GA4 property
 * and never ships: the Playwright suite answers every Google host itself.
 */
export const audienceMeasurement: AudienceMeasurementSettings = {
  ga4MeasurementId: 'G-E2ETEST000',
};
