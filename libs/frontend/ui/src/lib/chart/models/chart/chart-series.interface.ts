import type { ChartPoint } from '@internal/ui/lib/chart/models/chart/chart-point.interface';
import type { ChartTone } from '@internal/ui/lib/chart/models/chart/chart-tone.type';

/**
 * Interface ChartSeries
 * @interface ChartSeries
 *
 * @description
 * One line of a multi-series chart; every series of a chart lists the same x labels in the same order.
 */
export interface ChartSeries {
  // #region Properties
  /**
   * Property key
   * @readonly
   *
   * @description
   * Stable identity of the series, which keeps its tone whatever the other series.
   */
  readonly key: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Name shown in the legend, the tooltip and the table view.
   */
  readonly label: string;

  /**
   * Property tone
   * @readonly
   *
   * @description
   * Colour of the line.
   */
  readonly tone: ChartTone;

  /**
   * Property points
   * @readonly
   *
   * @description
   * Values in x order.
   */
  readonly points: readonly ChartPoint[];
  // #endregion
}
