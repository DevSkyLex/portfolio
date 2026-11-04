import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  AdminTimelineEntryDto,
  AdminTimelineList as AdminTimelineListDto,
  TimelineEntryRequest,
} from '@vfortin/content-contracts';
import { type Observable, map } from 'rxjs';
import {
  toAdminTimelineEntry,
  toAdminTimelineList,
} from '@internal/content-web-data-access/lib/admin/adapters/admin-timeline/admin-timeline.adapter';
import { ADMIN_TIMELINE_ENDPOINT } from '@internal/content-web-data-access/lib/admin/constants/admin-timeline-endpoint.constants';
import type { AdminTimelineEntry } from '@internal/content-web-data-access/lib/admin/models/admin-timeline-entry/admin-timeline-entry.interface';
import type { AdminTimelineList } from '@internal/content-web-data-access/lib/admin/models/admin-timeline-list/admin-timeline-list.interface';
import type { TimelineKind } from '@internal/content-web-data-access/lib/admin/models/timeline-kind/timeline-kind.type';
import { ifMatch } from '@internal/content-web-data-access/lib/admin/utils/if-match/if-match.utils';

/**
 * Service AdminTimelineApiService
 * @class AdminTimelineApiService
 *
 * @description
 * Calls the same-origin timeline administration API (`/api/content/admin/timeline/<kind>`); the
 * identity interceptor supplies the access token. Entry writes send the entry version in `If-Match`.
 */
@Injectable({ providedIn: 'root' })
export class AdminTimelineApiService {
  // #region Properties
  /**
   * Property http
   * @readonly
   *
   * @description
   * Angular HTTP client.
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
   * Loads the entries of a kind with the list version.
   *
   * @param {TimelineKind} kind - Kind of the list.
   *
   * @returns {Observable<AdminTimelineList>} List, or the HTTP error.
   */
  public list(kind: TimelineKind): Observable<AdminTimelineList> {
    return this.http
      .get<AdminTimelineListDto>(`${this.base(kind)}/entries`)
      .pipe(map(toAdminTimelineList));
  }

  /**
   * Method get
   * @method get
   *
   * @description
   * Loads one entry of a kind.
   *
   * @param {TimelineKind} kind - Kind named by the route.
   * @param {string} id - Entry identifier.
   *
   * @returns {Observable<AdminTimelineEntry>} Entry, or the HTTP error (404 for another kind).
   */
  public get(kind: TimelineKind, id: string): Observable<AdminTimelineEntry> {
    return this.http
      .get<AdminTimelineEntryDto>(`${this.base(kind)}/entries/${encodeURIComponent(id)}`)
      .pipe(map(toAdminTimelineEntry));
  }

  /**
   * Method create
   * @method create
   *
   * @description
   * Adds an entry at the end of its kind.
   *
   * @param {TimelineKind} kind - Kind of the new entry.
   * @param {TimelineEntryRequest} body - Entry content.
   *
   * @returns {Observable<AdminTimelineEntry>} Created entry, or the HTTP error.
   */
  public create(kind: TimelineKind, body: TimelineEntryRequest): Observable<AdminTimelineEntry> {
    return this.http
      .post<AdminTimelineEntryDto>(`${this.base(kind)}/entries`, body)
      .pipe(map(toAdminTimelineEntry));
  }

  /**
   * Method revise
   * @method revise
   *
   * @description
   * Saves an entry's content if it still has the loaded version.
   *
   * @param {AdminTimelineEntry} entry - Entry as loaded.
   * @param {TimelineEntryRequest} body - New content.
   *
   * @returns {Observable<AdminTimelineEntry>} Revised entry, or the HTTP error (412 when stale).
   */
  public revise(
    entry: AdminTimelineEntry,
    body: TimelineEntryRequest,
  ): Observable<AdminTimelineEntry> {
    return this.http
      .put<AdminTimelineEntryDto>(this.entryUrl(entry), body, { headers: ifMatch(entry.version) })
      .pipe(map(toAdminTimelineEntry));
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Deletes an entry if it still has the loaded version.
   *
   * @param {AdminTimelineEntry} entry - Entry as loaded.
   *
   * @returns {Observable<AdminTimelineList>} Remaining list, or the HTTP error (412 when stale).
   */
  public remove(entry: AdminTimelineEntry): Observable<AdminTimelineList> {
    return this.http
      .delete<AdminTimelineListDto>(this.entryUrl(entry), { headers: ifMatch(entry.version) })
      .pipe(map(toAdminTimelineList));
  }

  /**
   * Method base
   * @method base
   *
   * @description
   * Endpoint of a kind.
   *
   * @param {TimelineKind} kind - Kind.
   *
   * @returns {string} URL prefix.
   */
  private base(kind: TimelineKind): string {
    return `${ADMIN_TIMELINE_ENDPOINT}/${kind}`;
  }

  /**
   * Method entryUrl
   * @method entryUrl
   *
   * @description
   * URL of an entry.
   *
   * @param {AdminTimelineEntry} entry - Entry.
   *
   * @returns {string} Entry URL.
   */
  private entryUrl(entry: AdminTimelineEntry): string {
    return `${this.base(entry.kind)}/entries/${encodeURIComponent(entry.id)}`;
  }
  // #endregion
}
