import type { ContentSnapshotLoader } from '@vfortin/content-web-data-access';

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
  // #endregion
}
