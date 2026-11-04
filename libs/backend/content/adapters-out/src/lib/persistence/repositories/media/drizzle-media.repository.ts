import type { MediaRecord, MediaRepository } from '@vfortin/content-application';
import { type SQL, and, eq, inArray, isNotNull, lt, not, sql } from 'drizzle-orm';
import type { ContentDatabase } from '@internal/content-adapters-out/lib/persistence/database/content-database';
import {
  type MediaRow,
  toMediaRecord,
} from '@internal/content-adapters-out/lib/persistence/mappers/content/content.mappers';
import {
  media,
  projects,
} from '@internal/content-adapters-out/lib/persistence/schema/content.schema';

/**
 * Constant referenced
 *
 * @description
 * Whether a project references the media row of the enclosing query, as its cover or as a top-level
 * figure of one of its article documents (D40: figures never nest, so `$.*.content[*]` covers them).
 */
const referenced: SQL = sql`exists (
  select 1 from ${projects}
  where ${projects.cover} ->> 'media' = ${media.id}::text
    or jsonb_path_exists(
      ${projects.article},
      '$.*.content[*] ? (@.type == "figure" && @.attrs.media == $id)',
      jsonb_build_object('id', ${media.id}::text)
    )
)`;

/**
 * Function staleBefore
 *
 * @description
 * Condition of a media unlinked before the instant and referenced by no project.
 *
 * @param {Date} before - End of the grace period.
 * @returns {SQL | undefined} Drizzle condition.
 */
function staleBefore(before: Date): SQL | undefined {
  return and(isNotNull(media.unlinkedAt), lt(media.unlinkedAt, before), not(referenced));
}

/**
 * Class DrizzleMediaRepository
 * @class DrizzleMediaRepository
 *
 * @description
 * Implements media rows on the content Drizzle tables; reference checks query the project JSON.
 */
export class DrizzleMediaRepository implements MediaRepository {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the database or transaction handle of the queries.
   *
   * @param {ContentDatabase} db - Typed Drizzle database.
   */
  public constructor(private readonly db: ContentDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method insert
   * @method insert
   *
   * @description
   * Inserts the row; the primary key and the unique SHA-256 reject duplicates.
   *
   * @param {MediaRecord} record - Row to insert.
   * @returns {Promise<void>} Completion after the insert.
   */
  public async insert(record: MediaRecord): Promise<void> {
    await this.db.insert(media).values({ ...record });
  }

  /**
   * Method findBySha256
   * @method findBySha256
   *
   * @description
   * Reads the row uploaded with the same bytes.
   *
   * @param {string} sha256 - Hexadecimal SHA-256.
   * @returns {Promise<MediaRecord | null>} Row, or `null`.
   */
  public async findBySha256(sha256: string): Promise<MediaRecord | null> {
    const [row] = await this.db.select().from(media).where(eq(media.sha256, sha256));
    return row === undefined ? null : toMediaRecord(row);
  }

  /**
   * Method existing
   * @method existing
   *
   * @description
   * Reads the rows among the identifiers with `FOR SHARE`: inside a transaction, a concurrent purge
   * `DELETE` waits for it to commit, then re-checks the row it relinked.
   *
   * @param {readonly string[]} ids - Media identifiers (UUIDs).
   * @returns {Promise<MediaRecord[]>} Rows found.
   */
  public async existing(ids: readonly string[]): Promise<MediaRecord[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows: MediaRow[] = await this.db
      .select()
      .from(media)
      .where(inArray(media.id, [...ids]))
      .for('share');
    return rows.map(toMediaRecord);
  }

  /**
   * Method markUnlinked
   * @method markUnlinked
   *
   * @description
   * Sets `unlinked_at` on the rows.
   *
   * @param {readonly string[]} ids - Media removed from a project.
   * @param {Date} at - Removal time.
   * @returns {Promise<void>} Completion after the update.
   */
  public async markUnlinked(ids: readonly string[], at: Date): Promise<void> {
    await this.db
      .update(media)
      .set({ unlinkedAt: at })
      .where(inArray(media.id, [...ids]));
  }

  /**
   * Method relink
   * @method relink
   *
   * @description
   * Clears `unlinked_at` on the rows that have it.
   *
   * @param {readonly string[]} ids - Media added to a project.
   * @returns {Promise<void>} Completion after the update.
   */
  public async relink(ids: readonly string[]): Promise<void> {
    await this.db
      .update(media)
      .set({ unlinkedAt: null })
      .where(and(inArray(media.id, [...ids]), isNotNull(media.unlinkedAt)));
  }

  /**
   * Method stale
   * @method stale
   *
   * @description
   * Lists the rows unlinked before the instant that no project references.
   *
   * @param {Date} before - End of the grace period.
   * @returns {Promise<MediaRecord[]>} Purge candidates, oldest unlink first.
   */
  public async stale(before: Date): Promise<MediaRecord[]> {
    const rows: MediaRow[] = await this.db
      .select()
      .from(media)
      .where(staleBefore(before))
      .orderBy(media.unlinkedAt);
    return rows.map(toMediaRecord);
  }

  /**
   * Method delete
   * @method delete
   *
   * @description
   * Deletes the row if it is still stale.
   *
   * @param {string} id - Media to delete.
   * @param {Date} before - End of the grace period.
   * @returns {Promise<boolean>} Whether a row was deleted.
   */
  public async delete(id: string, before: Date): Promise<boolean> {
    const deleted: { id: string }[] = await this.db
      .delete(media)
      .where(and(eq(media.id, id), staleBefore(before)))
      .returning({ id: media.id });
    return deleted.length > 0;
  }
  // #endregion
}
