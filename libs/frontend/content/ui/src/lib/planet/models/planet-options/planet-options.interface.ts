import type { PlanetSide } from '@internal/content-web-ui/lib/planet/models/planet-side/planet-side.type';

/**
 * Interface PlanetOptions
 * @interface PlanetOptions
 *
 * @description
 * Rendering and interaction settings passed from the Angular host to the canvas renderer.
 */
export interface PlanetOptions {
  // #region Properties
  /**
   * Property reduced
   * @readonly
   *
   * @description
   * Disables the animation loop when reduced motion is requested.
   *
   * @type {boolean}
   */
  reduced: boolean;

  /**
   * Property fixed
   * @readonly
   *
   * @description
   * Positions the planet against page scroll while it is pinned behind content.
   *
   * @type {boolean}
   */
  fixed: boolean;

  /**
   * Property side
   * @readonly
   *
   * @description
   * Horizontal edge used to place the planet off frame.
   *
   * @type {PlanetSide}
   */
  side: PlanetSide;

  /**
   * Property lens
   * @readonly
   *
   * @description
   * Enables the pointer-following brightness lens.
   *
   * @type {boolean}
   */
  lens: boolean;

  /**
   * Property blend
   * @readonly
   *
   * @description
   * Mix amount used by the glyph pass.
   *
   * @type {number}
   */
  blend: number;

  /**
   * Property quality
   * @readonly
   *
   * @description
   * Device pixel ratio quality preset.
   *
   * @type {'medium' | 'high'}
   */
  quality: 'medium' | 'high';

  /**
   * Property cell
   * @readonly
   *
   * @description
   * Glyph cell dimension in CSS pixels.
   *
   * @type {number}
   */
  cell: number;

  /**
   * Property forms
   * @readonly
   *
   * @description
   * Named mark ramp requested by the host.
   *
   * @type {string}
   */
  forms: string;

  /**
   * Property scale
   * @readonly
   *
   * @description
   * Planet radius multiplier.
   *
   * @type {number}
   */
  scale: number;

  /**
   * Property lift
   * @readonly
   *
   * @description
   * Fractional radius offset applied to the planet's vertical center.
   *
   * @type {number}
   */
  lift: number;
  // #endregion
}
