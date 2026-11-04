import type { AdminProject } from '@vfortin/content-web-data-access/admin';
import type { DataTableColumn } from '@vfortin/ui';

/**
 * Constant PROJECT_TABLE_COLUMNS
 *
 * @description
 * Columns of the project table (D36): their cells are templates of the project list dataview. The
 * sortable ids (`titre`, `statut`, `version`) are the `tri` values of the list URL. Secondary columns
 * hide on a narrow page, so that the table fits more often than it scrolls sideways. The table's
 * columns are resizable, so it takes the fixed layout: every column but the title is fixed at its
 * `width` (the room its heading and widest cell need) within its bounds, and the title, without one,
 * fills the room left down to 120 px, its cell truncating through its own `w-0 min-w-full` wrapper.
 * The actions keep 52 px: the 28 px menu button and the table's 24 px end gutter, without a start
 * padding.
 *
 * @type {readonly DataTableColumn<AdminProject>[]}
 */
export const PROJECT_TABLE_COLUMNS: readonly DataTableColumn<AdminProject>[] = [
  {
    id: 'titre',
    header: $localize`:@@admin.projects.heading.project:Projet`,
    sortable: true,
    hideable: false,
    sortValue: (project: AdminProject): string => project.title.fr,
    minWidth: 120,
  },
  {
    id: 'slug',
    header: $localize`:@@admin.projects.heading.slug:Slug`,
    sortable: true,
    sortValue: (project: AdminProject): string => project.slug,
    class: '@max-[760px]:hidden',
    width: 160,
    minWidth: 64,
    maxWidth: 320,
  },
  {
    id: 'statut',
    header: $localize`:@@admin.projects.heading.status:Statut`,
    sortable: true,
    sortValue: (project: AdminProject): string => project.status,
    width: 112,
    minWidth: 64,
    maxWidth: 240,
  },
  {
    id: 'accueil',
    header: $localize`:@@admin.projects.heading.featured:Mis en avant`,
    class: '@max-[760px]:hidden',
    width: 112,
    minWidth: 56,
    maxWidth: 200,
  },
  {
    id: 'completude',
    header: $localize`:@@admin.projects.heading.completeness:Complétude`,
    class: '@max-[640px]:hidden',
    width: 144,
    minWidth: 64,
    maxWidth: 280,
  },
  {
    id: 'technos',
    header: $localize`:@@admin.projects.heading.techs:Technos`,
    class: '@max-[1024px]:hidden',
    width: 224,
    minWidth: 64,
    maxWidth: 480,
  },
  {
    id: 'version',
    header: $localize`:@@admin.projects.heading.version:Version`,
    sortable: true,
    sortValue: (project: AdminProject): number => project.version,
    class: '@max-[760px]:hidden',
    width: 88,
    minWidth: 48,
    maxWidth: 160,
  },
  {
    id: 'actions',
    header: $localize`:@@admin.projects.heading.actions:Actions`,
    headerHidden: true,
    hideable: false,
    resizable: false,
    class: 'ps-0',
    width: 52,
  },
];
