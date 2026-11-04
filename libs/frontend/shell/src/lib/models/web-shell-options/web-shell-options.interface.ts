import type { ContentSnapshotLoader } from '@vfortin/content-web-data-access';
import type { AudienceMeasurementSettings } from '@internal/web-shell/lib/consent/models/audience-measurement/audience-measurement.interface';

/**
 * Interface WebShellOptions
 * @interface WebShellOptions
 *
 * @description
 * Runtime inputs required by the browser application shell.
 */
export interface WebShellOptions {
  // #region Properties
  /**
   * Property contentSnapshot
   * @readonly
   *
   * @description
   * Loader for the prerendered content snapshot selected for the active locale.
   *
   * @type {ContentSnapshotLoader}
   */
  readonly contentSnapshot: ContentSnapshotLoader;

  /**
   * Property audienceMeasurement
   * @readonly
   *
   * @description
   * Public build-time settings of the audience measurement (D48), from the application's environment
   * file; absent or with an empty measurement id, the site measures nothing and shows no consent banner.
   *
   * @type {AudienceMeasurementSettings | undefined}
   */
  readonly audienceMeasurement?: AudienceMeasurementSettings;
  // #endregion
}
