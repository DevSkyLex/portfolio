import { lockContentRevision } from '@internal/content-adapters-out/lib/persistence/repositories/publication/publication-lock';
import {
  type TimelineEntryRepository,
  type TimelineListRepository,
  type TimelineRepositories,
  type TimelineUnitOfWork,
  VersionMismatchError,
} from '@vfortin/content-application';
import type { TimelineEntry, TimelineKind } from '@vfortin/content-domain';
import { and, asc, eq, sql } from 'drizzle-orm';
import type {
  ContentDatabase,
  ContentTransaction,
} from '@internal/content-adapters-out/lib/persistence/database/content-database';
import {
  toTimelineEntry,
  toTimelineRow,
} from '@internal/content-adapters-out/lib/persistence/mappers/content/content.mappers';
import { DrizzleSiteBuildRequestRepository } from '@internal/content-adapters-out/lib/persistence/repositories/content-admin/drizzle-content-admin.repositories';
import {
  timelineEntries,
  timelineLists,
} from '@internal/content-adapters-out/lib/persistence/schema/content.schema';

/**
 * Class DrizzleTimelineEntryRepository
 * @class DrizzleTimelineEntryRepository
 *
 * @description
 * Timeline entry reads and writes over `content.timeline_entries`; content updates carry the version
 * in their predicate, position updates never touch the version.
 */
export class DrizzleTimelineEntryRepository implements TimelineEntryRepository {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the database or transaction handle.
   *
   * @param {ContentDatabase} db - Typed Drizzle database.
   */
  public constructor(private readonly db: ContentDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method listByKind
   * @method listByKind
   *
   * @description
   * Loads the entries of one kind ordered by position, then identifier.
   *
   * @param {TimelineKind} kind - Kind to list.
   * @returns {Promise<TimelineEntry[]>} Entries of the kind.
   */
  public async listByKind(kind: TimelineKind): Promise<TimelineEntry[]> {
    return (
      await this.db
        .select()
        .from(timelineEntries)
        .where(eq(timelineEntries.kind, kind))
        .orderBy(asc(timelineEntries.position), asc(timelineEntries.id))
    ).map(toTimelineEntry);
  }

  /**
   * Method get
   * @method get
   *
   * @description
   * Loads one entry by identifier.
   *
   * @param {string} id - Entry identifier.
   * @returns {Promise<TimelineEntry | null>} Entry, or `null` when absent.
   */
  public async get(id: string): Promise<TimelineEntry | null> {
    const [row] = await this.db.select().from(timelineEntries).where(eq(timelineEntries.id, id));
    return row ? toTimelineEntry(row) : null;
  }

  /**
   * Method insert
   * @method insert
   *
   * @description
   * Inserts the entry row.
   *
   * @param {TimelineEntry} entry - New entry.
   * @returns {Promise<void>} Completion after the insert.
   */
  public async insert(entry: TimelineEntry): Promise<void> {
    await this.db.insert(timelineEntries).values(toTimelineRow(entry));
  }

  /**
   * Method save
   * @method save
   *
   * @description
   * Updates the content columns and increments the version where the id and expected version match.
   *
   * @param {TimelineEntry} entry - Entry to save.
   * @param {number} expectedVersion - Version read before editing.
   * @returns {Promise<number>} New version.
   */
  public async save(entry: TimelineEntry, expectedVersion: number): Promise<number> {
    const { title, place, description, startYear, startMonth, endYear, endMonth, techs } =
      toTimelineRow(entry);
    const [row] = await this.db
      .update(timelineEntries)
      .set({
        title,
        place,
        description,
        startYear,
        startMonth,
        endYear,
        endMonth,
        techs,
        version: sql`${timelineEntries.version} + 1`,
      })
      .where(and(eq(timelineEntries.id, entry.id), eq(timelineEntries.version, expectedVersion)))
      .returning({ version: timelineEntries.version });
    if (row === undefined) {
      throw new VersionMismatchError('The timeline entry was modified in the meantime; reload it.');
    }
    return row.version;
  }

  /**
   * Method delete
   * @method delete
   *
   * @description
   * Deletes the row whose id and version match.
   *
   * @param {string} id - Entry identifier.
   * @param {number} expectedVersion - Version read before deleting.
   * @returns {Promise<void>} Completion after the delete.
   */
  public async delete(id: string, expectedVersion: number): Promise<void> {
    const deleted: { id: string }[] = await this.db
      .delete(timelineEntries)
      .where(and(eq(timelineEntries.id, id), eq(timelineEntries.version, expectedVersion)))
      .returning({ id: timelineEntries.id });
    if (deleted.length === 0) {
      throw new VersionMismatchError('The timeline entry was modified in the meantime; reload it.');
    }
  }

  /**
   * Method move
   * @method move
   *
   * @description
   * Writes each supplied entry's position.
   *
   * @param {readonly TimelineEntry[]} entries - Moved entries.
   * @returns {Promise<void>} Completion after the updates.
   */
  public async move(entries: readonly TimelineEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.db
        .update(timelineEntries)
        .set({ position: entry.position })
        .where(eq(timelineEntries.id, entry.id));
    }
  }
  // #endregion
}

/**
 * Class DrizzleTimelineListRepository
 * @class DrizzleTimelineListRepository
 *
 * @description
 * List versions over `content.timeline_lists`, one row per kind written by migration 0007.
 */
export class DrizzleTimelineListRepository implements TimelineListRepository {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the database or transaction handle.
   *
   * @param {ContentDatabase} db - Typed Drizzle database.
   */
  public constructor(private readonly db: ContentDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method version
   * @method version
   *
   * @description
   * Reads a kind's list version; a missing row reads as 1, the version `bump` starts from.
   *
   * @param {TimelineKind} kind - Kind of the list.
   * @returns {Promise<number>} List version.
   */
  public async version(kind: TimelineKind): Promise<number> {
    const [row] = await this.db
      .select({ version: timelineLists.version })
      .from(timelineLists)
      .where(eq(timelineLists.kind, kind));
    return row?.version ?? 1;
  }

  /**
   * Method bump
   * @method bump
   *
   * @description
   * Increments the version with an upsert (a missing row counts as version 1), which row-locks the
   * kind until commit; with `expectedVersion`, a plain conditional update instead.
   *
   * @param {TimelineKind} kind - Kind of the list.
   * @param {number | null} expectedVersion - Version read by the client, or `null`.
   * @returns {Promise<number>} New list version.
   */
  public async bump(kind: TimelineKind, expectedVersion: number | null): Promise<number> {
    if (expectedVersion === null) {
      const [row] = await this.db
        .insert(timelineLists)
        .values({ kind, version: 2 })
        .onConflictDoUpdate({
          target: timelineLists.kind,
          set: { version: sql`${timelineLists.version} + 1` },
        })
        .returning({ version: timelineLists.version });
      return row?.version ?? 2;
    }
    const [row] = await this.db
      .update(timelineLists)
      .set({ version: sql`${timelineLists.version} + 1` })
      .where(and(eq(timelineLists.kind, kind), eq(timelineLists.version, expectedVersion)))
      .returning({ version: timelineLists.version });
    if (row !== undefined) return row.version;
    // A missing row reads as version 1: create it at 2, unless a concurrent writer just did.
    const created: { version: number }[] =
      expectedVersion === 1
        ? await this.db
            .insert(timelineLists)
            .values({ kind, version: 2 })
            .onConflictDoNothing()
            .returning({ version: timelineLists.version })
        : [];
    if (created[0] === undefined) {
      throw new VersionMismatchError('The list changed in the meantime; reload it.');
    }
    return created[0].version;
  }
  // #endregion
}

/**
 * Class DrizzleTimelineUnitOfWork
 * @class DrizzleTimelineUnitOfWork
 *
 * @description
 * Runs timeline entry, list version and rebuild outbox writes in one transaction (D3).
 */
export class DrizzleTimelineUnitOfWork implements TimelineUnitOfWork {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the database handle that opens the transaction.
   *
   * @param {ContentDatabase} db - Typed Drizzle database.
   */
  public constructor(private readonly db: ContentDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method run
   * @method run
   * @template T - Callback result.
   *
   * @description
   * Executes the callback with repositories bound to one transaction.
   *
   * @param {(repositories: TimelineRepositories) => Promise<T>} work - Atomic operation.
   * @returns {Promise<T>} Callback result after commit.
   */
  public run<T>(work: (repositories: TimelineRepositories) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx: ContentTransaction): Promise<T> => {
      await lockContentRevision(tx);
      return work({
        entries: new DrizzleTimelineEntryRepository(tx),
        lists: new DrizzleTimelineListRepository(tx),
        buildRequests: new DrizzleSiteBuildRequestRepository(tx),
      });
    });
  }
  // #endregion
}
