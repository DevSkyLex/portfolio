import type { DecoGlyph } from '@vfortin/ui';

/**
 * Constant SKILLS_DECO
 *
 * @description
 * Decorative glyph positions and tints around the skills columns.
 *
 * @type {readonly DecoGlyph[]}
 */
export const SKILLS_DECO: readonly DecoGlyph[] = [
  { shape: 'dot', x: 96, y: 18, size: 56, depth: 0.6, phase: 2, tint: 'violet' },
  { shape: 'cross', x: 3, y: 62, size: 60, depth: 0.8, phase: 0, tint: 'blue' },
  { shape: 'square', x: 94, y: 84, size: 48, depth: 0.5, phase: 4, tint: 'cyan' },
];
