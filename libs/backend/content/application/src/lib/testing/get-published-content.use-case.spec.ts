import {
  LegalDocument,
  type LegalDocumentKind,
  LocalizedText,
  Period,
  type Profile,
  Project,
  ProjectPeriod,
  type ProjectProps,
  ProjectSeo,
  type SkillGroup,
  Slug,
  TimelineEntry,
  type TimelineKind,
} from '@vfortin/content-domain';
import type {
  ContentRepository,
  ContentSnapshotReader,
  MediaRecord,
} from '@internal/content-application/lib/ports/content/content.ports';
import {
  GetPublishedContent,
  type PublishedContent,
} from '@internal/content-application/lib/use-cases/get-published-content/get-published-content.use-case';
import { articleDoc, mediaRecord } from '@internal/content-application/lib/testing/content.fakes';

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
 * Builds a minimal valid project with the requested status, display position, cover and figures.
 *
 * @param {string} slug - Project identifier and public slug.
 * @param {number} position - Display-order position.
 * @param {ProjectProps['status']} status - Visibility state.
 * @param {string | null} cover - Media of the cover, or `null`.
 * @param {readonly string[]} figures - Media of the French figures.
 * @returns {Project} Rehydrated project aggregate.
 */
function project(
  slug: string,
  position: number,
  status: ProjectProps['status'],
  cover: string | null = null,
  figures: readonly string[] = [],
): Project {
  return Project.rehydrate({
    id: slug,
    slug: Slug.of(slug),
    title: t(slug),
    summary: t('s'),
    lead: t('l'),
    period: ProjectPeriod.of({ start: { year: 2026, month: null }, end: null }),
    client: t('c'),
    role: t('r'),
    place: t('p'),
    siteUrl: null,
    techs: [],
    featured: false,
    position,
    status,
    version: 1,
    article: { fr: articleDoc('§', figures) },
    cover: cover === null ? null : { media: cover, alt: { fr: 'Couverture' } },
    seo: ProjectSeo.empty(),
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
 * @param {number} position - Position within its kind.
 * @param {TimelineKind} kind - Kind of the entry.
 * @returns {TimelineEntry} Validated domain timeline entry.
 */
function entry(
  id: string,
  start: number,
  end: number | null,
  position: number = 0,
  kind: TimelineKind = 'education',
): TimelineEntry {
  return TimelineEntry.rehydrate({
    id,
    kind,
    title: t(id),
    place: t('Ville-Exemple'),
    description: t('d'),
    period: Period.of({ year: start, month: 9 }, end === null ? null : { year: end, month: 6 }),
    techs: [],
    position,
    version: 1,
  });
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

  /**
   * Property mediaRequests
   *
   * @description
   * Identifiers requested from `loadMedia`, per call.
   */
  public readonly mediaRequests: (readonly string[])[] = [];
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
    private readonly media: MediaRecord[] = [],
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
      links: [],
      version: 1,
    });
  }

  /**
   * Method loadLegalDocuments
   * @method loadLegalDocuments
   *
   * @description
   * Resolves both legal documents with one paragraph per language.
   *
   * @returns {Promise<Readonly<Record<LegalDocumentKind, LegalDocument>>>} Documents by kind.
   */
  public loadLegalDocuments(): Promise<Readonly<Record<LegalDocumentKind, LegalDocument>>> {
    const legal: (kind: LegalDocumentKind) => LegalDocument = (
      kind: LegalDocumentKind,
    ): LegalDocument =>
      LegalDocument.rehydrate({
        kind,
        body: { fr: articleDoc(kind), en: articleDoc(kind) },
        updatedAt: new Date('2026-11-02T12:00:00Z'),
        version: 1,
      });
    return Promise.resolve({ notice: legal('notice'), privacy: legal('privacy') });
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
   * Method loadMedia
   * @method loadMedia
   *
   * @description
   * Records the requested identifiers and resolves the matching media fixtures.
   *
   * @param {readonly string[]} ids - Requested media.
   * @returns {Promise<MediaRecord[]>} Media found.
   */
  public loadMedia(ids: readonly string[]): Promise<MediaRecord[]> {
    this.mediaRequests.push(ids);
    return Promise.resolve(
      this.media.filter((record: MediaRecord): boolean => ids.includes(record.id)),
    );
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
        project('library-trails', 1, 'published'),
      ],
      [],
      [],
    );
    const content: PublishedContent = await new GetPublishedContent(repository).execute();
    expect(content.projects.map((p: Project): string => p.slug.value)).toEqual([
      'library-trails',
      'crm',
    ]);
    expect(content.revision).toBe(7);
  });

  it('reads the legal documents with the rest of the content', async (): Promise<void> => {
    const content: PublishedContent = await new GetPublishedContent(
      new InMemoryContentRepository([], [], []),
    ).execute();
    expect(content.legal.notice.kind).toBe('notice');
    expect(content.legal.privacy.kind).toBe('privacy');
  });

  it('loads the media of the published projects only', async (): Promise<void> => {
    const repository: InMemoryContentRepository = new InMemoryContentRepository(
      [
        project('crm', 0, 'published', 'cover', ['shot', 'cover']),
        project('draft', 1, 'draft', 'hidden', ['hidden-shot']),
      ],
      [],
      [],
      [mediaRecord('cover'), mediaRecord('shot'), mediaRecord('hidden')],
    );
    const content: PublishedContent = await new GetPublishedContent(repository).execute();
    expect(repository.mediaRequests).toEqual([['cover', 'shot']]);
    expect([...content.media.keys()]).toEqual(['cover', 'shot']);
  });

  it('orders the timeline by kind then date, whatever the position, and skills by position', async (): Promise<void> => {
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
      [
        entry('poste', 2023, null, 0, 'experience'),
        entry('bts', 2021, 2023, 1),
        entry('master', 2024, 2026, 0),
      ],
      [skill('outils', 3), skill('front', 0)],
    );
    const content: PublishedContent = await new GetPublishedContent(repository).execute();
    // « master » holds position 0, yet « bts » started earlier.
    expect(content.timeline.map((e: TimelineEntry): string => e.id)).toEqual([
      'bts',
      'master',
      'poste',
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
