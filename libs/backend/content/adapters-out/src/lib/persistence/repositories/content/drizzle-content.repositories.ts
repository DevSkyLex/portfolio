import type { ContentRepository, ContentSnapshotReader } from '@vfortin/content-application';
import type { Profile, Project, SkillGroup, TimelineEntry } from '@vfortin/content-domain';
import { eq } from 'drizzle-orm';
import type {
  ContentDatabase,
  ContentTransaction,
} from '@internal/content-adapters-out/lib/persistence/database/content-database';
import {
  toProfile,
  toProject,
  toSkillGroup,
  toTimelineEntry,
} from '@internal/content-adapters-out/lib/persistence/mappers/content/content.mappers';
import {
  contentRevision,
  profile,
  projects,
  skillGroups,
  timelineEntries,
} from '@internal/content-adapters-out/lib/persistence/schema/content.schema';

/**
 * Class ProfileMissingError
 * @class ProfileMissingError
 *
 * @description
 * Indicates the singleton profile row is absent and the content seed must be applied.
 */
export class ProfileMissingError extends Error {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates the missing-profile persistence error with the seed instruction.
   */
  public constructor() {
    super('No profile in the database: run the content service seed target.');
    this.name = 'ProfileMissingError';
  }
  // #endregion
}

/**
 * Class DrizzleContentRepository
 * @class DrizzleContentRepository
 *
 * @description
 * Loads persisted public content rows and maps them into domain values.
 */
export class DrizzleContentRepository implements ContentRepository {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the content database connection used by repository queries.
   *
   * @param {ContentDatabase} db - Typed Drizzle database.
   */
  public constructor(private readonly db: ContentDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method loadProfile
   * @method loadProfile
   *
   * @description
   * Loads singleton row `id = 1` and rejects with `ProfileMissingError` when it is absent.
   *
   * @returns {Promise<Profile>} Validated profile domain model.
   */
  public async loadProfile(): Promise<Profile> {
    const [row] = await this.db.select().from(profile).where(eq(profile.id, 1));
    if (row === undefined) {
      throw new ProfileMissingError();
    }
    return toProfile(row);
  }

  /**
   * Method listProjects
   * @method listProjects
   *
   * @description
   * Loads every project row, including drafts, and rehydrates each aggregate.
   *
   * @returns {Promise<Project[]>} Persisted project aggregates.
   */
  public async listProjects(): Promise<Project[]> {
    const rows: (typeof projects.$inferSelect)[] = await this.db.select().from(projects);
    return rows.map(toProject);
  }

  /**
   * Method listTimeline
   * @method listTimeline
   *
   * @description
   * Loads and maps all timeline entry rows.
   *
   * @returns {Promise<TimelineEntry[]>} Domain timeline entries.
   */
  public async listTimeline(): Promise<TimelineEntry[]> {
    const rows: (typeof timelineEntries.$inferSelect)[] = await this.db
      .select()
      .from(timelineEntries);
    return rows.map(toTimelineEntry);
  }

  /**
   * Method listSkillGroups
   * @method listSkillGroups
   *
   * @description
   * Loads skill groups and validates their technology-list invariant.
   *
   * @returns {Promise<SkillGroup[]>} Domain skill groups.
   */
  public async listSkillGroups(): Promise<SkillGroup[]> {
    const rows: (typeof skillGroups.$inferSelect)[] = await this.db.select().from(skillGroups);
    return rows.map(toSkillGroup);
  }

  /**
   * Method currentRevision
   * @method currentRevision
   *
   * @description
   * Reads singleton revision row `id = 1`; an absent row represents the initial revision zero.
   *
   * @returns {Promise<number>} Current published-content revision.
   */
  public async currentRevision(): Promise<number> {
    const [row] = await this.db.select().from(contentRevision).where(eq(contentRevision.id, 1));
    return row?.revision ?? 0;
  }
  // #endregion
}

/**
 * Class DrizzleContentSnapshotReader
 * @class DrizzleContentSnapshotReader
 *
 * @description
 * Runs public content reads in a repeatable-read, read-only database transaction.
 */
export class DrizzleContentSnapshotReader implements ContentSnapshotReader {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the database that provides repeatable-read transactions.
   *
   * @param {ContentDatabase} db - Typed Drizzle database.
   */
  public constructor(private readonly db: ContentDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method read
   * @method read
   * @template T - Value returned by the read callback.
   *
   * @description
   * Runs the repository callback on one read-only repeatable-read snapshot.
   *
   * @param {(content: ContentRepository) => Promise<T>} work - Snapshot query.
   * @returns {Promise<T>} Result produced within the transaction.
   */
  public read<T>(work: (content: ContentRepository) => Promise<T>): Promise<T> {
    return this.db.transaction(
      (tx: ContentTransaction): Promise<T> => work(new DrizzleContentRepository(tx)),
      {
        isolationLevel: 'repeatable read',
        accessMode: 'read only',
      },
    );
  }
  // #endregion
}
