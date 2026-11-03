import type { Rgb } from '@internal/content-web-ui/lib/models/rgb/rgb.type';

/**
 * Interface Palette
 * @interface Palette
 *
 * @description
 * Theme colours consumed by the timeline canvas renderer.
 */
export interface Palette {
  // #region Properties
  /**
   * Property star
   * @readonly
   *
   * @description
   * Foreground colour used for bright markers and stars.
   *
   * @type {Rgb}
   */
  star: Rgb;

  /**
   * Property muted
   * @readonly
   *
   * @description
   * Low emphasis colour used for inactive timeline details.
   *
   * @type {Rgb}
   */
  muted: Rgb;

  /**
   * Property pink
   * @readonly
   *
   * @description
   * First aurora gradient stop.
   *
   * @type {Rgb}
   */
  pink: Rgb;

  /**
   * Property violet
   * @readonly
   *
   * @description
   * Second aurora gradient stop.
   *
   * @type {Rgb}
   */
  violet: Rgb;

  /**
   * Property blue
   * @readonly
   *
   * @description
   * Third aurora gradient stop.
   *
   * @type {Rgb}
   */
  blue: Rgb;

  /**
   * Property cyan
   * @readonly
   *
   * @description
   * Final aurora gradient stop.
   *
   * @type {Rgb}
   */
  cyan: Rgb;

  /**
   * Property void
   * @readonly
   *
   * @description
   * Canvas background colour.
   *
   * @type {Rgb}
   */
  void: Rgb;
  // #endregion
}
