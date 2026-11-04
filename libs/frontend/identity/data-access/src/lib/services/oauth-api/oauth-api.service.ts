import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  AuthorizationRedirect,
  AuthorizationReviewRequest,
  AuthorizationReviewResponse,
  ConnectedApplicationsResponse,
} from '@vfortin/identity-contracts';
import { API_PREFIX } from '@vfortin/web-http';
import type { Observable } from 'rxjs';

/**
 * Service OAuthApiService
 * @class OAuthApiService
 *
 * @description
 * Administrator routes of the OAuth authorization server for MCP clients (D45): review and decision of
 * an authorization request on the consent page, and the « Applications connectées » of the security
 * page. Every route sits under `/api/auth/admin/`, so `authInterceptor` adds the bearer token.
 */
@Injectable({ providedIn: 'root' })
export class OAuthApiService {
  // #region Properties
  /**
   * Property http
   * @readonly
   *
   * @description
   * Browser HTTP client for same-origin identity requests.
   *
   * @type {HttpClient}
   */
  private readonly http: HttpClient = inject<HttpClient>(HttpClient);
  // #endregion

  // #region Methods
  /**
   * Method review
   * @method review
   *
   * @description
   * Forwards the authorization query for validation.
   *
   * @param {AuthorizationReviewRequest} request - Query parameters as received.
   *
   * @returns {Observable<AuthorizationReviewResponse>} Consent to show or error redirect.
   */
  public review(request: AuthorizationReviewRequest): Observable<AuthorizationReviewResponse> {
    return this.http.post<AuthorizationReviewResponse>(
      `${API_PREFIX}/auth/admin/oauth/authorizations`,
      request,
    );
  }

  /**
   * Method approve
   * @method approve
   *
   * @description
   * « Autoriser »: the answer carries the redirect with the code.
   *
   * @param {string} requestId - Pending request.
   *
   * @returns {Observable<AuthorizationRedirect>} Redirect back to the client.
   */
  public approve(requestId: string): Observable<AuthorizationRedirect> {
    return this.http.post<AuthorizationRedirect>(
      `${API_PREFIX}/auth/admin/oauth/authorizations/${encodeURIComponent(requestId)}/approve`,
      {},
    );
  }

  /**
   * Method deny
   * @method deny
   *
   * @description
   * « Refuser »: the answer carries the `access_denied` redirect.
   *
   * @param {string} requestId - Pending request.
   *
   * @returns {Observable<AuthorizationRedirect>} Redirect back to the client.
   */
  public deny(requestId: string): Observable<AuthorizationRedirect> {
    return this.http.post<AuthorizationRedirect>(
      `${API_PREFIX}/auth/admin/oauth/authorizations/${encodeURIComponent(requestId)}/deny`,
      {},
    );
  }

  /**
   * Method applications
   * @method applications
   *
   * @description
   * Lists the consented clients.
   *
   * @returns {Observable<ConnectedApplicationsResponse>} Connected applications, newest first.
   */
  public applications(): Observable<ConnectedApplicationsResponse> {
    return this.http.get<ConnectedApplicationsResponse>(
      `${API_PREFIX}/auth/admin/oauth/applications`,
    );
  }

  /**
   * Method revoke
   * @method revoke
   *
   * @description
   * Revokes a consent and its refresh tokens.
   *
   * @param {string} id - Grant identifier.
   *
   * @returns {Observable<void>} Completion (204).
   */
  public revoke(id: string): Observable<void> {
    return this.http.delete<void>(
      `${API_PREFIX}/auth/admin/oauth/applications/${encodeURIComponent(id)}`,
    );
  }
  // #endregion
}
