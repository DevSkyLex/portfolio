import type { CallState } from '@vfortin/web-http';
import type { AdminMaintenance } from '@internal/content-web-data-access/lib/admin/models/admin-maintenance/admin-maintenance.interface';

/**
 * Interface AdminMaintenanceState
 * @interface AdminMaintenanceState
 *
 * @description
 * State of `AdminMaintenanceStore`.
 */
export interface AdminMaintenanceState {
  // #region Properties
  /**
   * Property setting
   * @readonly
   *
   * @description
   * Setting last read or written, `null` before the first read.
   *
   * @type {AdminMaintenance | null}
   */
  readonly setting: AdminMaintenance | null;

  /**
   * Property loadCallState
   * @readonly
   *
   * @description
   * State of the read.
   *
   * @type {CallState}
   */
  readonly loadCallState: CallState;

  /**
   * Property writeCallState
   * @readonly
   *
   * @description
   * State of the last save.
   *
   * @type {CallState}
   */
  readonly writeCallState: CallState;
  // #endregion
}
