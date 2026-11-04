import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { SeoRefreshAcceptedDto } from '@vfortin/content-contracts';
import type { Observable } from 'rxjs';
import { ADMIN_SEO_DASHBOARD_ENDPOINT } from '@internal/content-web-data-access/lib/admin/constants/admin-seo-dashboard-endpoint.constants';
import type {
  SeoDashboard,
  SeoRange,
} from '@internal/content-web-data-access/lib/admin/models/seo-dashboard/seo-dashboard.type';

/**
 * Service AdminSeoDashboardApiService
 * @class AdminSeoDashboardApiService
 *
 * @description
 * Administrator HTTP adapter of the SEO dashboard (D47): the cached report of a window, and the
 * request starting a background refresh (202, or 429 within 10 minutes of the previous start).
 */
@Injectable({ providedIn: 'root' })
export class AdminSeoDashboardApiService {
  // #region Properties
  /**
   * Property http
   * @readonly
   *
   * @description
   * Angular HTTP client, decorated by the admin interceptors.
   *
   * @type {HttpClient}
   */
  private readonly http: HttpClient = inject<HttpClient>(HttpClient);
  // #endregion

  // #region Methods
  /**
   * Method dashboard
   * @method dashboard
   *
   * @description
   * Reads the dashboard of a window; the read never calls Google.
   *
   * @param {SeoRange} range - Report window.
   *
   * @returns {Observable<SeoDashboard>} Dashboard.
   */
  public dashboard(range: SeoRange): Observable<SeoDashboard> {
    return this.http.get<SeoDashboard>(ADMIN_SEO_DASHBOARD_ENDPOINT, {
      params: new HttpParams().set('range', range),
    });
  }

  /**
   * Method refresh
   * @method refresh
   *
   * @description
   * Starts a refresh of every source in the background.
   *
   * @returns {Observable<SeoRefreshAcceptedDto>} Start of the refresh and the earliest next one.
   */
  public refresh(): Observable<SeoRefreshAcceptedDto> {
    return this.http.post<SeoRefreshAcceptedDto>(`${ADMIN_SEO_DASHBOARD_ENDPOINT}/refresh`, null);
  }
  // #endregion
}
