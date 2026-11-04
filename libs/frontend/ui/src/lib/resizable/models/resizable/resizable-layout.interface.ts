import type { PanelLimits } from '@internal/ui/lib/resizable/models/resizable/panel-limits.interface';
import type { PanelPixels } from '@internal/ui/lib/resizable/models/resizable/panel-pixels.interface';

/**
 * Interface ResizableLayout
 * @interface ResizableLayout
 *
 * @description
 * Persisted layout of one resizable panel group: the storage key, the default panel percentages and
 * the bounds a stored layout must respect, one entry per panel in group order; optionally the panel
 * remembered in pixels (`ResizableLayoutService.readPixels`).
 */
export interface ResizableLayout {
  // #region Properties
  /**
   * Property key
   * @readonly
   *
   * @description
   * Browser storage key holding the group's last layout, unique per area.
   *
   * @type {string}
   */
  readonly key: string;

  /**
   * Property sizes
   * @readonly
   *
   * @description
   * Default panel percentages, summing to 100; used when nothing valid is stored and on reset.
   *
   * @type {readonly number[]}
   */
  readonly sizes: readonly number[];

  /**
   * Property limits
   * @readonly
   *
   * @description
   * Minimum and maximum size of each panel, matching its `minSize` and `maxSize` inputs. A stored
   * percentage layout is checked against the percentage bounds only; pixel bounds apply once the
   * group is measured.
   *
   * @type {readonly PanelLimits[]}
   */
  readonly limits: readonly PanelLimits[];

  /**
   * Property pixels
   * @readonly
   *
   * @description
   * Panel remembered in pixels, read with `readPixels` and bound to its `defaultSize` as `'<n>px'`.
   *
   * @type {PanelPixels | undefined}
   */
  readonly pixels?: PanelPixels;
  // #endregion
}
