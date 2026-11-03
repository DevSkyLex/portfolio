/**
 * Interface PixelGrid
 * @interface PixelGrid
 *
 * @description
 * Transform values used to snap canvas marks to the physical pixel grid.
 */
export interface PixelGrid {
  // #region Properties
  /**
   * Property k
   * @readonly
   *
   * @description
   * Physical pixels per CSS pixel in the current canvas transform.
   *
   * @type {number}
   */
  k: number;

  /**
   * Property x
   * @readonly
   *
   * @description
   * Horizontal transform offset in physical pixels.
   *
   * @type {number}
   */
  x: number;

  /**
   * Property y
   * @readonly
   *
   * @description
   * Vertical transform offset in physical pixels.
   *
   * @type {number}
   */
  y: number;
  // #endregion
}
