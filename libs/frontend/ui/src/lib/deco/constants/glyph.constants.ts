import type { GlyphShape } from '@internal/ui/lib/deco/models/deco/glyph-shape.type';

/**
 * Constant SHAPES
 *
 * @description
 * Maps glyph shape names to token-based styles sized relative to the host font.
 *
 * @type {Readonly<Record<GlyphShape, string>>}
 */
export const SHAPES: Readonly<Record<GlyphShape, string>> = {
  dot: 'size-[0.2em] rounded-[50%] bg-current',
  square: 'size-[0.2em] bg-current',
  cross:
    'size-[0.3em] bg-[linear-gradient(currentColor,currentColor),linear-gradient(currentColor,currentColor)] bg-[length:100%_0.07em,0.07em_100%] bg-center bg-no-repeat',
};
