import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  AdminFaqEntryDto,
  AdminFaqList as AdminFaqListDto,
  FaqEntryRequest,
  FaqOrderRequest,
} from '@vfortin/content-contracts';
import { type Observable, map } from 'rxjs';
import {
  toAdminFaqEntry,
  toAdminFaqList,
} from '@internal/content-web-data-access/lib/admin/adapters/admin-faq/admin-faq.adapter';
import { ADMIN_FAQ_ENDPOINT } from '@internal/content-web-data-access/lib/admin/constants/admin-faq-endpoint.constants';
import type { AdminFaqEntry } from '@internal/content-web-data-access/lib/admin/models/admin-faq-entry/admin-faq-entry.interface';
import type { AdminFaqList } from '@internal/content-web-data-access/lib/admin/models/admin-faq-list/admin-faq-list.interface';
import { ifMatch } from '@internal/content-web-data-access/lib/admin/utils/if-match/if-match.utils';

/**
 * Service AdminFaqApiService
 * @class AdminFaqApiService
 *
 * @description
 * Calls the same-origin FAQ administration API (`/api/content/admin/faq`); the identity interceptor
 * supplies the access token. Entry writes send the entry version in `If-Match`, a reorder the list
 * version.
 */
@Injectable({ providedIn: 'root' })
export class AdminFaqApiService {
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
   * Loads the questions by position with the list version.
   *
   * @returns {Observable<AdminFaqList>} List, or the HTTP error.
   */
  public list(): Observable<AdminFaqList> {
    return this.http
      .get<AdminFaqListDto>(`${ADMIN_FAQ_ENDPOINT}/entries`)
      .pipe(map(toAdminFaqList));
  }

  /**
   * Method get
   * @method get
   *
   * @description
   * Loads one question.
   *
   * @param {string} id - Entry identifier.
   *
   * @returns {Observable<AdminFaqEntry>} Entry, or the HTTP error (404 when unknown).
   */
  public get(id: string): Observable<AdminFaqEntry> {
    return this.http
      .get<AdminFaqEntryDto>(`${ADMIN_FAQ_ENDPOINT}/entries/${encodeURIComponent(id)}`)
      .pipe(map(toAdminFaqEntry));
  }

  /**
   * Method create
   * @method create
   *
   * @description
   * Adds a question at the end of the FAQ.
   *
   * @param {FaqEntryRequest} body - Question and answer.
   *
   * @returns {Observable<AdminFaqEntry>} Created entry, or the HTTP error.
   */
  public create(body: FaqEntryRequest): Observable<AdminFaqEntry> {
    return this.http
      .post<AdminFaqEntryDto>(`${ADMIN_FAQ_ENDPOINT}/entries`, body)
      .pipe(map(toAdminFaqEntry));
  }

  /**
   * Method revise
   * @method revise
   *
   * @description
   * Saves a question's content if it still has the loaded version.
   *
   * @param {AdminFaqEntry} entry - Entry as loaded.
   * @param {FaqEntryRequest} body - New content.
   *
   * @returns {Observable<AdminFaqEntry>} Revised entry, or the HTTP error (412 when stale).
   */
  public revise(entry: AdminFaqEntry, body: FaqEntryRequest): Observable<AdminFaqEntry> {
    return this.http
      .put<AdminFaqEntryDto>(this.entryUrl(entry), body, { headers: ifMatch(entry.version) })
      .pipe(map(toAdminFaqEntry));
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Deletes a question if it still has the loaded version.
   *
   * @param {AdminFaqEntry} entry - Entry as loaded.
   *
   * @returns {Observable<AdminFaqList>} Remaining list, or the HTTP error (412 when stale).
   */
  public remove(entry: AdminFaqEntry): Observable<AdminFaqList> {
    return this.http
      .delete<AdminFaqListDto>(this.entryUrl(entry), { headers: ifMatch(entry.version) })
      .pipe(map(toAdminFaqList));
  }

  /**
   * Method reorder
   * @method reorder
   *
   * @description
   * Orders the questions as `ids` lists them, if the list still has the loaded version.
   *
   * @param {number} version - List version as loaded.
   * @param {readonly string[]} ids - Every identifier once, in the wanted order.
   *
   * @returns {Observable<AdminFaqList>} Reordered list, or the HTTP error (412 when stale, 422 when
   * `ids` is not a permutation of the list).
   */
  public reorder(version: number, ids: readonly string[]): Observable<AdminFaqList> {
    const body: FaqOrderRequest = { ids: [...ids] };
    return this.http
      .put<AdminFaqListDto>(`${ADMIN_FAQ_ENDPOINT}/order`, body, { headers: ifMatch(version) })
      .pipe(map(toAdminFaqList));
  }

  /**
   * Method entryUrl
   * @method entryUrl
   *
   * @description
   * URL of an entry.
   *
   * @param {AdminFaqEntry} entry - Entry.
   *
   * @returns {string} Entry URL.
   */
  private entryUrl(entry: AdminFaqEntry): string {
    return `${ADMIN_FAQ_ENDPOINT}/entries/${encodeURIComponent(entry.id)}`;
  }
  // #endregion
}
