/**
 * Constant PROJECT_VISUAL_TINTS
 *
 * @description
 * Placeholder backgrounds mapped to project positions using the home page tint order from the mockup;
 * neutral ink over the raised surface, like the project cards (D41).
 *
 * @type {readonly string[]}
 */
export const PROJECT_VISUAL_TINTS = [
  'bg-[color-mix(in_srgb,var(--ink)_5%,var(--surface-raised))]',
  'bg-[color-mix(in_srgb,var(--ink)_3%,var(--surface-raised))]',
  'bg-[color-mix(in_srgb,var(--ink)_8%,var(--surface-raised))]',
  'bg-[color-mix(in_srgb,var(--ink)_6%,var(--surface-raised))]',
] as const;
