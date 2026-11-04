import { DomainError } from '@internal/content-domain/lib/errors/domain-error';
import {
  PROJECT_SEO_DESCRIPTION_MAX_LENGTH,
  PROJECT_SEO_KEYWORDS_MAX_COUNT,
  PROJECT_SEO_KEYWORD_MAX_LENGTH,
  PROJECT_SEO_KEYWORD_MIN_LENGTH,
  PROJECT_SEO_TITLE_MAX_LENGTH,
  ProjectSeo,
  type ProjectSeoProps,
} from '@internal/content-domain/lib/values/project-seo/project-seo';

describe('ProjectSeo', (): void => {
  it('trims the texts and keywords and leaves blank texts and empty lists out', (): void => {
    const seo: ProjectSeo = ProjectSeo.of({
      title: { fr: '  Movah, suivi de séries  ', en: '   ' },
      description: { en: ' A series tracker. ' },
      keywords: { fr: ['  Flutter ', 'Supabase'], en: [] },
    });
    expect(seo.toProps()).toEqual({
      title: { fr: 'Movah, suivi de séries' },
      description: { en: 'A series tracker.' },
      keywords: { fr: ['Flutter', 'Supabase'] },
    });
  });

  it('resolves one language without falling back on the other', (): void => {
    const seo: ProjectSeo = ProjectSeo.of({
      title: { fr: 'Movah, suivi de séries' },
      description: { en: 'A series tracker.' },
      keywords: { en: ['series tracker'] },
    });
    expect(seo.in('fr')).toEqual({
      title: 'Movah, suivi de séries',
      description: null,
      keywords: [],
    });
    expect(seo.in('en')).toEqual({
      title: null,
      description: 'A series tracker.',
      keywords: ['series tracker'],
    });
    expect(ProjectSeo.empty().in('fr')).toEqual({ title: null, description: null, keywords: [] });
    expect(ProjectSeo.empty().toProps()).toEqual({ title: {}, description: {}, keywords: {} });
  });

  it('accepts values at the limits, counted after trimming', (): void => {
    const title: string = 'a'.repeat(PROJECT_SEO_TITLE_MAX_LENGTH);
    const description: string = 'b'.repeat(PROJECT_SEO_DESCRIPTION_MAX_LENGTH);
    const longest: string = 'c'.repeat(PROJECT_SEO_KEYWORD_MAX_LENGTH);
    const shortest: string[] = Array.from(
      { length: PROJECT_SEO_KEYWORDS_MAX_COUNT },
      (_: unknown, index: number): string =>
        String(index).padStart(PROJECT_SEO_KEYWORD_MIN_LENGTH, 'k'),
    );
    const seo: ProjectSeo = ProjectSeo.of({
      title: { en: ` ${title} ` },
      description: { fr: description },
      keywords: { fr: shortest, en: [` ${longest} `] },
    });
    expect(seo.in('en').title).toBe(title);
    expect(seo.in('fr').description).toBe(description);
    expect(seo.in('fr').keywords).toEqual(shortest);
    expect(seo.in('en').keywords).toEqual([longest]);
  });

  it.each<[string, ProjectSeoProps]>([
    [
      'seo.title.en',
      {
        title: { en: 'a'.repeat(PROJECT_SEO_TITLE_MAX_LENGTH + 1) },
        description: {},
        keywords: {},
      },
    ],
    [
      'seo.description.fr',
      {
        title: {},
        description: { fr: 'b'.repeat(PROJECT_SEO_DESCRIPTION_MAX_LENGTH + 1) },
        keywords: {},
      },
    ],
    [
      'seo.keywords.fr',
      {
        title: {},
        description: {},
        keywords: {
          fr: Array.from(
            { length: PROJECT_SEO_KEYWORDS_MAX_COUNT + 1 },
            (_: unknown, index: number): string => `keyword ${index}`,
          ),
        },
      },
    ],
    [
      'seo.keywords.en',
      {
        title: {},
        description: {},
        keywords: { en: ['c'.repeat(PROJECT_SEO_KEYWORD_MAX_LENGTH + 1)] },
      },
    ],
    ['seo.keywords.fr', { title: {}, description: {}, keywords: { fr: ['Flutter', ' x '] } }],
    ['seo.keywords.en', { title: {}, description: {}, keywords: { en: ['Flutter', '   '] } }],
    ['seo.keywords.fr', { title: {}, description: {}, keywords: { fr: ['Flutter', ' flutter'] } }],
  ])('rejects an invalid %s', (field: string, props: ProjectSeoProps): void => {
    expect((): ProjectSeo => ProjectSeo.of(props)).toThrow(DomainError);
    expect((): ProjectSeo => ProjectSeo.of(props)).toThrow(
      expect.objectContaining({ code: 'content.invalid-value', details: [field] }),
    );
  });
});
