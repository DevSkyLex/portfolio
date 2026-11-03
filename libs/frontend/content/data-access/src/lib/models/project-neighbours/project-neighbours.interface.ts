import type { ProjectArticle } from '@vfortin/content-web-model';

/**
 * Interface ProjectNeighbours
 * @interface ProjectNeighbours
 *
 * @description
 * Case studies before and after the current one in article navigation order.
 */
export interface ProjectNeighbours {
  // #region Properties
  /**
   * Property previous
   * @readonly
   *
   * @description
   * Article shown as the previous project.
   *
   * @type {ProjectArticle}
   */
  readonly previous: ProjectArticle;

  /**
   * Property next
   * @readonly
   *
   * @description
   * Article shown as the next project.
   *
   * @type {ProjectArticle}
   */
  readonly next: ProjectArticle;
  // #endregion
}
