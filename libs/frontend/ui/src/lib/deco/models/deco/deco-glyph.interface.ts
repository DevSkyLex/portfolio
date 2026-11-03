import type { DecoTint } from '@internal/ui/lib/deco/models/deco/deco-tint.type';
import type { GlyphShape } from '@internal/ui/lib/deco/models/deco/glyph-shape.type';

/**
 * Interface DecoGlyph
 * @interface DecoGlyph
 *
 * @description
 * Position, scale, parallax and colour settings for one floating glyph in a section's decorative layer.
 */
export interface DecoGlyph {
  // #region Properties
  /**
   * Property shape
   * @readonly
   *
   * @description
   * Geometric glyph rendered at the configured position.
   *
   * @type {GlyphShape}
   */
  readonly shape: GlyphShape;

  /**
   * Property x
   * @readonly
   *
   * @description
   * Horizontal position as a percentage of the parent section.
   *
   * @type {number}
   */
  readonly x: number;

  /**
   * Property y
   * @readonly
   *
   * @description
   * Vertical position as a percentage of the parent section.
   *
   * @type {number}
   */
  readonly y: number;

  /**
   * Property size
   * @readonly
   *
   * @description
   * Glyph font size in pixels before the narrow-container scale is applied.
   *
   * @type {number}
   */
  readonly size: number;

  /**
   * Property depth
   * @readonly
   *
   * @description
   * Parallax multiplier where zero stays fixed and one uses the full layer displacement.
   *
   * @type {number}
   */
  readonly depth: number;

  /**
   * Property phase
   * @readonly
   *
   * @description
   * Negative animation delay in seconds, offsetting each glyph's float cycle.
   *
   * @type {number}
   */
  readonly phase: number;

  /**
   * Property tint
   * @readonly
   *
   * @description
   * Aurora text colour applied to the glyph.
   *
   * @type {DecoTint}
   */
  readonly tint: DecoTint;

  /**
   * Property mid
   * @readonly
   *
   * @description
   * Hides a central-column glyph below 768px so it does not overlap narrow-screen content.
   *
   * @type {boolean | undefined}
   */
  readonly mid?: boolean;
  // #endregion
}
