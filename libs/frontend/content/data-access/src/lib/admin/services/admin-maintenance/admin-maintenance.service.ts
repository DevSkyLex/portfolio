import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { AdminMaintenanceDto, MaintenanceRequest } from '@vfortin/content-contracts';
import { type Observable, map } from 'rxjs';
import { ADMIN_MAINTENANCE_ENDPOINT } from '@internal/content-web-data-access/lib/admin/constants/admin-maintenance-endpoint.constants';
import type { AdminMaintenance } from '@internal/content-web-data-access/lib/admin/models/admin-maintenance/admin-maintenance.interface';
import { ifMatch } from '@internal/content-web-data-access/lib/admin/utils/if-match/if-match.utils';
import { toAdminMaintenance } from '@internal/content-web-data-access/lib/admin/utils/maintenance-draft/maintenance-draft.utils';

/**
 * Service AdminMaintenanceApiService
 * @class AdminMaintenanceApiService
 *
 * @description
 * Administrator HTTP adapter of the maintenance setting: read, and revision with `If-Match` on the
 * version last read or written.
 */
@Injectable({ providedIn: 'root' })
export class AdminMaintenanceApiService {
  // #region Properties
  /**
   * Property http
   * @readonly
   *
   * @description
   * Angular HTTP client, behind the identity interceptor of the admin area.
   *
   * @type {HttpClient}
   */
  private readonly http: HttpClient = inject<HttpClient>(HttpClient);
  // #endregion

  // #region Methods
  /**
   * Method get
   * @method get
   *
   * @description
   * Reads the setting.
   *
   * @returns {Observable<AdminMaintenance>} Setting with its version.
   */
  public get(): Observable<AdminMaintenance> {
    return this.http
      .get<AdminMaintenanceDto>(ADMIN_MAINTENANCE_ENDPOINT)
      .pipe(map(toAdminMaintenance));
  }

  /**
   * Method revise
   * @method revise
   *
   * @description
   * Replaces the setting if it still has the version of `current`; a stale one answers 412.
   *
   * @param {AdminMaintenance} current - Setting last read or written.
   * @param {MaintenanceRequest} body - Revision.
   *
   * @returns {Observable<AdminMaintenance>} Revised setting with its new version.
   */
  public revise(current: AdminMaintenance, body: MaintenanceRequest): Observable<AdminMaintenance> {
    return this.http
      .put<AdminMaintenanceDto>(ADMIN_MAINTENANCE_ENDPOINT, body, {
        headers: ifMatch(current.version),
      })
      .pipe(map(toAdminMaintenance));
  }
  // #endregion
}
