import type { ProjectGroup } from '@internal/content-web-feature-admin/lib/models/project-group/project-group.interface';
import type { AdminProject } from '@vfortin/content-web-data-access/admin';
import { groupProjects } from '@internal/content-web-feature-admin/lib/utils/group-projects/group-projects.utils';

/**
 * Function project
 *
 * @description
 * Builds the fields of an administrator project the grouping reads; the rest of the shape is irrelevant here.
 *
 * @param {string} slug - Slug and identifier.
 * @param {AdminProject['status']} status - Publication status.
 * @param {AdminProject['title']} title - Localized title.
 *
 * @returns {AdminProject} Project fixture.
 */
const project: (
  slug: string,
  status: AdminProject['status'],
  title: AdminProject['title'],
) => AdminProject = (
  slug: string,
  status: AdminProject['status'],
  title: AdminProject['title'],
): AdminProject => ({ id: slug, slug, status, title }) as AdminProject;

const projects: AdminProject[] = [
  project('cabinet', 'draft', { fr: 'Cabinet médical', en: 'Medical practice' }),
  project('atelier', 'published', { fr: 'Atelier', en: 'Workshop' }),
  project('archive', 'draft', { fr: 'Archive' }),
];

describe('groupProjects', (): void => {
  it('puts published projects first and keeps the collection order inside a group', (): void => {
    expect(
      groupProjects(projects, '', 'all').map((group: ProjectGroup): (string | string[])[] => [
        group.label,
        group.projects.map((p: AdminProject): string => p.slug),
      ]),
    ).toEqual([
      ['Publiés', ['atelier']],
      ['Brouillons', ['cabinet', 'archive']],
    ]);
  });

  it('requires every word in a title or the slug, ignoring case and accents', (): void => {
    const groups: ProjectGroup[] = groupProjects(projects, '  MEDECIN  ', 'all');
    expect(groups).toEqual([]);
    expect(groupProjects(projects, 'cabinet MÉDICAL', 'all')[0]?.projects).toEqual([projects[0]]);
    expect(groupProjects(projects, 'workshop', 'all')[0]?.projects).toEqual([projects[1]]);
    expect(groupProjects(projects, 'archive', 'all')[0]?.projects).toEqual([projects[2]]);
  });

  it('keeps only the filtered status and drops empty groups', (): void => {
    expect(
      groupProjects(projects, '', 'published').map(
        (group: ProjectGroup): 'draft' | 'published' => group.status,
      ),
    ).toEqual(['published']);
    expect(groupProjects(projects, 'cabinet', 'published')).toEqual([]);
  });
});
