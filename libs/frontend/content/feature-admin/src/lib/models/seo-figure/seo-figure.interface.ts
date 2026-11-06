import type { SeoDelta } from '@internal/content-web-feature-admin/lib/models/seo-delta/seo-delta.interface';

/**
 * Interface SeoFigure
 * @interface SeoFigure
 *
 * @description
 * Key figure of a dashboard tab: its name, its formatted value and, for a windowed report, its change
 * against the period before (`null` when there is none to compare or the figure is not compared).
 */
export interface SeoFigure {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable identity of the figure.
   */
  readonly id: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Name of the figure.
   */
  readonly label: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Formatted value.
   */
  readonly value: string;

  /**
   * Property delta
   * @readonly
   *
   * @description
   * Change against the period before, or `null`.
   */
  readonly delta: SeoDelta | null;
  // #endregion
}
