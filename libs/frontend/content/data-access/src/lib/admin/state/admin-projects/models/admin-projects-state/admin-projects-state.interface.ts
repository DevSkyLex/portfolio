import type { CallState } from '@vfortin/web-http';
import type { AdminProject } from '@internal/content-web-data-access/lib/admin/models/admin-project/admin-project.type';

/**
 * Interface AdminProjectsState
 * @interface AdminProjectsState
 *
 * @description
 * Page-scoped project collection and independent load/write call states.
 */
export interface AdminProjectsState {
  // #region Properties
  /**
   * Property projects
   * @readonly
   *
   * @description
   * Administrator project rows loaded for the current page.
   *
   * @type {readonly AdminProject[]}
   */
  readonly projects: readonly AdminProject[];

  /**
   * Property loadCallState
   * @readonly
   *
   * @description
   * Load status and normalized error for collection or single-project requests.
   *
   * @type {CallState}
   */
  readonly loadCallState: CallState;

  /**
   * Property writeCallState
   * @readonly
   *
   * @description
   * Status and normalized error for project revision or publication writes.
   *
   * @type {CallState}
   */
  readonly writeCallState: CallState;
  // #endregion
}
