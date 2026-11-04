import type { AdminTimelineEntry } from '@vfortin/content-web-data-access/admin';
import type { DataTableColumn } from '@vfortin/ui';

/**
 * Constant TIMELINE_TABLE_COLUMNS
 *
 * @description
 * Columns of the experience and education tables, sortable and resizable like the project table:
 * the title fills the room left (down to 120 px), the others start at their `width` within their
 * bounds. The period sorts chronologically (start month, then end month, ongoing last), the place and
 * the title by their French text; the headers follow the admin's language. The state, place and
 * technologies are also the table's facets (`timelineTableFacets`).
 *
 * @type {readonly DataTableColumn<AdminTimelineEntry>[]}
 */
export const TIMELINE_TABLE_COLUMNS: readonly DataTableColumn<AdminTimelineEntry>[] = [
  {
    id: 'intitule',
    header: $localize`:@@admin.timeline.column.title:Intitulé`,
    sortable: true,
    hideable: false,
    sortValue: (entry: AdminTimelineEntry): string => entry.title.fr,
    minWidth: 120,
  },
  {
    id: 'periode',
    header: $localize`:@@admin.timeline.column.period:Période`,
    sortable: true,
    // Months as one number; an ongoing entry ends after every dated one.
    sortValue: (entry: AdminTimelineEntry): number =>
      (entry.start.year * 12 + entry.start.month) * 100_000 +
      (entry.end ? entry.end.year * 12 + entry.end.month : 99_999),
    class: 'w-52 @max-[640px]:hidden',
    width: 208,
    minWidth: 96,
    maxWidth: 320,
  },
  {
    id: 'lieu',
    header: $localize`:@@admin.timeline.column.place:Lieu`,
    sortable: true,
    sortValue: (entry: AdminTimelineEntry): string => entry.place.fr,
    class: 'w-56 @max-[760px]:hidden',
    width: 224,
    minWidth: 64,
    maxWidth: 360,
  },
  {
    id: 'technos',
    header: $localize`:@@admin.timeline.column.techs:Technos`,
    class: 'w-56 @max-[1024px]:hidden',
    width: 224,
    minWidth: 64,
    maxWidth: 400,
  },
  {
    id: 'actions',
    header: $localize`:@@admin.timeline.column.actions:Actions`,
    headerHidden: true,
    hideable: false,
    resizable: false,
    class: 'w-10',
    width: 40,
  },
];
