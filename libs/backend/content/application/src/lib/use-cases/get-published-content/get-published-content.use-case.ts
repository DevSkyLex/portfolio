import type { Profile, Project, SkillGroup, TimelineEntry } from '@vfortin/content-domain';
import type {
  ContentRepository,
  ContentSnapshotReader,
} from '@internal/content-application/lib/ports/content/content.ports';

/**
 * Interface PublishedContent
 * @interface PublishedContent
 *
 * @description
 * Single consistent revision of public profile, projects, timeline and skill groups.
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
   * Timeline entries ordered by period start and end.
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
   * collections in one transaction before replacing the cache.
   *
   * @returns {Promise<PublishedContent>} Consistent public content for the current revision.
   */
  public async execute(): Promise<PublishedContent> {
    const content: PublishedContent = await this.reader.read(
      async (repository: ContentRepository): Promise<PublishedContent> => {
        const revision: number = await repository.currentRevision();
        if (this.cached?.revision === revision) {
          return this.cached;
        }
        const [profile, projects, timeline, skills] = await Promise.all([
          repository.loadProfile(),
          repository.listProjects(),
          repository.listTimeline(),
          repository.listSkillGroups(),
        ]);
        return {
          revision,
          profile,
          projects: projects
            .filter((p: Project): boolean => p.isPublished())
            .sort((a: Project, b: Project): number => a.position - b.position),
          timeline: [...timeline].sort((a: TimelineEntry, b: TimelineEntry): number =>
            a.period.compareTo(b.period),
          ),
          skills: [...skills].sort(
            (a: SkillGroup, b: SkillGroup): number => a.position - b.position,
          ),
        };
      },
    );
    this.cached = content;
    return content;
  }
  // #endregion
}
