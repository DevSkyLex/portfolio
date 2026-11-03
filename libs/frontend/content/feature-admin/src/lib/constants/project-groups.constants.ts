import type { ProjectGroupDefinition } from '@internal/content-web-feature-admin/lib/models/project-group/project-group-definition.interface';

/**
 * Constant PROJECT_GROUPS
 *
 * @description
 * Status groups of the project list, in display order: published first, then drafts (D36).
 *
 * @type {readonly ProjectGroupDefinition[]}
 */
export const PROJECT_GROUPS: readonly ProjectGroupDefinition[] = [
  { status: 'published', label: 'Publiés' },
  { status: 'draft', label: 'Brouillons' },
];
