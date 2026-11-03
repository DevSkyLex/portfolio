import type { ProjectTint } from '@internal/content-web-ui/lib/project-card/models/project-tint/project-tint.type';

/**
 * Constant PROJECT_TINT_CLASSES
 *
 * @description
 * Maps each mockup tint index to its literal Tailwind background class.
 *
 * @type {Readonly<Record<ProjectTint, string>>}
 */
export const PROJECT_TINT_CLASSES: Readonly<Record<ProjectTint, string>> = {
  1: 'bg-[color-mix(in_srgb,var(--aurora-violet)_14%,var(--void-raised))]',
  2: 'bg-[color-mix(in_srgb,var(--aurora-blue)_14%,var(--void-raised))]',
  3: 'bg-[color-mix(in_srgb,var(--aurora-pink)_12%,var(--void-raised))]',
  4: 'bg-[color-mix(in_srgb,var(--aurora-cyan)_10%,var(--void-raised))]',
  5: 'bg-[color-mix(in_srgb,var(--aurora-pink)_8%,color-mix(in_srgb,var(--aurora-violet)_10%,var(--void-raised)))]',
};
