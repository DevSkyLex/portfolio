import type { ProjectSectionId } from '@internal/content-web-feature/lib/ui/pages/project-page/models/project-section-id/project-section-id.type';

/**
 * Interface ProjectTocEntry
 * @interface ProjectTocEntry
 *
 * @description
 * One link of the project page table of contents.
 */
export interface ProjectTocEntry {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Article section targeted by the link fragment and watched by the scrollspy.
   *
   * @type {ProjectSectionId}
   */
  readonly id: ProjectSectionId;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Localized section heading shown as the link text.
   *
   * @type {string}
   */
  readonly label: string;
  // #endregion
}
