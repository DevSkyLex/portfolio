import type * as SessionStoreModule from '@internal/identity-web-data-access/lib/state/session/session.store';
import { SessionAuthorityService } from '@internal/identity-web-data-access/lib/services/session-authority/session-authority.service';
import { HttpErrorResponse, type HttpInterceptorFn, type HttpRequest } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { API_PREFIX } from '@vfortin/web-http';
import { catchError, from, switchMap, throwError } from 'rxjs';
import type { SessionStoreType } from '@internal/identity-web-data-access/lib/state/session/session.store';

/**
 * Function isAdminApi
 *
 * @description
 * Identifies relative `/api/` paths containing an `/admin/` segment so public requests bypass session loading and token handling.
 *
 * @param {string} url - Request URL to classify.
 *
 * @returns {boolean} Whether the URL is below an API prefix and contains an admin route segment.
 */
export function isAdminApi(url: string): boolean {
  return url.startsWith(`${API_PREFIX}/`) && url.includes('/admin/');
}

/**
 * Function withToken
 *
 * @description
 * Returns a cloned request with the access token in its authorization header.
 *
 * @param {HttpRequest<unknown>} request - Request to clone.
 * @param {string} token - Access token supplied by the session store.
 *
 * @returns {HttpRequest<unknown>} Request carrying a bearer authorization header.
 */
const withToken = (request: HttpRequest<unknown>, token: string): HttpRequest<unknown> =>
  request.clone({ setHeaders: { authorization: `Bearer ${token}` } });

/**
 * Function sessionFrom
 *
 * @description
 * Loads the session store only when an admin request needs it, keeping NgRx and the store out of the
 * public site's initial bundle.
 *
 * @param {Injector} injector - Injector that resolves the store after its module has loaded.
 *
 * @returns {Promise<SessionStoreType>} Session store instance from the application injector.
 */
async function sessionFrom(injector: Injector): Promise<SessionStoreType> {
  const { SessionStore }: typeof SessionStoreModule =
    await import('@internal/identity-web-data-access/lib/state/session/session.store');
  return injector.get<SessionStoreType>(SessionStore);
}

/**
 * Function authInterceptor
 *
 * @description
 * Adds the current access token only to admin API requests. If the request fails with 401, refreshes
 * once and retries with the rotated token; a failed refresh clears the session and propagates the original error.
 *
 * @type {HttpInterceptorFn}
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isAdminApi(request.url)) {
    return next(request);
  }
  const injector: Injector = inject<Injector>(Injector);
  const generation: number = inject<SessionAuthorityService>(SessionAuthorityService).capture();
  return from(sessionFrom(injector)).pipe(
    switchMap((session) => {
      const current = (): boolean => session.generation() === generation;
      if (!current()) {
        return throwError(
          () => new HttpErrorResponse({ status: 401, statusText: 'Session changed' }),
        );
      }
      return from(session.validToken()).pipe(
        switchMap((token) =>
          current()
            ? next(token ? withToken(request, token) : request)
            : throwError(
                () => new HttpErrorResponse({ status: 401, statusText: 'Session changed' }),
              ),
        ),
        catchError((error: unknown) => {
          if (!current() || !(error instanceof HttpErrorResponse) || error.status !== 401) {
            return throwError(() => error);
          }
          return from(session.refresh()).pipe(
            switchMap((renewed) => {
              if (!current()) return throwError(() => error);
              const token: string | null = session.accessToken();
              if (!renewed || token === null) {
                session.clear();
                return throwError(() => error);
              }
              return next(withToken(request, token));
            }),
          );
        }),
      );
    }),
  );
};
