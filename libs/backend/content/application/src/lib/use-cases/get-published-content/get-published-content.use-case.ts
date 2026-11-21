import {
  FaqEntry,
  type LegalDocument,
  type LegalDocumentKind,
  type MaintenanceMode,
  type Profile,
  type Project,
  type SkillGroup,
  TimelineEntry,
} from '@vfortin/content-domain';
import type {
  ContentRepository,
  ContentSnapshotReader,
  MediaRecord,
} from '@internal/content-application/lib/ports/content/content.ports';

/**
 * Interface PublishedContent
 * @interface PublishedContent
 *
 * @description
 * Single consistent revision of public profile, projects, timeline, skill groups and FAQ.
 */
export interface PublishedContent {
  // #region Properties
  /**
   * Property revision
   * @readonly
   *
   * @description
   * Content revision read from the same snapshot as the public data.
   */
  readonly revision: number;

  /**
   * Property profile
   * @readonly
   *
   * @description
   * Public profile content.
   */
  readonly profile: Profile;

  /**
   * Property projects
   * @readonly
   *
   * @description
   * Published projects ordered by their stored display position.
   */
  readonly projects: readonly Project[];

  /**
   * Property timeline
   * @readonly
   *
   * @description
   * Timeline entries by date: education, then experience, each in chronological order
   * (`TimelineEntry.compare`, positions left out); the public timeline places them on its year axis.
   */
  readonly timeline: readonly TimelineEntry[];

  /**
   * Property skills
   * @readonly
   *
   * @description
   * Skill groups ordered by their stored display position.
   */
  readonly skills: readonly SkillGroup[];

  /**
   * Property faq
   * @readonly
   *
   * @description
   * FAQ entries in their editorial order (`FaqEntry.compare`).
   */
  readonly faq: readonly FaqEntry[];

  /**
   * Property media
   * @readonly
   *
   * @description
   * Stored media referenced by the published projects, by identifier, to resolve their covers and
   * figures.
   */
  readonly media: ReadonlyMap<string, MediaRecord>;

  /**
   * Property legal
   * @readonly
   *
   * @description
   * Legal notice and privacy policy, read from the same snapshot.
   */
  readonly legal: Readonly<Record<LegalDocumentKind, LegalDocument>>;

  /**
   * Property maintenance
   * @readonly
   *
   * @description
   * Live maintenance setting, read on every call: it is not part of the revision the cache is keyed
   * on, nor of a frozen publication batch.
   */
  readonly maintenance: MaintenanceMode;
  // #endregion
}

/**
 * Class GetPublishedContent
 * @class GetPublishedContent
 *
 * @description
 * Reads the public site payload from one database snapshot and reuses it until its revision changes.
 */
export class GetPublishedContent {
  // #region Properties
  /**
   * Property cached
   *
   * @description
   * Last assembled content snapshot, reused only when its revision matches the database revision.
   */
  private cached: PublishedContent | null = null;
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the consistent-read port used to fetch published content.
   *
   * @param {ContentSnapshotReader} reader - Read-only snapshot boundary.
   */
  public constructor(private readonly reader: ContentSnapshotReader) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Returns cached content when the revision is unchanged; otherwise reads and sorts all public
   * collections, then the media of the published projects, in one transaction before replacing the
   * cache. The maintenance setting is read every time, in the same transaction.
   *
   * @returns {Promise<PublishedContent>} Consistent public content for the current revision.
   */
  public async execute(): Promise<PublishedContent> {
    const content: PublishedContent = await this.reader.read(
      async (repository: ContentRepository): Promise<PublishedContent> => {
        const [revision, maintenance] = await Promise.all([
          repository.currentRevision(),
          repository.loadMaintenance(),
        ]);
        if (this.cached?.revision === revision) {
          return { ...this.cached, maintenance };
        }
        const [profile, projects, timeline, skills, faq, legal] = await Promise.all([
          repository.loadProfile(),
          repository.listProjects(),
          repository.listTimeline(),
          repository.listSkillGroups(),
          repository.listFaq(),
          repository.loadLegalDocuments(),
        ]);
        const published: Project[] = projects
          .filter((p: Project): boolean => p.isPublished())
          .sort((a: Project, b: Project): number => a.position - b.position);
        const media: MediaRecord[] = await repository.loadMedia([
          ...new Set(published.flatMap((p: Project): string[] => p.mediaIds())),
        ]);
        return {
          revision,
          profile,
          projects: published,
          timeline: [...timeline].sort(TimelineEntry.compare),
          skills: [...skills].sort(
            (a: SkillGroup, b: SkillGroup): number => a.position - b.position,
          ),
          faq: [...faq].sort(FaqEntry.compare),
          media: new Map(
            media.map((record: MediaRecord): [string, MediaRecord] => [record.id, record]),
          ),
          legal,
          maintenance,
        };
      },
    );
    this.cached = content;
    return content;
  }
  // #endregion
}
