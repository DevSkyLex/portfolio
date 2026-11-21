import type { MaintenanceMode } from '@vfortin/content-domain';
import type { MaintenanceRepository } from '@internal/content-application/lib/ports/content/content.ports';

/**
 * Class GetAdminMaintenance
 * @class GetAdminMaintenance
 *
 * @description
 * Loads the maintenance setting of the public site for the administration.
 */
export class GetAdminMaintenance {
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
   * Returns the stored setting with its version.
   *
   * @returns {Promise<MaintenanceMode>} Maintenance setting.
   */
  public execute(): Promise<MaintenanceMode> {
    return this.maintenance.load();
  }
  // #endregion
}
