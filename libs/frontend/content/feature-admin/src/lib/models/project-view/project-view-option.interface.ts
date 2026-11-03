import type { ProjectView } from '@internal/content-web-feature-admin/lib/models/project-view/project-view.type';

/**
 * Interface ProjectViewOption
 * @interface ProjectViewOption
 *
 * @description
 * One status filter of the project list title bar.
 */
export interface ProjectViewOption {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Filter applied when the option is pressed.
   *
   * @type {ProjectView}
   */
  readonly value: ProjectView;

  /**
   * Property label
   * @readonly
   *
   * @description
   * French button text.
   *
   * @type {string}
   */
  readonly label: string;
  // #endregion
}
