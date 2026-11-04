import type { AdminProject } from '@vfortin/content-web-data-access/admin';
import { lucideCircleCheck, lucideCircleDashed, lucideStar } from '@ng-icons/lucide';
import type { DataTableFacet } from '@vfortin/ui';

/**
 * Constant PROJECT_TABLE_FACETS
 *
 * @description
 * Faceted filters of the project table. Their ids and option values are the query parameters of the
 * list URL (`?statut=publie&accueil=oui&completude=a-completer`), so they stay French and URL-safe in every locale, unlike the labels (`accueil` predates the "Mis en avant" label and keeps old links valid).
 *
 * @type {readonly DataTableFacet<AdminProject>[]}
 */
export const PROJECT_TABLE_FACETS: readonly DataTableFacet<AdminProject>[] = [
  {
    id: 'statut',
    label: $localize`:@@admin.projects.heading.status:Statut`,
    icon: lucideCircleDashed,
    value: (project: AdminProject): string =>
      project.status === 'published' ? 'publie' : 'brouillon',
    options: [
      { value: 'publie', label: $localize`:@@admin.projects.status.published:Publié` },
      { value: 'brouillon', label: $localize`:@@admin.projects.status.draft:Brouillon` },
    ],
  },
  {
    id: 'accueil',
    label: $localize`:@@admin.projects.heading.featured:Mis en avant`,
    icon: lucideStar,
    value: (project: AdminProject): string => (project.featured ? 'oui' : 'non'),
    options: [
      { value: 'oui', label: $localize`:@@admin.projects.featured.yes:Oui` },
      { value: 'non', label: $localize`:@@admin.projects.featured.no:Non` },
    ],
  },
  {
    id: 'completude',
    label: $localize`:@@admin.projects.heading.completeness:Complétude`,
    icon: lucideCircleCheck,
    value: (project: AdminProject): string =>
      project.missing.length === 0 ? 'complet' : 'a-completer',
    options: [
      { value: 'complet', label: $localize`:@@admin.projects.completeness.complete:Complet` },
      {
        value: 'a-completer',
        label: $localize`:@@admin.projects.completeness.incomplete:À compléter`,
      },
    ],
  },
];
