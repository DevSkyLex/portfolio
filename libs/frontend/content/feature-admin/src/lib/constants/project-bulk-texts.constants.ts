import type { ProjectBulkAction } from '@internal/content-web-feature-admin/lib/models/project-bulk-action/project-bulk-action.type';
import type { ProjectBulkTexts } from '@internal/content-web-feature-admin/lib/models/project-bulk-action/project-bulk-texts.interface';

/**
 * Constant PROJECT_BULK_TEXTS
 *
 * @description
 * Copy of the selection bar's bulk actions (`@@admin.projects.bulk.*`). `$localize` has no plural
 * forms, so each count has a `one` message (the French singular, for 0 and 1) and an `other` one;
 * the confirmation buttons share the action labels of `PROJECT_BULK_ACTIONS`.
 *
 * @type {Readonly<Record<ProjectBulkAction, ProjectBulkTexts>>}
 */
export const PROJECT_BULK_TEXTS: Readonly<Record<ProjectBulkAction, ProjectBulkTexts>> = {
  publish: {
    confirmTitle: (subject: string): string =>
      $localize`:@@admin.projects.bulk.publish.confirmTitle:Publier ${subject}:subject: ?`,
    confirmDescription: $localize`:@@admin.projects.bulk.publish.confirmDescription:Visible sur le site public à la prochaine reconstruction (quelques minutes).`,
    confirmLabel: $localize`:@@admin.projects.action.publish:Publier`,
    tone: 'default',
    done: (count: number): string =>
      count < 2
        ? $localize`:@@admin.projects.bulk.publish.done.one:${count}:count: projet publié`
        : $localize`:@@admin.projects.bulk.publish.done.other:${count}:count: projets publiés`,
    partial: (count: number, total: number): string =>
      count < 2
        ? $localize`:@@admin.projects.bulk.publish.partial.one:${count}:count: projet publié sur ${total}:total:`
        : $localize`:@@admin.projects.bulk.publish.partial.other:${count}:count: projets publiés sur ${total}:total:`,
  },
  unpublish: {
    confirmTitle: (subject: string): string =>
      $localize`:@@admin.projects.bulk.unpublish.confirmTitle:Dépublier ${subject}:subject: ?`,
    confirmDescription: $localize`:@@admin.projects.bulk.unpublish.confirmDescription:Retour en brouillon : retiré du site public à la prochaine reconstruction (quelques minutes).`,
    confirmLabel: $localize`:@@admin.projects.action.unpublish:Dépublier`,
    tone: 'danger',
    done: (count: number): string =>
      count < 2
        ? $localize`:@@admin.projects.bulk.unpublish.done.one:${count}:count: projet dépublié`
        : $localize`:@@admin.projects.bulk.unpublish.done.other:${count}:count: projets dépubliés`,
    partial: (count: number, total: number): string =>
      count < 2
        ? $localize`:@@admin.projects.bulk.unpublish.partial.one:${count}:count: projet dépublié sur ${total}:total:`
        : $localize`:@@admin.projects.bulk.unpublish.partial.other:${count}:count: projets dépubliés sur ${total}:total:`,
  },
  feature: {
    confirmTitle: (subject: string): string =>
      $localize`:@@admin.projects.bulk.feature.confirmTitle:Mettre en avant ${subject}:subject: ?`,
    confirmDescription: $localize`:@@admin.projects.bulk.homeChange:La page d'accueil du site public change à la prochaine reconstruction (quelques minutes).`,
    confirmLabel: $localize`:@@admin.projects.action.feature:Mettre en avant`,
    tone: 'default',
    done: (count: number): string =>
      count < 2
        ? $localize`:@@admin.projects.bulk.feature.done.one:${count}:count: projet mis en avant`
        : $localize`:@@admin.projects.bulk.feature.done.other:${count}:count: projets mis en avant`,
    partial: (count: number, total: number): string =>
      count < 2
        ? $localize`:@@admin.projects.bulk.feature.partial.one:${count}:count: projet mis en avant sur ${total}:total:`
        : $localize`:@@admin.projects.bulk.feature.partial.other:${count}:count: projets mis en avant sur ${total}:total:`,
  },
  unfeature: {
    confirmTitle: (subject: string): string =>
      $localize`:@@admin.projects.bulk.unfeature.confirmTitle:Retirer ${subject}:subject: de l'accueil ?`,
    confirmDescription: $localize`:@@admin.projects.bulk.homeChange:La page d'accueil du site public change à la prochaine reconstruction (quelques minutes).`,
    confirmLabel: $localize`:@@admin.projects.action.unfeature:Retirer de l'accueil`,
    tone: 'default',
    done: (count: number): string =>
      count < 2
        ? $localize`:@@admin.projects.bulk.unfeature.done.one:${count}:count: projet retiré de l'accueil`
        : $localize`:@@admin.projects.bulk.unfeature.done.other:${count}:count: projets retirés de l'accueil`,
    partial: (count: number, total: number): string =>
      count < 2
        ? $localize`:@@admin.projects.bulk.unfeature.partial.one:${count}:count: projet retiré de l'accueil sur ${total}:total:`
        : $localize`:@@admin.projects.bulk.unfeature.partial.other:${count}:count: projets retirés de l'accueil sur ${total}:total:`,
  },
};
