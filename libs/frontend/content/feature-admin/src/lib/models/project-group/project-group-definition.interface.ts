import type { AdminProject } from '@vfortin/content-web-data-access/admin';

/**
 * Interface ProjectGroupDefinition
 * @interface ProjectGroupDefinition
 *
 * @description
 * Publication status shown as one group of the project list, with its heading.
 */
export interface ProjectGroupDefinition {
  // #region Properties
  /**
   * Property status
   * @readonly
   *
   * @description
   * Publication status gathered by the group.
   *
   * @type {AdminProject['status']}
   */
  readonly status: AdminProject['status'];

  /**
   * Property label
   * @readonly
   *
   * @description
   * French group heading, also the section's accessible name.
   *
   * @type {string}
   */
  readonly label: string;
  // #endregion
}
