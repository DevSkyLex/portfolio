import type { AdminProject } from '@vfortin/content-web-data-access/admin';
import {
  bulkTargets,
  changesPublicSite,
  isBulkEligible,
  projectCount,
} from '@internal/content-web-feature-admin/lib/utils/project-bulk/project-bulk.utils';

/**
 * Function project
 *
 * @description
 * Project fields read by the eligibility rules; the rest of the view model is irrelevant here.
 *
 * @param {string} id - Identity.
 * @param {Partial<AdminProject>} fields - Status, feature and missing fields.
 *
 * @returns {AdminProject} Partial project.
 */
function project(id: string, fields: Partial<AdminProject>): AdminProject {
  return { id, status: 'draft', featured: false, missing: [], ...fields } as AdminProject;
}

const complete: AdminProject = project('complete', {});
const incomplete: AdminProject = project('incomplete', { missing: ['lead.fr'] });
const published: AdminProject = project('published', { status: 'published', featured: true });

describe('project bulk utils', (): void => {
  it('follows the row menu: complete drafts publish, published projects unpublish', (): void => {
    expect(isBulkEligible('publish', complete)).toBe(true);
    expect(isBulkEligible('publish', incomplete)).toBe(false);
    expect(isBulkEligible('publish', published)).toBe(false);
    expect(isBulkEligible('unpublish', published)).toBe(true);
    expect(isBulkEligible('unpublish', complete)).toBe(false);
  });

  it('features what is not featured and the reverse, in selection order', (): void => {
    const selection: AdminProject[] = [published, incomplete, complete];
    expect(bulkTargets('feature', selection).map((p) => p.id)).toEqual(['incomplete', 'complete']);
    expect(bulkTargets('unfeature', selection).map((p) => p.id)).toEqual(['published']);
    expect(bulkTargets('publish', selection).map((p) => p.id)).toEqual(['complete']);
  });

  it('changes the public site on any publication change, a feature only for a published project', (): void => {
    expect(changesPublicSite('publish', [complete])).toBe(true);
    expect(changesPublicSite('unpublish', [published])).toBe(true);
    expect(changesPublicSite('feature', [complete, incomplete])).toBe(false);
    expect(changesPublicSite('unfeature', [complete, published])).toBe(true);
    expect(changesPublicSite('publish', [])).toBe(false);
  });

  it('writes a French count with a real plural', (): void => {
    expect(projectCount(0)).toBe('0 projet');
    expect(projectCount(1)).toBe('1 projet');
    expect(projectCount(3)).toBe('3 projets');
  });
});
