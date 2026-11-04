import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  TwoFactorDisableRequest,
  TwoFactorEnableRequest,
  TwoFactorSetupRequest,
  TwoFactorSetupResponse,
  TwoFactorStatusResponse,
} from '@vfortin/identity-contracts';
import { API_PREFIX } from '@vfortin/web-http';
import type { Observable } from 'rxjs';

/**
 * Service TwoFactorApiService
 * @class TwoFactorApiService
 *
 * @description
 * Manages the optional one-time code of the administrator account (D17). Every route is bearer
 * protected: `authInterceptor` decorates `/api/auth/totp*`, and wrong passwords or codes answer 422 or
 * 409, never 401, so a refusal keeps the session.
 */
@Injectable({ providedIn: 'root' })
export class TwoFactorApiService {
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
   * Method status
   * @method status
   *
   * @description
   * Reads whether the login currently asks for a one-time code.
   *
   * @returns {Observable<TwoFactorStatusResponse>} Current state of the second factor.
   */
  public status(): Observable<TwoFactorStatusResponse> {
    return this.http.get<TwoFactorStatusResponse>(`${API_PREFIX}/auth/totp`);
  }

  /**
   * Method setup
   * @method setup
   *
   * @description
   * Confirms the password and receives a new pending secret, which replaces any previous one and stays
   * inactive until `enable` confirms a code generated from it.
   *
   * @param {TwoFactorSetupRequest} request - Current password.
   *
   * @returns {Observable<TwoFactorSetupResponse>} Base32 secret and `otpauth://` URI, shown once.
   */
  public setup(request: TwoFactorSetupRequest): Observable<TwoFactorSetupResponse> {
    return this.http.post<TwoFactorSetupResponse>(`${API_PREFIX}/auth/totp/setup`, request);
  }

  /**
   * Method enable
   * @method enable
   *
   * @description
   * Activates the pending secret with a code generated from it.
   *
   * @param {TwoFactorEnableRequest} request - Six-digit code.
   *
   * @returns {Observable<TwoFactorStatusResponse>} The new state, `enabled: true`.
   */
  public enable(request: TwoFactorEnableRequest): Observable<TwoFactorStatusResponse> {
    return this.http.post<TwoFactorStatusResponse>(`${API_PREFIX}/auth/totp/enable`, request);
  }

  /**
   * Method disable
   * @method disable
   *
   * @description
   * Removes the second factor with both factors; the server also forgets every trusted device.
   *
   * @param {TwoFactorDisableRequest} request - Current password and six-digit code.
   *
   * @returns {Observable<TwoFactorStatusResponse>} The new state, `enabled: false`.
   */
  public disable(request: TwoFactorDisableRequest): Observable<TwoFactorStatusResponse> {
    return this.http.post<TwoFactorStatusResponse>(`${API_PREFIX}/auth/totp/disable`, request);
  }
  // #endregion
}
