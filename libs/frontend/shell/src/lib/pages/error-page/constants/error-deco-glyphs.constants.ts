import type { DecoGlyph } from '@vfortin/ui';

/**
 * Constant ERROR_DECO_GLYPHS
 *
 * @description
 * Decorative glyphs placed around the error page grid and copy.
 *
 * @type {readonly DecoGlyph[]}
 */
export const ERROR_DECO_GLYPHS: readonly DecoGlyph[] = [
  { shape: 'cross', x: 6, y: 18, size: 56, depth: 0, phase: 1, tint: 'violet' },
  { shape: 'dot', x: 93, y: 12, size: 48, depth: 0, phase: 3, tint: 'cyan' },
  { shape: 'square', x: 90, y: 84, size: 52, depth: 0, phase: 0, tint: 'pink' },
  { shape: 'dot', x: 4, y: 86, size: 44, depth: 0, phase: 2, tint: 'blue' },
];
