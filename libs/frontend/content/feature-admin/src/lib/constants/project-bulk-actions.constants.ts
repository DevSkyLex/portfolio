import type { ProjectBulkAction } from '@internal/content-web-feature-admin/lib/models/project-bulk-action/project-bulk-action.type';

/**
 * Constant PROJECT_BULK_ACTIONS
 *
 * @description
 * Bulk actions of the project table's selection bar, in display order: the row menu's publication
 * actions, then the home-page feature, which the editor's properties set one project at a time. The
 * labels share their messages with the row menu and the confirmation buttons.
 *
 * @type {readonly { readonly action: ProjectBulkAction; readonly label: string }[]}
 */
export const PROJECT_BULK_ACTIONS: readonly {
  readonly action: ProjectBulkAction;
  readonly label: string;
}[] = [
  { action: 'publish', label: $localize`:@@admin.projects.action.publish:Publier` },
  { action: 'unpublish', label: $localize`:@@admin.projects.action.unpublish:Dépublier` },
  { action: 'feature', label: $localize`:@@admin.projects.action.feature:Mettre en avant` },
  {
    action: 'unfeature',
    label: $localize`:@@admin.projects.action.unfeature:Retirer de l'accueil`,
  },
];
