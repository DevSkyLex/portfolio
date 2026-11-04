/**
 * Interface PanelPixels
 * @interface PanelPixels
 *
 * @description
 * The panel of a persisted layout whose size is remembered in pixels rather than in percent, such as
 * a sidebar that keeps its width when the window changes.
 */
export interface PanelPixels {
  // #region Properties
  /**
   * Property index
   * @readonly
   *
   * @description
   * Position of the panel in the group.
   *
   * @type {number}
   */
  readonly index: number;

  /**
   * Property default
   * @readonly
   *
   * @description
   * Default size in pixels, used when nothing valid is stored and on reset.
   *
   * @type {number}
   */
  readonly default: number;
  // #endregion
}
