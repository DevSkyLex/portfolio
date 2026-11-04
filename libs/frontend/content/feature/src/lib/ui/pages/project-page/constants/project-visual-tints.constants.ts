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
  'bg-[color-mix(in_srgb,var(--fg)_5%,var(--surface-raised))]',
  'bg-[color-mix(in_srgb,var(--fg)_3%,var(--surface-raised))]',
  'bg-[color-mix(in_srgb,var(--fg)_8%,var(--surface-raised))]',
  'bg-[color-mix(in_srgb,var(--fg)_6%,var(--surface-raised))]',
] as const;
