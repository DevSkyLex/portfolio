import {
  MaintenanceMode,
  type MaintenanceModeDraft,
  type MaintenanceRevision,
} from '@vfortin/content-domain';
import type { MaintenanceRepository } from '@internal/content-application/lib/ports/content/content.ports';

/**
 * Class ReviseMaintenance
 * @class ReviseMaintenance
 *
 * @description
 * Switches the public site's maintenance screen and replaces its message. The setting is read live by
 * the public snapshot, so the change applies to the next request: no content revision is advanced
 * and no publication batch holds it back.
 */
export class ReviseMaintenance {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the maintenance repository.
   *
   * @param {MaintenanceRepository} maintenance - Singleton setting.
   */
  public constructor(private readonly maintenance: MaintenanceRepository) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Validates the draft, then writes it if the stored version is still `expectedVersion`.
   *
   * @param {number} expectedVersion - Version read by the client (`If-Match`).
   * @param {MaintenanceModeDraft} draft - Unvalidated revision.
   * @throws {InvalidValueError} When a message exceeds its limit.
   * @throws {VersionMismatchError} When the setting changed since it was read.
   * @returns {Promise<MaintenanceMode>} Revised setting with its new version.
   */
  public async execute(
    expectedVersion: number,
    draft: MaintenanceModeDraft,
  ): Promise<MaintenanceMode> {
    const revision: MaintenanceRevision = MaintenanceMode.revisionOf(draft);
    const current: MaintenanceMode = await this.maintenance.load();
    current.revise(revision);
    const version: number = await this.maintenance.save(current, expectedVersion);
    return MaintenanceMode.rehydrate({ ...current.snapshot(), version });
  }
  // #endregion
}
