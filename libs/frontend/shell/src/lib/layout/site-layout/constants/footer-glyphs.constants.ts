import type { DecoGlyph } from '@vfortin/ui';

/**
 * Constant FOOTER_GLYPHS
 *
 * @description
 * Decorative glyphs positioned in the footer margins.
 *
 * @type {readonly DecoGlyph[]}
 */
export const FOOTER_GLYPHS: readonly DecoGlyph[] = [
  { shape: 'cross', x: 92, y: 22, size: 70, depth: 0.6, phase: 1, tint: 'cyan' },
  { shape: 'dot', x: 3, y: 18, size: 50, depth: 0.5, phase: 3, tint: 'pink' },
  { shape: 'square', x: 60, y: 12, size: 44, depth: 0.8, phase: 0, tint: 'violet', mid: true },
];
