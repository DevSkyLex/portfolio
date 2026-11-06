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
  for (const field of ['id', 'slug', 'status', 'version', 'position', 'missing', 'media']) {
    delete revision[field];
  }
  return revision;
}

describe('AdminProjectDtoSchema', (): void => {
  it('accepts the fixture shared by the service and the admin screen', (): void => {
    expect(AdminProjectDtoSchema.parse(project).missing).toEqual(['cover.alt.en']);
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
      title: { fr: '  Library Trails  ', en: ' Library Trails ' },
    });
    expect(parsed.title).toEqual({ fr: 'Library Trails', en: 'Library Trails' });
    expect(parsed.period).toEqual({
      start: { year: 2025, month: 2 },
      end: { year: 2025, month: 10 },
    });
  });

  it.each([
    ['whole years', { start: { year: 2023, month: null }, end: { year: 2026, month: null } }],
    ['months of one year', { start: { year: 2023, month: 3 }, end: { year: 2023, month: 4 } }],
    ['a single month', { start: { year: 2023, month: 3 }, end: { year: 2023, month: 3 } }],
    ['mixed precision', { start: { year: 2023, month: 9 }, end: { year: 2023, month: null } }],
    ['an ongoing year', { start: { year: 2023, month: null }, end: null }],
  ])('accepts a period of %s', (_label, period): void => {
    expect(ProjectRevisionRequestSchema.safeParse({ ...revisionOf(project), period }).success).toBe(
      true,
    );
  });

  it.each([
    ['an empty French title', { title: { fr: '   ' } }],
    ['a plain http link', { siteUrl: 'http://example.com/demos/library-trails' }],
    ['a malformed tech key', { techs: ['Vue.js'] }],
    ['too many techs', { techs: Array.from({ length: 13 }, (_, i): string => `t${i}`) }],
    ['an article without French document', { article: { en: project.article.en } }],
    ['no period', { period: null }],
    ['a year before 1990', { period: { start: { year: 1989, month: null }, end: null } }],
    ['a thirteenth month', { period: { start: { year: 2023, month: 13 }, end: null } }],
    [
      'an end year before the start',
      { period: { start: { year: 2024, month: null }, end: { year: 2023, month: null } } },
    ],
    [
      'an end month before the start in the same year',
      { period: { start: { year: 2023, month: 4 }, end: { year: 2023, month: 3 } } },
    ],
    ['a cover without uuid', { cover: { media: 'cover.png', alt: { fr: 'Alt' } } }],
    [
      'a cover alternative text over 300 characters',
      { cover: { media: project.cover.media, alt: { fr: 'x'.repeat(301) } } },
    ],
  ])('rejects %s', (_label, override): void => {
    expect(
      ProjectRevisionRequestSchema.safeParse({ ...revisionOf(project), ...override }).success,
    ).toBe(false);
  });
});
