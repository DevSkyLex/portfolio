import type { PanelSize } from '@internal/ui/lib/resizable/models/resizable/panel-size.type';

/**
 * Interface PanelLimits
 * @interface PanelLimits
 *
 * @description
 * Minimum and maximum size accepted by one panel in a resizable group, each a percentage of the group
 * or a `'<n>px'` length.
 */
export interface PanelLimits {
  // #region Properties
  /**
   * Property min
   * @readonly
   *
   * @description
   * Lower size bound for the panel.
   *
   * @type {PanelSize}
   */
  readonly min: PanelSize;

  /**
   * Property max
   * @readonly
   *
   * @description
   * Upper size bound for the panel.
   *
   * @type {PanelSize}
   */
  readonly max: PanelSize;
  // #endregion
}
