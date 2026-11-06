import {
  PROJECT_SEO_LIMITS,
  ProjectSeoDtoSchema,
  PublicProjectSeoSchema,
  type ProjectSeoDto,
} from '@internal/content-contracts/lib/project-seo.contract';

/**
 * Function keywords
 *
 * @description
 * Distinct keywords of the given count and length.
 */
function keywords(count: number, length: number = 8): string[] {
  return Array.from({ length: count }, (_: unknown, index: number): string =>
    String(index).padStart(length, 'k'),
  );
}

describe('ProjectSeoDtoSchema', (): void => {
  it('accepts empty, partial and complete search values, trimmed', (): void => {
    expect(ProjectSeoDtoSchema.parse({ title: {}, description: {}, keywords: { fr: [] } })).toEqual(
      { title: {}, description: {}, keywords: { fr: [] } },
    );
    expect(
      ProjectSeoDtoSchema.parse({
        title: { fr: '  Library Trails  ' },
        description: { en: 'App.' },
        keywords: { fr: [' Flutter '], en: ['series tracker'] },
      }),
    ).toEqual({
      title: { fr: 'Library Trails' },
      description: { en: 'App.' },
      keywords: { fr: ['Flutter'], en: ['series tracker'] },
    });
  });

  it('rejects a title or a description over its limit', (): void => {
    expect(
      ProjectSeoDtoSchema.safeParse({
        title: { fr: 'x'.repeat(PROJECT_SEO_LIMITS.title + 1) },
        description: {},
        keywords: { fr: [] },
      }).success,
    ).toBe(false);
    expect(
      ProjectSeoDtoSchema.safeParse({
        title: {},
        description: { en: 'x'.repeat(PROJECT_SEO_LIMITS.description + 1) },
        keywords: { fr: [] },
      }).success,
    ).toBe(false);
  });

  it('accepts keywords at their bounds, counted after trimming', (): void => {
    const parsed: ProjectSeoDto = ProjectSeoDtoSchema.parse({
      title: {},
      description: {},
      keywords: {
        fr: keywords(PROJECT_SEO_LIMITS.keywords, PROJECT_SEO_LIMITS.keywordMinLength),
        en: [` ${'k'.repeat(PROJECT_SEO_LIMITS.keywordMaxLength)} `],
      },
    });
    expect(parsed.keywords.fr).toHaveLength(PROJECT_SEO_LIMITS.keywords);
    expect(parsed.keywords.en).toEqual(['k'.repeat(PROJECT_SEO_LIMITS.keywordMaxLength)]);
  });

  it.each([
    ['too many keywords', { fr: keywords(PROJECT_SEO_LIMITS.keywords + 1) }],
    ['a keyword too short once trimmed', { fr: ['Flutter', ' x '] }],
    ['a keyword too long', { fr: ['k'.repeat(PROJECT_SEO_LIMITS.keywordMaxLength + 1)] }],
    ['a duplicate regardless of case', { fr: ['Flutter', ' flutter'] }],
    ['an English duplicate', { fr: [], en: ['Series', 'SERIES'] }],
    ['no French list', { en: ['Flutter'] }],
  ])('rejects %s', (_: string, value: unknown): void => {
    expect(
      ProjectSeoDtoSchema.safeParse({ title: {}, description: {}, keywords: value }).success,
    ).toBe(false);
  });
});

describe('PublicProjectSeoSchema', (): void => {
  it('accepts null fallbacks and an empty keyword list, and refuses an empty text', (): void => {
    expect(
      PublicProjectSeoSchema.safeParse({ title: null, description: null, keywords: [] }).success,
    ).toBe(true);
    expect(
      PublicProjectSeoSchema.safeParse({ title: '', description: null, keywords: [] }).success,
    ).toBe(false);
  });

  it('refuses a snapshot without keywords or with a duplicate', (): void => {
    expect(PublicProjectSeoSchema.safeParse({ title: null, description: null }).success).toBe(
      false,
    );
    expect(
      PublicProjectSeoSchema.safeParse({
        title: null,
        description: null,
        keywords: ['Flutter', 'flutter'],
      }).success,
    ).toBe(false);
  });
});
