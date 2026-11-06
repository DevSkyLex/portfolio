import type { ChartTone } from '@internal/ui/lib/chart/models/chart/chart-tone.type';

/**
 * Interface ChartLegendEntry
 * @interface ChartLegendEntry
 *
 * @description
 * One named colour of a chart's legend; its order is the order of the segments it names.
 */
export interface ChartLegendEntry {
  // #region Properties
  /**
   * Property key
   * @readonly
   *
   * @description
   * Key that the segments of this entry carry.
   */
  readonly key: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Name shown in the legend and the table view.
   */
  readonly label: string;

  /**
   * Property tone
   * @readonly
   *
   * @description
   * Colour of the entry's marks.
   */
  readonly tone: ChartTone;
  // #endregion
}
