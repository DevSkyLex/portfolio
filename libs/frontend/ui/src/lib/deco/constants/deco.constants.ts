import type { DecoTint } from '@internal/ui/lib/deco/models/deco/deco-tint.type';

/**
 * Constant TINTS
 *
 * @description
 * Maps each supported decorative tint to its Orbite utility class.
 *
 * @type {Readonly<Record<DecoTint, string>>}
 */
export const TINTS: Readonly<Record<DecoTint, string>> = {
  pink: 'text-aurora-pink',
  violet: 'text-aurora-violet',
  blue: 'text-aurora-blue',
  cyan: 'text-aurora-cyan',
};
