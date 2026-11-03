import type { DecoGlyph } from '@vfortin/ui';

/**
 * Constant PROJECTS_DECO
 *
 * @description
 * Decorative glyph positions and tints framing the project card grid.
 *
 * @type {readonly DecoGlyph[]}
 */
export const PROJECTS_DECO: readonly DecoGlyph[] = [
  { shape: 'dot', x: 3, y: 8, size: 64, depth: 0.6, phase: 0, tint: 'pink' },
  { shape: 'cross', x: 95, y: 4, size: 70, depth: 1, phase: 2, tint: 'violet' },
  { shape: 'square', x: 5, y: 40, size: 48, depth: 0.4, phase: 4, tint: 'blue' },
  { shape: 'cross', x: 2.5, y: 72, size: 60, depth: 0.8, phase: 1, tint: 'cyan' },
  { shape: 'dot', x: 96, y: 55, size: 56, depth: 0.5, phase: 3, tint: 'pink' },
  { shape: 'square', x: 94, y: 88, size: 52, depth: 0.9, phase: 5, tint: 'violet' },
  { shape: 'cross', x: 60, y: 2, size: 54, depth: 0.7, phase: 2, tint: 'blue', mid: true },
  { shape: 'dot', x: 78, y: 5, size: 40, depth: 0.4, phase: 6, tint: 'cyan', mid: true },
];
