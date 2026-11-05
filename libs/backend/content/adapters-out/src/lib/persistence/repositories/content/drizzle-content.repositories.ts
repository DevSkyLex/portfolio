import type {
  ContentRepository,
  ContentSnapshotReader,
  MediaRecord,
} from '@vfortin/content-application';
import type {
  LegalDocument,
  LegalDocumentKind,
  Profile,
  Project,
  SkillGroup,
  TimelineEntry,
} from '@vfortin/content-domain';
import { eq, inArray } from 'drizzle-orm';
import type {
  ContentDatabase,
  ContentTransaction,
} from '@internal/content-adapters-out/lib/persistence/database/content-database';
import {
  toLegalDocument,
  toMediaRecord,
  toProfile,
  toProject,
  toSkillGroup,
  toTimelineEntry,
} from '@internal/content-adapters-out/lib/persistence/mappers/content/content.mappers';
import {
  contentRevision,
  legalDocuments,
  media,
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
 * Indicates the singleton profile row is absent after the content migrations.
 */
export class ProfileMissingError extends Error {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates the missing-profile persistence error with the migration instruction.
   */
  public constructor() {
    super('No profile in the database: check the content migrations.');
    this.name = 'ProfileMissingError';
  }
  // #endregion
}

/**
 * Class LegalDocumentsMissingError
 * @class LegalDocumentsMissingError
 *
 * @description
 * Indicates a legal document row is absent: the migrations (0009) or the seed must be applied. The
 * snapshot is refused rather than published without a legal page.
 */
export class LegalDocumentsMissingError extends Error {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates the missing-document persistence error with the instruction.
   *
   * @param {LegalDocumentKind} kind - Missing document.
   */
  public constructor(kind: LegalDocumentKind) {
    super(`No ${kind} legal document in the database: run the content migrations or the seed.`);
    this.name = 'LegalDocumentsMissingError';
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
   * Method loadLegalDocuments
   * @method loadLegalDocuments
   *
   * @description
   * Loads both legal documents and rejects with `LegalDocumentsMissingError` when one is absent.
   *
   * @returns {Promise<Readonly<Record<LegalDocumentKind, LegalDocument>>>} Documents by kind.
   */
  public async loadLegalDocuments(): Promise<Readonly<Record<LegalDocumentKind, LegalDocument>>> {
    const byKind: Map<LegalDocumentKind, LegalDocument> = new Map(
      (await this.db.select().from(legalDocuments)).map(
        (row: typeof legalDocuments.$inferSelect): [LegalDocumentKind, LegalDocument] => [
          row.kind,
          toLegalDocument(row),
        ],
      ),
    );
    const notice: LegalDocument | undefined = byKind.get('notice');
    const privacy: LegalDocument | undefined = byKind.get('privacy');
    if (notice === undefined) throw new LegalDocumentsMissingError('notice');
    if (privacy === undefined) throw new LegalDocumentsMissingError('privacy');
    return { notice, privacy };
  }

  /**
   * Method loadMedia
   * @method loadMedia
   *
   * @description
   * Loads the media rows among the identifiers, without locking (the snapshot is read-only).
   *
   * @param {readonly string[]} ids - Media referenced by the published projects.
   * @returns {Promise<MediaRecord[]>} Rows found.
   */
  public async loadMedia(ids: readonly string[]): Promise<MediaRecord[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows: (typeof media.$inferSelect)[] = await this.db
      .select()
      .from(media)
      .where(inArray(media.id, [...ids]));
    return rows.map(toMediaRecord);
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
