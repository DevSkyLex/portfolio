import {
  LocalizedText,
  Period,
  type Profile,
  Project,
  type ProjectProps,
  type SkillGroup,
  Slug,
  type TimelineEntry,
} from '@vfortin/content-domain';
import type {
  ContentRepository,
  ContentSnapshotReader,
} from '@internal/content-application/lib/ports/content/content.ports';
import {
  GetPublishedContent,
  type PublishedContent,
} from '@internal/content-application/lib/use-cases/get-published-content/get-published-content.use-case';

/**
 * Constant t
 *
 * @description
 * Creates French-only localized text for the published-content use-case fixtures.
 *
 * @param {string} fr - French source value.
 * @returns {LocalizedText} Domain localized text.
 */
const t: (fr: string) => LocalizedText = (fr: string): LocalizedText =>
  LocalizedText.of('test', { fr });

/**
 * Function project
 *
 * @description
 * Builds a minimal valid project with the requested status and display position.
 *
 * @param {string} slug - Project identifier and public slug.
 * @param {number} position - Display-order position.
 * @param {ProjectProps['status']} status - Visibility state.
 * @returns {Project} Rehydrated project aggregate.
 */
function project(slug: string, position: number, status: ProjectProps['status']): Project {
  const p: LocalizedText[] = [t('§')];
  return Project.rehydrate({
    id: slug,
    slug: Slug.of(slug),
    title: t(slug),
    summary: t('s'),
    lead: t('l'),
    periodLabel: t('2026'),
    client: t('c'),
    role: t('r'),
    place: t('p'),
    siteUrl: null,
    techs: [],
    featured: false,
    position,
    status,
    version: 1,
    article: { context: p, work: p, workList: p, choices: p, result: p, lessons: p, captions: p },
  });
}

/**
 * Function entry
 *
 * @description
 * Builds a timeline entry whose years map to September starts and June ends.
 *
 * @param {string} id - Timeline identifier and title.
 * @param {number} start - Starting calendar year.
 * @param {number | null} end - Ending calendar year, or `null` for an ongoing entry.
 * @returns {TimelineEntry} Validated domain timeline entry.
 */
function entry(id: string, start: number, end: number | null): TimelineEntry {
  return {
    id,
    kind: 'education',
    title: t(id),
    place: t('Tours'),
    description: t('d'),
    period: Period.of({ year: start, month: 9 }, end === null ? null : { year: end, month: 6 }),
    techs: [],
  };
}

/**
 * Class InMemoryContentRepository
 * @class InMemoryContentRepository
 *
 * @description
 * Test double for content reads that also counts project-list reads to observe use-case caching.
 */
class InMemoryContentRepository implements ContentRepository, ContentSnapshotReader {
  // #region Properties
  /**
   * Property revision
   *
   * @description
   * Revision returned by the fake repository and changed by cache invalidation tests.
   */
  public revision: number = 7;

  /**
   * Property reads
   *
   * @description
   * Count of project-list reads used to verify whether cached content was reused.
   */
  public reads: number = 0;
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores collection fixtures served by this repository double.
   *
   * @param {Project[]} projects - Projects returned by `listProjects`.
   * @param {TimelineEntry[]} timeline - Entries returned by `listTimeline`.
   * @param {SkillGroup[]} skills - Groups returned by `listSkillGroups`.
   */
  public constructor(
    private readonly projects: Project[],
    private readonly timeline: TimelineEntry[],
    private readonly skills: SkillGroup[],
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method loadProfile
   * @method loadProfile
   *
   * @description
   * Resolves a minimal profile fixture for the published-content read.
   *
   * @returns {Promise<Profile>} Fixed profile fixture.
   */
  public loadProfile(): Promise<Profile> {
    return Promise.resolve({
      heroIntro: t('h'),
      aboutStatement: t('a'),
      aboutLead: t('l'),
      facts: [],
    });
  }

  /**
   * Method listProjects
   * @method listProjects
   *
   * @description
   * Counts the read and resolves the configured project fixtures.
   *
   * @returns {Promise<Project[]>} Stored project fixtures.
   */
  public listProjects(): Promise<Project[]> {
    this.reads++;
    return Promise.resolve(this.projects);
  }

  /**
   * Method listTimeline
   * @method listTimeline
   *
   * @description
   * Resolves the configured timeline fixtures.
   *
   * @returns {Promise<TimelineEntry[]>} Stored timeline fixtures.
   */
  public listTimeline(): Promise<TimelineEntry[]> {
    return Promise.resolve(this.timeline);
  }

  /**
   * Method listSkillGroups
   * @method listSkillGroups
   *
   * @description
   * Resolves the configured skill-group fixtures.
   *
   * @returns {Promise<SkillGroup[]>} Stored skill-group fixtures.
   */
  public listSkillGroups(): Promise<SkillGroup[]> {
    return Promise.resolve(this.skills);
  }

  /**
   * Method currentRevision
   * @method currentRevision
   *
   * @description
   * Resolves the mutable revision value used by the cache check.
   *
   * @returns {Promise<number>} Configured content revision.
   */
  public currentRevision(): Promise<number> {
    return Promise.resolve(this.revision);
  }

  /**
   * Method read
   * @method read
   * @template T - Value produced by the callback.
   *
   * @description
   * Runs the query callback against this same fake repository.
   *
   * @param {(content: ContentRepository) => Promise<T>} work - Query callback.
   * @returns {Promise<T>} Callback result.
   */
  public read<T>(work: (content: ContentRepository) => Promise<T>): Promise<T> {
    return work(this);
  }
  // #endregion
}

describe('GetPublishedContent', (): void => {
  it('keeps only published projects, in their order', async (): Promise<void> => {
    const repository: InMemoryContentRepository = new InMemoryContentRepository(
      [
        project('crm', 2, 'published'),
        project('draft', 0, 'draft'),
        project('movah', 1, 'published'),
      ],
      [],
      [],
    );
    const content: PublishedContent = await new GetPublishedContent(repository).execute();
    expect(content.projects.map((p: Project): string => p.slug.value)).toEqual(['movah', 'crm']);
    expect(content.revision).toBe(7);
  });

  it('sorts the timeline chronologically and skills by position', async (): Promise<void> => {
    const skill: (id: string, position: number) => SkillGroup = (
      id: string,
      position: number,
    ): SkillGroup => ({
      id,
      domain: t(id),
      techs: [{ key: 'git', language: null }],
      usage: t('u'),
      position,
    });
    const repository: InMemoryContentRepository = new InMemoryContentRepository(
      [],
      [entry('master', 2024, 2026), entry('bts', 2021, 2023), entry('poste', 2023, null)],
      [skill('outils', 3), skill('front', 0)],
    );
    const content: PublishedContent = await new GetPublishedContent(repository).execute();
    expect(content.timeline.map((e: TimelineEntry): string => e.id)).toEqual([
      'bts',
      'poste',
      'master',
    ]);
    expect(content.skills.map((s: SkillGroup): string => s.id)).toEqual(['front', 'outils']);
  });

  it('reuses the content while the revision does not change', async (): Promise<void> => {
    const repository: InMemoryContentRepository = new InMemoryContentRepository(
      [project('crm', 0, 'published')],
      [],
      [],
    );
    const useCase: GetPublishedContent = new GetPublishedContent(repository);
    const first: PublishedContent = await useCase.execute();
    await expect(useCase.execute()).resolves.toBe(first);
    expect(repository.reads).toBe(1);
    repository.revision = 8;
    await expect(useCase.execute()).resolves.toMatchObject({ revision: 8 });
    expect(repository.reads).toBe(2);
  });
});
