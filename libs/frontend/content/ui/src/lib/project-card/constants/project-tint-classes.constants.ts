import type { ProjectTint } from '@internal/content-web-ui/lib/project-card/models/project-tint/project-tint.type';

/**
 * Constant PROJECT_TINT_CLASSES
 *
 * @description
 * Maps each mockup tint index to its literal Tailwind background class: neutral ink over the raised
 * surface, at a lightness of its own so that neighbouring placeholders stay apart (D41).
 *
 * @type {Readonly<Record<ProjectTint, string>>}
 */
export const PROJECT_TINT_CLASSES: Readonly<Record<ProjectTint, string>> = {
  1: 'bg-[color-mix(in_srgb,var(--fg)_6%,var(--surface-raised))]',
  2: 'bg-[color-mix(in_srgb,var(--fg)_3%,var(--surface-raised))]',
  3: 'bg-[color-mix(in_srgb,var(--fg)_8%,var(--surface-raised))]',
  4: 'bg-[color-mix(in_srgb,var(--fg)_4%,var(--surface-raised))]',
  5: 'bg-[color-mix(in_srgb,var(--fg)_5%,var(--surface-raised))]',
};
