import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { ContactMessageAccepted } from '@vfortin/contact-contracts';
import { API_PREFIX } from '@vfortin/web-http';
import { type Observable, map } from 'rxjs';
import { toContactMessageRequest } from '@internal/contact-web-data-access/lib/adapters/contact-message-request/contact-message-request.adapter';
import type { ContactRequest } from '@internal/contact-web-data-access/lib/models/contact-request/contact-request.interface';

/**
 * Service ContactApiService
 * @class ContactApiService
 *
 * @description
 * Sends the public contact form request through the same-origin contact API and lets HTTP failures
 * propagate to the form store for normalization.
 */
@Injectable({ providedIn: 'root' })
export class ContactApiService {
  // #region Properties
  /**
   * Property http
   * @readonly
   *
   * @description
   * Angular HTTP client used to submit the public contact request.
   *
   * @type {HttpClient}
   */
  private readonly http: HttpClient = inject<HttpClient>(HttpClient);
  // #endregion

  // #region Methods
  /**
   * Method send
   * @method send
   *
   * @description
   * Posts the adapted message to the contact service and exposes completion without the acceptance body.
   *
   * @param {ContactRequest} request - Form data to submit.
   *
   * @returns {Observable<void>} Request completion; transport and API errors propagate to the caller.
   */
  public send(request: ContactRequest): Observable<void> {
    return this.http
      .post<ContactMessageAccepted>(
        `${API_PREFIX}/contact/messages`,
        toContactMessageRequest(request),
      )
      .pipe(map(() => undefined));
  }
  // #endregion
}
