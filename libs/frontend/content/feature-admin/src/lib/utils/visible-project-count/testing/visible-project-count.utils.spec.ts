import type { AdminProject } from '@vfortin/content-web-data-access/admin';
import { DATA_TABLE_INITIAL_STATE } from '@vfortin/ui';
import { visibleProjectCount } from '@internal/content-web-feature-admin/lib/utils/visible-project-count/visible-project-count.utils';

/**
 * Function project
 *
 * @description
 * Project fields read by the search and the facets; the rest of the view model is irrelevant here.
 *
 * @param {string} slug - Slug and French title.
 * @param {'draft' | 'published'} status - Publication state.
 *
 * @returns {AdminProject} Partial project.
 */
const project = (slug: string, status: 'draft' | 'published'): AdminProject =>
  ({
    slug,
    status,
    title: { fr: slug },
    techs: [],
    featured: false,
    missing: [],
  }) as unknown as AdminProject;

/**
 * Constant PROJECTS
 *
 * @description
 * Two published projects and a draft.
 */
const PROJECTS: AdminProject[] = [
  project('alpha', 'published'),
  project('beta', 'published'),
  project('gamma', 'draft'),
];

describe('visibleProjectCount', (): void => {
  it('has no narrowed count while no search or facet is active', (): void => {
    expect(visibleProjectCount(PROJECTS, DATA_TABLE_INITIAL_STATE)).toBeNull();
    expect(
      visibleProjectCount(PROJECTS, {
        ...DATA_TABLE_INITIAL_STATE,
        search: '   ',
        facets: { statut: [] },
      }),
    ).toBeNull();
  });

  it('counts the projects passing the search and every facet, zero included', (): void => {
    expect(
      visibleProjectCount(PROJECTS, {
        ...DATA_TABLE_INITIAL_STATE,
        facets: { statut: ['publie'] },
      }),
    ).toBe(2);
    expect(
      visibleProjectCount(PROJECTS, {
        ...DATA_TABLE_INITIAL_STATE,
        search: 'beta',
        facets: { statut: ['publie'] },
      }),
    ).toBe(1);
    expect(visibleProjectCount(PROJECTS, { ...DATA_TABLE_INITIAL_STATE, search: 'zzz' })).toBe(0);
  });
});
