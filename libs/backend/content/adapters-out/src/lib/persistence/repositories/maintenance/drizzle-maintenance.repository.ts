import { type MaintenanceRepository, VersionMismatchError } from '@vfortin/content-application';
import { MaintenanceMode } from '@vfortin/content-domain';
import { and, eq } from 'drizzle-orm';
import type { ContentDatabase } from '@internal/content-adapters-out/lib/persistence/database/content-database';
import { maintenance } from '@internal/content-adapters-out/lib/persistence/schema/content.schema';

/**
 * Constant MAINTENANCE_ID
 *
 * @description
 * Identifier of the singleton maintenance row.
 */
const MAINTENANCE_ID: number = 1;

/**
 * Function loadMaintenance
 *
 * @description
 * Reads the singleton row; a missing row is the initial setting. Shared by the administration
 * repository and the public snapshot reader, which reads it inside its own transaction.
 *
 * @param {ContentDatabase} db - Database or transaction handle.
 * @returns {Promise<MaintenanceMode>} Stored setting.
 */
export async function loadMaintenance(db: ContentDatabase): Promise<MaintenanceMode> {
  const [row] = await db.select().from(maintenance).where(eq(maintenance.id, MAINTENANCE_ID));
  return row === undefined
    ? MaintenanceMode.initial()
    : MaintenanceMode.rehydrate({
        enabled: row.enabled,
        message: row.message,
        version: row.version,
      });
}

/**
 * Class DrizzleMaintenanceRepository
 * @class DrizzleMaintenanceRepository
 *
 * @description
 * Maintenance setting over the singleton row of `content.maintenance`, created on first save; the
 * version check is in the update predicate.
 */
export class DrizzleMaintenanceRepository implements MaintenanceRepository {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the database handle.
   *
   * @param {ContentDatabase} db - Typed Drizzle database.
   */
  public constructor(private readonly db: ContentDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method load
   * @method load
   *
   * @description
   * Loads the setting, the initial one when never written.
   *
   * @returns {Promise<MaintenanceMode>} Setting.
   */
  public load(): Promise<MaintenanceMode> {
    return loadMaintenance(this.db);
  }

  /**
   * Method save
   * @method save
   *
   * @description
   * Updates the row where the expected version matches; with no row and `expectedVersion` 1, creates
   * it at version 2, unless a concurrent writer just did.
   *
   * @param {MaintenanceMode} mode - Revised setting.
   * @param {number} expectedVersion - Version read before editing.
   * @returns {Promise<number>} New version.
   */
  public async save(mode: MaintenanceMode, expectedVersion: number): Promise<number> {
    const { enabled, message } = mode.snapshot();
    const [row] = await this.db
      .update(maintenance)
      .set({ enabled, message, version: expectedVersion + 1 })
      .where(and(eq(maintenance.id, MAINTENANCE_ID), eq(maintenance.version, expectedVersion)))
      .returning({ version: maintenance.version });
    if (row !== undefined) return row.version;
    const created: { version: number }[] =
      expectedVersion === 1
        ? await this.db
            .insert(maintenance)
            .values({ id: MAINTENANCE_ID, enabled, message, version: 2 })
            .onConflictDoNothing()
            .returning({ version: maintenance.version })
        : [];
    if (created[0] === undefined) {
      throw new VersionMismatchError('The maintenance setting changed in the meantime; reload it.');
    }
    return created[0].version;
  }
  // #endregion
}
