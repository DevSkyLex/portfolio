import type { ProjectPeriodBound } from '@internal/content-web-data-access/lib/admin/models/project-period/project-period-bound.interface';

/**
 * Interface ProjectPeriod
 * @interface ProjectPeriod
 *
 * @description
 * Period of a project (D46), the value of the catalogue's period picker; the service writes the
 * public label from it.
 */
export interface ProjectPeriod {
  // #region Properties
  /**
   * Property start
   * @readonly
   *
   * @description
   * First month or year.
   */
  readonly start: ProjectPeriodBound;

  /**
   * Property end
   * @readonly
   *
   * @description
   * Last month or year, inclusive, or `null` while ongoing.
   */
  readonly end: ProjectPeriodBound | null;
  // #endregion
}
