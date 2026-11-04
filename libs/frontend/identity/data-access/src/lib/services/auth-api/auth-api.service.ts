import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  LoginRequest,
  LoginResponse,
  SessionResponse,
  TotpRequest,
} from '@vfortin/identity-contracts';
import { API_PREFIX } from '@vfortin/web-http';
import { type Observable, map } from 'rxjs';
import { CSRF_HEADERS } from '@internal/identity-web-data-access/lib/constants/csrf-headers.constants';
import type { Credentials } from '@internal/identity-web-data-access/lib/models/credentials/credentials.interface';

/**
 * Service AuthApiService
 * @class AuthApiService
 *
 * @description
 * Sends administrator credentials and session operations to the identity API. Refresh tokens remain
 * in the HttpOnly cookie; the service returns only the short-lived access session to its caller.
 */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  // #region Properties
  /**
   * Property http
   * @readonly
   *
   * @description
   * Browser HTTP client used for same-origin identity API requests.
   *
   * @type {HttpClient}
   */
  private readonly http: HttpClient = inject<HttpClient>(HttpClient);
  // #endregion

  // #region Methods
  /**
   * Method login
   * @method login
   *
   * @description
   * First login step: opens the session at once when the second factor is disabled or this browser
   * is a trusted device, otherwise returns the challenge of the one-time code.
   *
   * @param {Credentials} credentials - E-mail, password and "remember me" choice.
   *
   * @returns {Observable<LoginResponse>} Open session or code challenge.
   */
  public login(credentials: Credentials): Observable<LoginResponse> {
    const body: LoginRequest = credentials;
    return this.http.post<LoginResponse>(`${API_PREFIX}/auth/login`, body);
  }

  /**
   * Method verifyCode
   * @method verifyCode
   *
   * @description
   * Second login step: sends the one-time code with the challenge and opens the session.
   *
   * @param {TotpRequest} request - Challenge, six-digit code and trusted-device choice.
   *
   * @returns {Observable<SessionResponse>} Access token and expiry metadata.
   */
  public verifyCode(request: TotpRequest): Observable<SessionResponse> {
    return this.http.post<SessionResponse>(`${API_PREFIX}/auth/login/totp`, request, {
      headers: CSRF_HEADERS,
    });
  }

  /**
   * Method refresh
   * @method refresh
   *
   * @description
   * Rotates the refresh cookie using the CSRF header and returns the renewed access session.
   *
   * @returns {Observable<SessionResponse>} Renewed access token and expiry metadata.
   */
  public refresh(): Observable<SessionResponse> {
    return this.http.post<SessionResponse>(`${API_PREFIX}/auth/refresh`, null, {
      headers: CSRF_HEADERS,
    });
  }

  /**
   * Method logout
   * @method logout
   *
   * @description
   * Requests revocation of the refresh-token family with the CSRF header; the empty API body is
   * normalized to `void` for callers.
   *
   * @returns {Observable<void>} Completion of the logout request.
   */
  public logout(): Observable<void> {
    return this.http
      .post(`${API_PREFIX}/auth/logout`, null, { headers: CSRF_HEADERS })
      .pipe(map(() => undefined));
  }
  // #endregion
}
