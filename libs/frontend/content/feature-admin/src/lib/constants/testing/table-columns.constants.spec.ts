import type { AdminProject, AdminTimelineEntry } from '@vfortin/content-web-data-access/admin';
import type { DataTableColumn, DataTableFacet } from '@vfortin/ui';
import { PROJECT_TABLE_COLUMNS } from '@internal/content-web-feature-admin/lib/constants/project-table-columns.constants';
import { PROJECT_TABLE_FACETS } from '@internal/content-web-feature-admin/lib/constants/project-table-facets.constants';
import { TIMELINE_TABLE_COLUMNS } from '@internal/content-web-feature-admin/lib/constants/timeline-table-columns.constants';

/**
 * Function project
 *
 * @description
 * Builds the fields of a project the columns and facets read.
 *
 * @param {Partial<AdminProject>} fields - Overrides.
 * @returns {AdminProject} Project.
 */
function project(fields: Partial<AdminProject>): AdminProject {
  return {
    title: { fr: 'Atlas', en: 'Atlas' },
    slug: 'atlas',
    status: 'draft',
    featured: false,
    missing: [],
    version: 3,
    ...fields,
  } as unknown as AdminProject;
}

/**
 * Function entry
 *
 * @description
 * Builds the fields of a timeline entry the columns read.
 *
 * @param {Partial<AdminTimelineEntry>} fields - Overrides.
 * @returns {AdminTimelineEntry} Entry.
 */
function entry(fields: Partial<AdminTimelineEntry>): AdminTimelineEntry {
  return {
    title: { fr: 'Studio', en: 'Studio' },
    place: { fr: 'Lyon', en: 'Lyon' },
    start: { year: 2023, month: 1 },
    end: null,
    ...fields,
  } as unknown as AdminTimelineEntry;
}

/**
 * Function sortValues
 *
 * @description
 * Sort value of every sortable column for one row.
 *
 * @param {readonly DataTableColumn<T>[]} columns - Columns.
 * @param {T} row - Row.
 * @returns {Record<string, unknown>} Values by column id.
 */
function sortValues<T>(columns: readonly DataTableColumn<T>[], row: T): Record<string, unknown> {
  return Object.fromEntries(
    columns
      .filter((column: DataTableColumn<T>): boolean => column.sortValue !== undefined)
      .map((column: DataTableColumn<T>) => [column.id, column.sortValue?.(row)]),
  );
}

describe('PROJECT_TABLE_COLUMNS', (): void => {
  it('heads every visible column with an icon, the hidden actions column without', (): void => {
    for (const column of PROJECT_TABLE_COLUMNS) {
      expect(Boolean(column.icon), column.id).toBe(!column.headerHidden);
    }
  });

  it('sorts by the French title, the slug, the status and the version', (): void => {
    expect(sortValues(PROJECT_TABLE_COLUMNS, project({}))).toEqual({
      titre: 'Atlas',
      slug: 'atlas',
      statut: 'draft',
      version: 3,
    });
  });
});

describe('PROJECT_TABLE_FACETS', (): void => {
  it('files a project under its status, its home feature and its completeness', (): void => {
    const value = (row: AdminProject): string[] =>
      PROJECT_TABLE_FACETS.map((facet: DataTableFacet<AdminProject>): string =>
        String(facet.value(row)),
      );
    expect(value(project({}))).toEqual(['brouillon', 'non', 'complet']);
    expect(
      value(
        project({
          status: 'published',
          featured: true,
          missing: ['cover'] as unknown as AdminProject['missing'],
        }),
      ),
    ).toEqual(['publie', 'oui', 'a-completer']);
  });
});

describe('TIMELINE_TABLE_COLUMNS', (): void => {
  it('heads every visible column with an icon, the hidden actions column without', (): void => {
    for (const column of TIMELINE_TABLE_COLUMNS) {
      expect(Boolean(column.icon), column.id).toBe(!column.headerHidden);
    }
  });

  it('sorts by title, place and period, an ongoing entry after every dated one', (): void => {
    const ongoing: Record<string, unknown> = sortValues(TIMELINE_TABLE_COLUMNS, entry({}));
    const ended: Record<string, unknown> = sortValues(
      TIMELINE_TABLE_COLUMNS,
      entry({ end: { year: 2024, month: 6 } as AdminTimelineEntry['end'] }),
    );
    expect(ongoing['intitule']).toBe('Studio');
    expect(ongoing['lieu']).toBe('Lyon');
    expect(Number(ongoing['periode'])).toBeGreaterThan(Number(ended['periode']));
  });
});
