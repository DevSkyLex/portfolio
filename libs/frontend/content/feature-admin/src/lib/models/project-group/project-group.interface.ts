import type { AdminProject } from '@vfortin/content-web-data-access/admin';
import type { ProjectGroupDefinition } from '@internal/content-web-feature-admin/lib/models/project-group/project-group-definition.interface';

/**
 * Interface ProjectGroup
 * @interface ProjectGroup
 *
 * @description
 * Status group of the project list with the projects that pass the search and filter.
 */
export interface ProjectGroup extends ProjectGroupDefinition {
  // #region Properties
  /**
   * Property projects
   * @readonly
   *
   * @description
   * Projects of the group, in collection order; never empty once grouped.
   *
   * @type {readonly AdminProject[]}
   */
  readonly projects: readonly AdminProject[];
  // #endregion
}
