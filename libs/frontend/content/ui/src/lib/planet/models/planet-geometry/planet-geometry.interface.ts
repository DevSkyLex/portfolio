/**
 * Interface PlanetGeometry
 * @interface PlanetGeometry
 *
 * @description
 * Canvas-space center and radius for the decorative planet.
 */
export interface PlanetGeometry {
  // #region Properties
  /**
   * Property R
   * @readonly
   *
   * @description
   * Planet radius in CSS pixels.
   *
   * @type {number}
   */
  R: number;

  /**
   * Property x
   * @readonly
   *
   * @description
   * Horizontal center in CSS pixels.
   *
   * @type {number}
   */
  x: number;

  /**
   * Property y
   * @readonly
   *
   * @description
   * Vertical center in CSS pixels.
   *
   * @type {number}
   */
  y: number;
  // #endregion
}
