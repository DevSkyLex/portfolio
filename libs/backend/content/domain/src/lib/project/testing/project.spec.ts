import { DomainError } from '@internal/content-domain/lib/errors/domain-error';
import { assertSkillGroup } from '@internal/content-domain/lib/profile/profile';
import {
  LocalizedText,
  type LocalizedTextProps,
} from '@internal/content-domain/lib/values/localized-text/localized-text';
import { Slug } from '@internal/content-domain/lib/values/slug/slug';
import { Project, type ProjectProps } from '@internal/content-domain/lib/project/project';

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
 * Function projectProps
 *
 * @description
 * Builds a complete valid project state and applies selected overrides for aggregate rule tests.
 *
 * @param {Partial<ProjectProps>} overrides - State fields replacing the valid defaults.
 * @returns {ProjectProps} Project state suitable for rehydration.
 */
function projectProps(overrides: Partial<ProjectProps> = {}): ProjectProps {
  const paragraph: LocalizedText[] = [text('Paragraphe', 'Paragraph')];
  return {
    id: 'p-1',
    slug: Slug.of('movah'),
    title: text('Movah', 'Movah'),
    summary: text('Résumé', 'Summary'),
    lead: text('Intro', 'Lead'),
    periodLabel: text('Depuis 2026', 'Since 2026'),
    client: text('Projet personnel', 'Personal project'),
    role: text('Conception', 'Design'),
    place: text('Android et iOS', 'Android and iOS'),
    siteUrl: null,
    techs: ['flutter', 'dart'],
    featured: true,
    position: 0,
    status: 'draft',
    version: 1,
    article: {
      context: paragraph,
      work: paragraph,
      workList: paragraph,
      choices: paragraph,
      result: paragraph,
      lessons: paragraph,
      captions: paragraph,
    },
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
    const project: Project = Project.rehydrate(projectProps({ lead: text('Intro') }));
    project.publish(['fr']);
    expect(project.isPublished()).toBe(true);
  });

  it('refuses to publish a case study without an outcome', (): void => {
    const base: ProjectProps = projectProps();
    const project: Project = Project.rehydrate({
      ...base,
      article: { ...base.article, result: [] },
    });
    expect(project.missingFor(['fr'])).toEqual(['article.result.fr']);
  });

  it.each([
    ['a negative position', { position: -1 }],
    ['a zero version', { version: 0 }],
    ['a non-https link', { siteUrl: 'http://iotplatform.fr' }],
    ['an invalid tech key', { techs: ['Vue.js'] }],
    ['a duplicate tech', { techs: ['dart', 'dart'] }],
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
      'movah',
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
    project.revise({ ...projectProps(), title: text('Movah 2', 'Movah 2') }, ['fr', 'en']);
    expect(project.snapshot().title.en).toBe('Movah 2');
  });

  it('only revises the editable fields', (): void => {
    const project: Project = Project.rehydrate(projectProps());
    // @ts-expect-error Runtime boundary deliberately receives immutable fields and must ignore them.
    project.revise({ ...projectProps(), id: 'other', status: 'published', version: 9 }, ['fr']);
    expect(project.snapshot()).toMatchObject({ id: 'p-1', status: 'draft', version: 1 });
  });

  it('accepts an https link', (): void => {
    const project: Project = Project.rehydrate(projectProps({ siteUrl: 'https://iotplatform.fr' }));
    expect(project.snapshot().siteUrl).toBe('https://iotplatform.fr');
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
