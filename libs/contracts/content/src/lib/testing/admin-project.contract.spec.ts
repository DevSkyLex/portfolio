import {
  AdminProjectDtoSchema,
  AdminProjectListSchema,
  type ProjectRevisionRequest,
  ProjectRevisionRequestSchema,
} from '@internal/content-contracts/lib/admin-project.contract';
import project from '@internal/content-contracts/lib/testing/admin-project.fixture.json';

/**
 * Function revisionOf
 *
 * @description
 * Selects editable revision fields from a full administrator DTO by removing server-managed identity and status fields.
 *
 * @param {typeof project} dto - Project data returned by the API or fixture.
 * @returns {Record<string, unknown>} Request payload containing only revision fields.
 */
function revisionOf(dto: typeof project): Record<string, unknown> {
  const revision: Record<string, unknown> = { ...dto };
  for (const field of ['id', 'slug', 'status', 'version', 'position', 'missing']) {
    delete revision[field];
  }
  return revision;
}

describe('AdminProjectDtoSchema', (): void => {
  it('accepts the fixture shared by the service and the admin screen', (): void => {
    expect(AdminProjectDtoSchema.parse(project).missing).toEqual(['article.lessons.en']);
    expect(AdminProjectListSchema.parse({ member: [project], totalItems: 1 }).totalItems).toBe(1);
  });

  it('rejects a version that is not an integer', (): void => {
    expect(AdminProjectDtoSchema.safeParse({ ...project, version: 1.5 }).success).toBe(false);
  });
});

describe('ProjectRevisionRequestSchema', (): void => {
  it('accepts the revision built from the fixture and trims the texts', (): void => {
    const parsed: ProjectRevisionRequest = ProjectRevisionRequestSchema.parse({
      ...revisionOf(project),
      title: { fr: '  Movah  ', en: ' Movah ' },
    });
    expect(parsed.title).toEqual({ fr: 'Movah', en: 'Movah' });
  });

  it.each([
    ['an empty French title', { title: { fr: '   ' } }],
    ['a plain http link', { siteUrl: 'http://movah.app' }],
    ['a malformed tech key', { techs: ['Vue.js'] }],
    ['too many techs', { techs: Array.from({ length: 13 }, (_, i): string => `t${i}`) }],
  ])('rejects %s', (_label, override): void => {
    expect(
      ProjectRevisionRequestSchema.safeParse({ ...revisionOf(project), ...override }).success,
    ).toBe(false);
  });
});
