import type { CallState } from '@vfortin/web-http';
import type { AdminProfile } from '@internal/content-web-data-access/lib/admin/models/admin-profile/admin-profile.interface';

/**
 * Interface AdminProfileState
 * @interface AdminProfileState
 *
 * @description
 * Profile last read or written, and the state of each independent call.
 */
export interface AdminProfileState {
  // #region Properties
  /**
   * Property profile
   * @readonly
   *
   * @description
   * Profile, `null` before the first read.
   *
   * @type {AdminProfile | null}
   */
  readonly profile: AdminProfile | null;

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
