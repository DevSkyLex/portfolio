import { toAdminProject } from '@internal/content-web-data-access/lib/admin/adapters/admin-project/admin-project.adapter';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  AdminProjectDto,
  AdminProjectList,
  ProjectRevisionRequest,
} from '@vfortin/content-contracts';
import { type Observable, map } from 'rxjs';
import { ADMIN_PROJECTS_ENDPOINT } from '@internal/content-web-data-access/lib/admin/constants/admin-projects-endpoint.constants';
import type { AdminProject } from '@internal/content-web-data-access/lib/admin/models/admin-project/admin-project.type';
import { ifMatch } from '@internal/content-web-data-access/lib/admin/utils/if-match/if-match.utils';

/**
 * Service AdminProjectsApiService
 * @class AdminProjectsApiService
 *
 * @description
 * Calls the same-origin administrator project API; the identity interceptor supplies the access token.
 */
@Injectable({ providedIn: 'root' })
export class AdminProjectsApiService {
  // #region Properties
  /**
   * Property http
   * @readonly
   *
   * @description
   * Angular HTTP client used for administrator project requests.
   *
   * @type {HttpClient}
   */
  private readonly http: HttpClient = inject<HttpClient>(HttpClient);
  // #endregion

  // #region Methods
  /**
   * Method list
   * @method list
   *
   * @description
   * Loads the administrator project collection and exposes its `member` array.
   *
   * @returns {Observable<AdminProject[]>} Project list response, or an observable error from the HTTP request.
   */
  public list(): Observable<AdminProject[]> {
    return this.http
      .get<AdminProjectList>(ADMIN_PROJECTS_ENDPOINT)
      .pipe(map((list): AdminProject[] => list.member.map(toAdminProject)));
  }

  /**
   * Method get
   * @method get
   *
   * @description
   * Loads one project by encoded identifier for the edit form.
   *
   * @param {string} id - Project identifier from the administrator route.
   *
   * @returns {Observable<AdminProject>} Project response, or an observable error from the HTTP request.
   */
  public get(id: string): Observable<AdminProject> {
    return this.http
      .get<AdminProjectDto>(`${ADMIN_PROJECTS_ENDPOINT}/${encodeURIComponent(id)}`)
      .pipe(map(toAdminProject));
  }

  /**
   * Method revise
   * @method revise
   *
   * @description
   * Saves a project revision using the loaded version as an optimistic concurrency precondition.
   *
   * @param {string} id - Project identifier to revise.
   * @param {number} version - Version supplied in the `If-Match` header.
   * @param {ProjectRevisionRequest} body - Validated revision request to persist.
   *
   * @returns {Observable<AdminProject>} Updated project response, or an observable conflict/transport error.
   */
  public revise(
    id: string,
    version: number,
    body: ProjectRevisionRequest,
  ): Observable<AdminProject> {
    return this.http
      .put<AdminProjectDto>(`${ADMIN_PROJECTS_ENDPOINT}/${encodeURIComponent(id)}`, body, {
        headers: ifMatch(version),
      })
      .pipe(map(toAdminProject));
  }

  /**
   * Method publish
   * @method publish
   *
   * @description
   * Publishes the project only if it still has the version loaded by the editor.
   *
   * @param {string} id - Project identifier to publish.
   * @param {number} version - Version supplied in the `If-Match` header.
   *
   * @returns {Observable<AdminProject>} Published project response, or an observable conflict/transport error.
   */
  public publish(id: string, version: number): Observable<AdminProject> {
    return this.http
      .post<AdminProjectDto>(`${ADMIN_PROJECTS_ENDPOINT}/${encodeURIComponent(id)}/publish`, null, {
        headers: ifMatch(version),
      })
      .pipe(map(toAdminProject));
  }

  /**
   * Method unpublish
   * @method unpublish
   *
   * @description
   * Removes the project from the public site only if its version still matches the editor's version.
   *
   * @param {string} id - Project identifier to unpublish.
   * @param {number} version - Version supplied in the `If-Match` header.
   *
   * @returns {Observable<AdminProject>} Unpublished project response, or an observable conflict/transport error.
   */
  public unpublish(id: string, version: number): Observable<AdminProject> {
    return this.http
      .post<AdminProjectDto>(
        `${ADMIN_PROJECTS_ENDPOINT}/${encodeURIComponent(id)}/unpublish`,
        null,
        {
          headers: ifMatch(version),
        },
      )
      .pipe(map(toAdminProject));
  }
  // #endregion
}
