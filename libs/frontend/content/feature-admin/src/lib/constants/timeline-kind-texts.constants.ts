import { lucideBriefcase, lucideGraduationCap } from '@ng-icons/lucide';
import type { TimelineKind } from '@vfortin/content-web-data-access/admin';
import type { TimelineKindTexts } from '@internal/content-web-feature-admin/lib/models/timeline-kind-texts/timeline-kind-texts.interface';

/**
 * Constant TIMELINE_KIND_TEXTS
 *
 * @description
 * Copy of the « Expériences » and « Formations » screens by kind, French source with English targets.
 * The title placeholders are French content examples (they show in the French field only), so they
 * are not messages.
 *
 * @type {Readonly<Record<TimelineKind, TimelineKindTexts>>}
 */
export const TIMELINE_KIND_TEXTS: Readonly<Record<TimelineKind, TimelineKindTexts>> = {
  experience: {
    section: $localize`:@@admin.timeline.experience.section:Expériences`,
    one: $localize`:@@admin.timeline.experience.one:expérience`,
    many: $localize`:@@admin.timeline.experience.many:expériences`,
    create: $localize`:@@admin.timeline.experience.create:Nouvelle expérience`,
    back: $localize`:@@admin.timeline.experience.back:Toutes les expériences`,
    empty: $localize`:@@admin.timeline.experience.empty:Aucune expérience`,
    emptyHint: $localize`:@@admin.timeline.experience.emptyHint:Les expériences ajoutées ici apparaissent sur le site public, placées par date.`,
    searchLabel: $localize`:@@admin.timeline.experience.searchLabel:Rechercher dans les expériences`,
    noResults: $localize`:@@admin.timeline.experience.noResults:Aucune expérience trouvée`,
    noResultsHint: $localize`:@@admin.timeline.experience.noResultsHint:Aucune expérience ne correspond à la recherche ou aux filtres.`,
    loadFailed: $localize`:@@admin.timeline.experience.loadFailed:Impossible de charger les expériences`,
    newEntryHint: $localize`:@@admin.timeline.experience.newEntryHint:Ajoutée à la fin de la liste des expériences.`,
    listConflict: $localize`:@@admin.timeline.experience.listConflict:Une expérience a été modifiée entre-temps : la liste a été rechargée, recommencez.`,
    noneDeleted: (total: number): string =>
      $localize`:@@admin.timeline.experience.noneDeleted:Aucune expérience supprimée sur ${total}:total:.`,
    icon: lucideBriefcase,
    titlePlaceholder: 'Développeur web fullstack',
    placePlaceholder: $localize`:@@admin.timeline.experience.placePlaceholder:Entreprise, ville`,
  },
  education: {
    section: $localize`:@@admin.timeline.education.section:Formations`,
    one: $localize`:@@admin.timeline.education.one:formation`,
    many: $localize`:@@admin.timeline.education.many:formations`,
    create: $localize`:@@admin.timeline.education.create:Nouvelle formation`,
    back: $localize`:@@admin.timeline.education.back:Toutes les formations`,
    empty: $localize`:@@admin.timeline.education.empty:Aucune formation`,
    emptyHint: $localize`:@@admin.timeline.education.emptyHint:Les formations ajoutées ici apparaissent sur le site public, placées par date.`,
    searchLabel: $localize`:@@admin.timeline.education.searchLabel:Rechercher dans les formations`,
    noResults: $localize`:@@admin.timeline.education.noResults:Aucune formation trouvée`,
    noResultsHint: $localize`:@@admin.timeline.education.noResultsHint:Aucune formation ne correspond à la recherche ou aux filtres.`,
    loadFailed: $localize`:@@admin.timeline.education.loadFailed:Impossible de charger les formations`,
    newEntryHint: $localize`:@@admin.timeline.education.newEntryHint:Ajoutée à la fin de la liste des formations.`,
    listConflict: $localize`:@@admin.timeline.education.listConflict:Une formation a été modifiée entre-temps : la liste a été rechargée, recommencez.`,
    noneDeleted: (total: number): string =>
      $localize`:@@admin.timeline.education.noneDeleted:Aucune formation supprimée sur ${total}:total:.`,
    icon: lucideGraduationCap,
    titlePlaceholder: 'BTS SIO, option SLAM',
    placePlaceholder: $localize`:@@admin.timeline.education.placePlaceholder:École, ville`,
  },
};
