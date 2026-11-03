import type { DecoGlyph } from '@vfortin/ui';

/**
 * Constant ABOUT_DECO
 *
 * @description
 * Decorative glyph positions and tints rendered in the about section margins.
 *
 * @type {readonly DecoGlyph[]}
 */
export const ABOUT_DECO: readonly DecoGlyph[] = [
  { shape: 'square', x: 3, y: 15, size: 56, depth: 0.7, phase: 1, tint: 'cyan' },
  { shape: 'cross', x: 96, y: 10, size: 64, depth: 0.5, phase: 3, tint: 'pink' },
  { shape: 'dot', x: 4, y: 80, size: 60, depth: 0.9, phase: 0, tint: 'violet' },
  { shape: 'cross', x: 50, y: 6, size: 50, depth: 0.6, phase: 4, tint: 'blue', mid: true },
];
