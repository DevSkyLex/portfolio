import type { AdminMessagePage } from '@internal/contact-web-data-access/lib/models/admin-message/admin-message-page.interface';
import { toAdminMessage } from '@internal/contact-web-data-access/lib/adapters/admin-message/admin-message.adapter';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { ContactMessageDto, ContactMessageList } from '@vfortin/contact-contracts';
import { type Observable, map } from 'rxjs';
import {
  ADMIN_MESSAGES_URL,
  INBOX_PAGE_SIZE,
} from '@internal/contact-web-data-access/lib/constants/admin-messages.constants';
import type { AdminMessage } from '@internal/contact-web-data-access/lib/models/admin-message/admin-message.type';
import type { AdminMessageStatus } from '@internal/contact-web-data-access/lib/models/admin-message/admin-message-status.type';
import type { AdminMessageTransition } from '@internal/contact-web-data-access/lib/models/admin-message/admin-message-transition.type';

/**
 * Service AdminMessagesApiService
 * @class AdminMessagesApiService
 *
 * @description
 * Calls the protected contact inbox API; the identity interceptor supplies the access token.
 */
@Injectable({ providedIn: 'root' })
export class AdminMessagesApiService {
  // #region Properties
  /**
   * Property http
   * @readonly
   *
   * @description
   * Angular HTTP client used for protected inbox requests.
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
   * Fetches one inbox page, optionally filtered by message status.
   *
   * @param {AdminMessageStatus | null} status - Status filter, or `null` for all statuses.
   * @param {number} page - One-based page number to retrieve.
   *
   * @returns {Observable<AdminMessagePage>} Page payload including messages and total count.
   */
  public list(status: AdminMessageStatus | null, page: number): Observable<AdminMessagePage> {
    let params: HttpParams = new HttpParams().set('page', page).set('pageSize', INBOX_PAGE_SIZE);
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<ContactMessageList>(ADMIN_MESSAGES_URL, { params }).pipe(
      map((list) => ({
        totalItems: list.totalItems,
        member: list.member.map(toAdminMessage),
      })),
    );
  }

  /**
   * Method countAll
   * @method countAll
   *
   * @description
   * Counts the messages of every status through an unfiltered one-row page: the collection's
   * `totalItems` is the figure, the row itself is dropped.
   *
   * @returns {Observable<number>} Number of messages in the inbox.
   */
  public countAll(): Observable<number> {
    const params: HttpParams = new HttpParams().set('page', 1).set('pageSize', 1);
    return this.http
      .get<ContactMessageList>(ADMIN_MESSAGES_URL, { params })
      .pipe(map((list) => list.totalItems));
  }

  /**
   * Method transition
   * @method transition
   *
   * @description
   * Applies a read or archive transition with the message version in `If-Match` so concurrent edits
   * surface as an API conflict.
   *
   * @param {AdminMessage} message - Current message and optimistic-lock version.
   * @param {AdminMessageTransition} action - Lifecycle transition requested by the administrator.
   *
   * @returns {Observable<AdminMessage>} Updated message returned by the API.
   */
  public transition(
    message: AdminMessage,
    action: AdminMessageTransition,
  ): Observable<AdminMessage> {
    return this.http
      .post<ContactMessageDto>(
        `${ADMIN_MESSAGES_URL}/${encodeURIComponent(message.id)}/${action}`,
        null,
        {
          headers: new HttpHeaders({ 'if-match': `"${message.version}"` }),
        },
      )
      .pipe(map(toAdminMessage));
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Deletes a message by its URL-encoded identifier and discards the response body.
   *
   * @param {AdminMessage} message - Message selected for erasure.
   *
   * @returns {Observable<void>} Completion of the deletion request.
   */
  public remove(message: AdminMessage): Observable<void> {
    return this.http
      .delete(`${ADMIN_MESSAGES_URL}/${encodeURIComponent(message.id)}`)
      .pipe(map(() => undefined));
  }
  // #endregion
}
