import type { ProjectViewOption } from '@internal/content-web-feature-admin/lib/models/project-view/project-view-option.interface';

/**
 * Constant PROJECT_VIEW_OPTIONS
 *
 * @description
 * Status filters of the project list title bar, in display order.
 *
 * @type {readonly ProjectViewOption[]}
 */
export const PROJECT_VIEW_OPTIONS: readonly ProjectViewOption[] = [
  { value: 'all', label: 'Tous' },
  { value: 'published', label: 'Publiés' },
  { value: 'draft', label: 'Brouillons' },
];
