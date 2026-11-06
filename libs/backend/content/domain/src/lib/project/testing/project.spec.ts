import { DomainError } from '@internal/content-domain/lib/errors/domain-error';
import { assertSkillGroup } from '@internal/content-domain/lib/profile/profile';
import {
  LocalizedText,
  type LocalizedTextProps,
} from '@internal/content-domain/lib/values/localized-text/localized-text';
import { Slug } from '@internal/content-domain/lib/values/slug/slug';
import {
  ArticleDocument,
  type ArticleBlock,
} from '@internal/content-domain/lib/values/article-document/article-document';
import { ProjectPeriod } from '@internal/content-domain/lib/values/project-period/project-period';
import { ProjectSeo } from '@internal/content-domain/lib/values/project-seo/project-seo';
import { Project, type ProjectProps } from '@internal/content-domain/lib/project/project';

/**
 * Constant MEDIA
 *
 * @description
 * Media identifiers referenced by the cover and figure fixtures.
 */
const MEDIA: readonly [string, string, string] = [
  '8c9d0e1f-2a3b-4c5d-8e6f-7a8b9c0d1e2f',
  '3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90',
  '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d',
];

/**
 * Constant text
 *
 * @description
 * Creates a valid localized value for project aggregate tests.
 *
 * @param {string} fr - French source text.
 * @param {string} en - Optional English translation.
 * @returns {LocalizedText} Normalized domain value.
 */
const text: (fr: string, en?: string) => LocalizedText = (fr: string, en?: string): LocalizedText =>
  LocalizedText.of('test', en === undefined ? { fr } : ({ fr, en } satisfies LocalizedTextProps));

/**
 * Function doc
 *
 * @description
 * Builds an article document holding one paragraph, then the supplied figures.
 *
 * @param {string} paragraph - Paragraph text; blank text leaves the paragraph without content.
 * @param {readonly { media: string; alt: string }[]} figures - Figures appended to the paragraph.
 * @returns {ArticleDocument} Document value.
 */
function doc(
  paragraph: string,
  figures: readonly { media: string; alt: string }[] = [],
): ArticleDocument {
  const first: ArticleBlock =
    paragraph === ''
      ? { type: 'paragraph' }
      : { type: 'paragraph', content: [{ type: 'text', text: paragraph }] };
  return ArticleDocument.of('article', {
    type: 'doc',
    content: [
      first,
      ...figures.map((figure: { media: string; alt: string }): ArticleBlock => ({
        type: 'figure',
        attrs: { ...figure, caption: '' },
      })),
    ],
  });
}

/**
 * Function projectProps
 *
 * @description
 * Builds a complete valid project state and applies selected overrides for aggregate rule tests.
 *
 * @param {Partial<ProjectProps>} overrides - State fields replacing the valid defaults.
 * @returns {ProjectProps} Project state suitable for rehydration.
 */
function projectProps(overrides: Partial<ProjectProps> = {}): ProjectProps {
  return {
    id: 'p-1',
    slug: Slug.of('library-trails'),
    title: text('Library Trails', 'Library Trails'),
    summary: text('Résumé', 'Summary'),
    lead: text('Intro', 'Lead'),
    period: ProjectPeriod.of({ start: { year: 2026, month: null }, end: null }),
    client: text('Projet personnel', 'Personal project'),
    role: text('Conception', 'Design'),
    place: text('Android et iOS', 'Android and iOS'),
    siteUrl: null,
    techs: ['flutter', 'dart'],
    featured: true,
    position: 0,
    status: 'draft',
    version: 1,
    article: { fr: doc('Paragraphe'), en: doc('Paragraph') },
    cover: null,
    seo: ProjectSeo.empty(),
    ...overrides,
  };
}

describe('Project', (): void => {
  it('publishes when every requested locale is complete', (): void => {
    const project: Project = Project.rehydrate(projectProps());
    project.publish(['fr', 'en']);
    expect(project.isPublished()).toBe(true);
    project.unpublish();
    expect(project.status).toBe('draft');
  });

  it('refuses English publication and lists the missing fields', (): void => {
    const project: Project = Project.rehydrate(projectProps({ lead: text('Intro') }));
    expect((): void => project.publish(['fr', 'en'])).toThrow(DomainError);
    expect(project.missingFor(['fr', 'en'])).toEqual(['lead.en']);
    expect(project.isPublished()).toBe(false);
  });

  it('publishes in French only even without a translation', (): void => {
    const project: Project = Project.rehydrate(
      projectProps({ lead: text('Intro'), article: { fr: doc('Texte') } }),
    );
    project.publish(['fr']);
    expect(project.isPublished()).toBe(true);
  });

  it('reports an empty or absent article document', (): void => {
    const project: Project = Project.rehydrate(projectProps({ article: { fr: doc('  ') } }));
    expect(project.missingFor(['fr', 'en'])).toEqual(['article.fr', 'article.en']);
    expect((): void => project.publish(['fr'])).toThrow(
      expect.objectContaining({ code: 'content.project-incomplete', details: ['article.fr'] }),
    );
  });

  it('reports figures and a cover without alternative text, per locale', (): void => {
    const project: Project = Project.rehydrate(
      projectProps({
        article: {
          fr: doc('', [{ media: MEDIA[1], alt: 'Écran' }]),
          en: doc('Text', [{ media: MEDIA[2], alt: ' ' }]),
        },
        cover: { media: MEDIA[0], alt: { fr: 'Accueil', en: '  ' } },
      }),
    );
    expect(project.missingFor(['fr', 'en'])).toEqual(['article.en.figures', 'cover.alt.en']);
    const untranslated: Project = Project.rehydrate(
      projectProps({ cover: { media: MEDIA[0], alt: { fr: '' } } }),
    );
    expect(untranslated.missingFor(['fr', 'en'])).toEqual(['cover.alt.fr', 'cover.alt.en']);
  });

  it('lists its media once, the cover first', (): void => {
    const project: Project = Project.rehydrate(
      projectProps({
        article: {
          fr: doc('a', [
            { media: MEDIA[1], alt: 'a' },
            { media: MEDIA[0], alt: 'b' },
          ]),
          en: doc('b', [
            { media: MEDIA[2], alt: 'c' },
            { media: MEDIA[1], alt: 'd' },
          ]),
        },
        cover: { media: MEDIA[0], alt: { fr: 'c' } },
      }),
    );
    expect(project.mediaIds()).toEqual([MEDIA[0], MEDIA[1], MEDIA[2]]);
    expect(Project.rehydrate(projectProps({ article: { fr: doc('a') } })).mediaIds()).toEqual([]);
  });

  it.each([
    ['a negative position', { position: -1 }],
    ['a zero version', { version: 0 }],
    ['a non-https link', { siteUrl: 'http://example.com' }],
    ['an invalid tech key', { techs: ['Vue.js'] }],
    ['a duplicate tech', { techs: ['dart', 'dart'] }],
    ['a cover without media', { cover: { media: ' ', alt: { fr: 'a' } } }],
  ])('refuse %s', (_label, overrides): void => {
    expect((): Project =>
      Project.rehydrate(projectProps(overrides as Partial<ProjectProps>)),
    ).toThrow(DomainError);
  });

  it('exposes its identity and keeps a copy of its techs', (): void => {
    const techs: string[] = ['flutter'];
    const project: Project = Project.rehydrate(projectProps({ techs, position: 3, version: 2 }));
    techs.push('dart');
    expect([project.id, project.slug.value, project.position, project.version]).toEqual([
      'p-1',
      'library-trails',
      3,
      2,
    ]);
    expect(project.snapshot().techs).toEqual(['flutter']);
  });

  it('revises a draft freely, even into an incomplete text', (): void => {
    const project: Project = Project.rehydrate(projectProps());
    project.revise({ ...projectProps(), title: text('Nouveau') }, ['fr', 'en']);
    expect(project.snapshot().title.fr).toBe('Nouveau');
    expect(project.missingFor(['fr', 'en'])).toEqual(['title.en']);
  });

  it('keeps a published project complete', (): void => {
    const project: Project = Project.rehydrate(projectProps({ status: 'published' }));
    expect((): void =>
      project.revise({ ...projectProps(), lead: text('Intro') }, ['fr', 'en']),
    ).toThrow(
      expect.objectContaining({ code: 'content.project-incomplete', details: ['lead.en'] }),
    );
    expect((): void =>
      project.revise({ ...projectProps(), article: { fr: doc('Texte') } }, ['fr', 'en']),
    ).toThrow(expect.objectContaining({ details: ['article.en'] }));
    expect((): void =>
      project.revise({ ...projectProps(), cover: { media: MEDIA[0], alt: { fr: 'Accueil' } } }, [
        'fr',
        'en',
      ]),
    ).toThrow(expect.objectContaining({ details: ['cover.alt.en'] }));
    project.revise(
      {
        ...projectProps(),
        title: text('Library Trails 2', 'Library Trails 2'),
        cover: { media: MEDIA[0], alt: { fr: 'Accueil', en: 'Home' } },
      },
      ['fr', 'en'],
    );
    expect(project.snapshot()).toMatchObject({
      title: { en: 'Library Trails 2' },
      cover: { media: MEDIA[0], alt: { fr: 'Accueil', en: 'Home' } },
    });
  });

  it('revises the search texts without making them a publication requirement', (): void => {
    const project: Project = Project.rehydrate(projectProps({ status: 'published' }));
    const seo: ProjectSeo = ProjectSeo.of({
      title: { fr: 'Library Trails, suivi de séries' },
      description: {},
      keywords: { fr: ['Flutter'] },
    });
    project.revise({ ...projectProps(), seo }, ['fr', 'en']);
    expect(project.snapshot().seo.in('fr').title).toBe('Library Trails, suivi de séries');
    expect(project.snapshot().seo.in('fr').keywords).toEqual(['Flutter']);
    expect(project.missingFor(['fr', 'en'])).toEqual([]);
    project.revise({ ...projectProps(), seo: ProjectSeo.empty() }, ['fr', 'en']);
    expect(project.snapshot().seo.in('fr')).toEqual({
      title: null,
      description: null,
      keywords: [],
    });
  });

  it('only revises the editable fields', (): void => {
    const project: Project = Project.rehydrate(projectProps());
    // @ts-expect-error Runtime boundary deliberately receives immutable fields and must ignore them.
    project.revise({ ...projectProps(), id: 'other', status: 'published', version: 9 }, ['fr']);
    expect(project.snapshot()).toMatchObject({ id: 'p-1', status: 'draft', version: 1 });
  });

  it('accepts an https link', (): void => {
    const project: Project = Project.rehydrate(projectProps({ siteUrl: 'https://example.com' }));
    expect(project.snapshot().siteUrl).toBe('https://example.com');
  });
});

describe('assertSkillGroup', (): void => {
  it('requires at least one tech', (): void => {
    const group: Parameters<typeof assertSkillGroup>[0] = {
      id: 'g',
      domain: text('Outils'),
      techs: [],
      usage: text('u'),
      position: 0,
    };
    expect(() => assertSkillGroup(group)).toThrow(DomainError);
    const filled: {
      techs: { key: string; language: null }[];
      id: string;
      domain: LocalizedText;
      usage: LocalizedText;
      position: number;
    } = { ...group, techs: [{ key: 'git', language: null }] };
    expect(assertSkillGroup(filled)).toBe(filled);
  });
});
