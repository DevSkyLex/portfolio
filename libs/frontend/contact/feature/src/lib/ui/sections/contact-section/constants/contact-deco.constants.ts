import type { DecoGlyph } from '@vfortin/ui';

/**
 * Constant CONTACT_DECO
 *
 * @description
 * Decorative glyphs positioned in the contact section margins to match the contact mockup.
 *
 * @type {readonly DecoGlyph[]}
 */
export const CONTACT_DECO: readonly DecoGlyph[] = [
  { shape: 'dot', x: 96, y: 12, size: 60, depth: 0.6, phase: 2, tint: 'blue' },
  { shape: 'cross', x: 3, y: 30, size: 64, depth: 0.8, phase: 0, tint: 'violet' },
  { shape: 'square', x: 95, y: 60, size: 50, depth: 0.5, phase: 4, tint: 'pink' },
  { shape: 'dot', x: 3, y: 85, size: 48, depth: 0.4, phase: 1, tint: 'cyan' },
  { shape: 'cross', x: 45, y: 3, size: 52, depth: 0.7, phase: 3, tint: 'pink', mid: true },
];
