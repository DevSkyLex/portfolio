/**
 * Interface AudienceMeasurementSettings
 * @interface AudienceMeasurementSettings
 *
 * @description
 * Public build-time settings of the audience measurement (D48), read from the web application's
 * environment file.
 */
export interface AudienceMeasurementSettings {
  // #region Properties
  /**
   * Property ga4MeasurementId
   * @readonly
   *
   * @description
   * Google Analytics 4 measurement id (`G-…`) of the public site; empty (or malformed) turns the
   * measurement off entirely: no consent banner, no « Gérer les cookies » link, no Google request.
   *
   * @type {string}
   */
  readonly ga4MeasurementId: string;
  // #endregion
}
