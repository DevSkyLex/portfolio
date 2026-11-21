import { lockContentRevision } from '@internal/content-adapters-out/lib/persistence/repositories/publication/publication-lock';
import {
  type FaqEntryRepository,
  type FaqListRepository,
  type FaqRepositories,
  type FaqUnitOfWork,
  VersionMismatchError,
} from '@vfortin/content-application';
import type { FaqEntry } from '@vfortin/content-domain';
import { and, asc, eq, sql } from 'drizzle-orm';
import type {
  ContentDatabase,
  ContentTransaction,
} from '@internal/content-adapters-out/lib/persistence/database/content-database';
import {
  toFaqEntry,
  toFaqRow,
} from '@internal/content-adapters-out/lib/persistence/mappers/content/content.mappers';
import { DrizzleSiteBuildRequestRepository } from '@internal/content-adapters-out/lib/persistence/repositories/content-admin/drizzle-content-admin.repositories';
import {
  faqEntries,
  faqList,
} from '@internal/content-adapters-out/lib/persistence/schema/content.schema';

/**
 * Constant FAQ_LIST_ID
 *
 * @description
 * Identifier of the singleton FAQ list row.
 */
const FAQ_LIST_ID: number = 1;

/**
 * Class DrizzleFaqEntryRepository
 * @class DrizzleFaqEntryRepository
 *
 * @description
 * FAQ entry reads and writes over `content.faq_entries`; content updates carry the version in their
 * predicate, position updates never touch the version.
 */
export class DrizzleFaqEntryRepository implements FaqEntryRepository {
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
   * Method list
   * @method list
   *
   * @description
   * Loads every entry ordered by position, then identifier.
   *
   * @returns {Promise<FaqEntry[]>} Entries.
   */
  public async list(): Promise<FaqEntry[]> {
    return (
      await this.db.select().from(faqEntries).orderBy(asc(faqEntries.position), asc(faqEntries.id))
    ).map(toFaqEntry);
  }

  /**
   * Method get
   * @method get
   *
   * @description
   * Loads one entry by identifier.
   *
   * @param {string} id - Entry identifier.
   * @returns {Promise<FaqEntry | null>} Entry, or `null` when absent.
   */
  public async get(id: string): Promise<FaqEntry | null> {
    const [row] = await this.db.select().from(faqEntries).where(eq(faqEntries.id, id));
    return row ? toFaqEntry(row) : null;
  }

  /**
   * Method insert
   * @method insert
   *
   * @description
   * Inserts the entry row.
   *
   * @param {FaqEntry} entry - New entry.
   * @returns {Promise<void>} Completion after the insert.
   */
  public async insert(entry: FaqEntry): Promise<void> {
    await this.db.insert(faqEntries).values(toFaqRow(entry));
  }

  /**
   * Method save
   * @method save
   *
   * @description
   * Updates the content columns and increments the version where the id and expected version match.
   *
   * @param {FaqEntry} entry - Entry to save.
   * @param {number} expectedVersion - Version read before editing.
   * @returns {Promise<number>} New version.
   */
  public async save(entry: FaqEntry, expectedVersion: number): Promise<number> {
    const { question, answer } = toFaqRow(entry);
    const [row] = await this.db
      .update(faqEntries)
      .set({ question, answer, version: sql`${faqEntries.version} + 1` })
      .where(and(eq(faqEntries.id, entry.id), eq(faqEntries.version, expectedVersion)))
      .returning({ version: faqEntries.version });
    if (row === undefined) {
      throw new VersionMismatchError('The question was modified in the meantime; reload it.');
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
      .delete(faqEntries)
      .where(and(eq(faqEntries.id, id), eq(faqEntries.version, expectedVersion)))
      .returning({ id: faqEntries.id });
    if (deleted.length === 0) {
      throw new VersionMismatchError('The question was modified in the meantime; reload it.');
    }
  }

  /**
   * Method move
   * @method move
   *
   * @description
   * Writes each supplied entry's position.
   *
   * @param {readonly FaqEntry[]} entries - Moved entries.
   * @returns {Promise<void>} Completion after the updates.
   */
  public async move(entries: readonly FaqEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.db
        .update(faqEntries)
        .set({ position: entry.position })
        .where(eq(faqEntries.id, entry.id));
    }
  }
  // #endregion
}

/**
 * Class DrizzleFaqListRepository
 * @class DrizzleFaqListRepository
 *
 * @description
 * List version over the singleton row of `content.faq_list`, created on first bump.
 */
export class DrizzleFaqListRepository implements FaqListRepository {
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
   * Reads the list version; a missing row reads as 1, the version `bump` starts from.
   *
   * @returns {Promise<number>} List version.
   */
  public async version(): Promise<number> {
    const [row] = await this.db
      .select({ version: faqList.version })
      .from(faqList)
      .where(eq(faqList.id, FAQ_LIST_ID));
    return row?.version ?? 1;
  }

  /**
   * Method bump
   * @method bump
   *
   * @description
   * Increments the version with an upsert (a missing row counts as version 1), which row-locks the
   * list until commit; with `expectedVersion`, a plain conditional update instead.
   *
   * @param {number | null} expectedVersion - Version read by the client, or `null`.
   * @returns {Promise<number>} New list version.
   */
  public async bump(expectedVersion: number | null): Promise<number> {
    if (expectedVersion === null) {
      const [row] = await this.db
        .insert(faqList)
        .values({ id: FAQ_LIST_ID, version: 2 })
        .onConflictDoUpdate({
          target: faqList.id,
          set: { version: sql`${faqList.version} + 1` },
        })
        .returning({ version: faqList.version });
      return row?.version ?? 2;
    }
    const [row] = await this.db
      .update(faqList)
      .set({ version: sql`${faqList.version} + 1` })
      .where(and(eq(faqList.id, FAQ_LIST_ID), eq(faqList.version, expectedVersion)))
      .returning({ version: faqList.version });
    if (row !== undefined) return row.version;
    // A missing row reads as version 1: create it at 2, unless a concurrent writer just did.
    const created: { version: number }[] =
      expectedVersion === 1
        ? await this.db
            .insert(faqList)
            .values({ id: FAQ_LIST_ID, version: 2 })
            .onConflictDoNothing()
            .returning({ version: faqList.version })
        : [];
    if (created[0] === undefined) {
      throw new VersionMismatchError('The list changed in the meantime; reload it.');
    }
    return created[0].version;
  }
  // #endregion
}

/**
 * Class DrizzleFaqUnitOfWork
 * @class DrizzleFaqUnitOfWork
 *
 * @description
 * Runs FAQ entry, list version and content revision writes in one transaction.
 */
export class DrizzleFaqUnitOfWork implements FaqUnitOfWork {
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
   * @param {(repositories: FaqRepositories) => Promise<T>} work - Atomic operation.
   * @returns {Promise<T>} Callback result after commit.
   */
  public run<T>(work: (repositories: FaqRepositories) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx: ContentTransaction): Promise<T> => {
      await lockContentRevision(tx);
      return work({
        entries: new DrizzleFaqEntryRepository(tx),
        lists: new DrizzleFaqListRepository(tx),
        buildRequests: new DrizzleSiteBuildRequestRepository(tx),
      });
    });
  }
  // #endregion
}
