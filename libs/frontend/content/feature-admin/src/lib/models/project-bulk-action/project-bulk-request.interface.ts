import type { AdminProject } from '@vfortin/content-web-data-access/admin';
import type { ProjectBulkAction } from '@internal/content-web-feature-admin/lib/models/project-bulk-action/project-bulk-action.type';

/**
 * Interface ProjectBulkRequest
 * @interface ProjectBulkRequest
 *
 * @description
 * Bulk action chosen in the selection bar, with the whole selection; the page keeps the eligible
 * projects, confirms and writes.
 */
export interface ProjectBulkRequest {
  // #region Properties
  /** Chosen action. */
  readonly action: ProjectBulkAction;
  /** Selected projects, eligible or not, in selection order. */
  readonly projects: readonly AdminProject[];
  // #endregion
}
