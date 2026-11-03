import { SessionAuthorityService } from '@internal/identity-web-data-access/lib/services/session-authority/session-authority.service';
import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  type StoreError,
  toStoreError,
  pendingCallState,
  successCallState,
  errorCallState,
  idleCallState,
} from '@vfortin/web-http';
import { firstValueFrom } from 'rxjs';
import type { TotpRequest } from '@vfortin/identity-contracts';
import {
  EXPIRY_MARGIN_MS,
  INITIAL_SESSION_STATE,
  REFRESH_LOCK,
} from '@internal/identity-web-data-access/lib/constants/session.constants';
import type { Credentials } from '@internal/identity-web-data-access/lib/models/credentials/credentials.interface';
import type { LoginStep } from '@internal/identity-web-data-access/lib/models/login-step/login-step.type';
import { AuthApiService } from '@internal/identity-web-data-access/lib/services/auth-api/auth-api.service';
import type { SessionState } from '@internal/identity-web-data-access/lib/state/session/models/session-state.interface';

/**
 * Function acrossTabs
 *
 * @description
 * Serializes a refresh call with other tabs when Web Locks are available. Without Web Locks the
 * call proceeds in this tab, so cross-tab serialization is not provided by this helper.
 *
 * @template T - Value returned by the protected call.
 * @param {() => Promise<T>} call - Asynchronous operation to run while holding the origin lock.
 *
 * @returns {Promise<T>} Result of the protected operation.
 */
function acrossTabs<T>(call: () => Promise<T>): Promise<T> {
  const locks: LockManager | undefined =
    typeof navigator === 'undefined' ? undefined : navigator.locks;
  return locks ? locks.request(REFRESH_LOCK, call) : call();
}

/**
 * Constant SessionStore
 *
 * @description
 * Root-provided admin session store. It coalesces concurrent refreshes in one tab and uses an
 * origin lock where available to serialize all cookie-changing authentication operations.
 */
export const SessionStore = signalStore(
  { providedIn: 'root' },
  withState<SessionState>(INITIAL_SESSION_STATE),
  withComputed((store) => ({
    authenticated: computed<boolean>(() => store.accessToken() !== null),
  })),
  withMethods(
    (
      store,
      api: AuthApiService = inject<AuthApiService>(AuthApiService),
      authority: SessionAuthorityService = inject<SessionAuthorityService>(SessionAuthorityService),
    ) => {
      // Keep one promise so concurrent requests in this tab share the same refresh operation.
      let refreshing: Promise<boolean> | null = null;

      // Refresh responses and HTTP retries retain the authority that initiated them.

      let locallySignedOut: boolean = false;

      // Preserve response-cookie order in this tab even when the browser has no Web Locks API.
      let cookieMutation: Promise<unknown> | null = null;

      /** Serializes cookie-changing operations in this store and across tabs when supported. */
      const inSessionOrder = <T>(call: () => Promise<T>): Promise<T> => {
        const next: Promise<T> = cookieMutation
          ? cookieMutation.then(
              () => acrossTabs(call),
              () => acrossTabs(call),
            )
          : acrossTabs(call);
        cookieMutation = next;
        const release = (): void => {
          if (cookieMutation === next) cookieMutation = null;
        };
        void next.then(release, release);
        return next;
      };
      /**
       * Function open
       *
       * @description
       * Stores a newly issued access token and calculates its expiry from the API lifetime in seconds.
       *
       * @param {{ accessToken: string; expiresIn: number }} session - Session response from the identity API.
       *
       * @returns {void} Updates the store state.
       */
      const open = (session: { accessToken: string; expiresIn: number }): void =>
        patchState(store, {
          accessToken: session.accessToken,
          expiresAt: Date.now() + session.expiresIn * 1000,
          logoutCallState: idleCallState(),
        });
      /**
       * Function reset
       *
       * @description
       * Invalidates outstanding refresh responses and clears both session fields.
       *
       * @returns {void} Updates the store state and generation counter.
       */
      const reset = (): void => {
        authority.invalidate();
        locallySignedOut = true;
        refreshing = null;
        patchState(store, INITIAL_SESSION_STATE);
      };

      /**
       * Function refresh
       *
       * @description
       * Shares an in-flight refresh within the tab, serializes it across tabs where possible, and
       * ignores or clears results that fail or belong to an invalidated generation.
       *
       * @returns {Promise<boolean>} Whether a current session was established by the refresh.
       */
      const refresh = (): Promise<boolean> => {
        if (locallySignedOut) return Promise.resolve(false);
        if (refreshing) return refreshing;
        const ticket: number = authority.capture();
        const current: Promise<boolean> = inSessionOrder(() =>
          ticket !== authority.capture() || locallySignedOut
            ? Promise.resolve(null)
            : firstValueFrom(api.refresh()),
        )
          .then((session) => {
            if (session === null || ticket !== authority.capture()) return false;
            open(session);
            return ticket === authority.capture();
          })
          .catch(() => {
            if (ticket === authority.capture()) patchState(store, INITIAL_SESSION_STATE);
            return false;
          })
          .finally(() => {
            if (refreshing === current) refreshing = null;
          });
        refreshing = current;
        return current;
      };

      return {
        /** Captures the authority owning an HTTP request; refresh does not replace that authority. */
        generation: (): number => authority.capture(),
        async login(credentials: Credentials): Promise<LoginStep> {
          authority.invalidate();
          const ticket: number = authority.capture();
          try {
            const answer:
              | { status: 'authenticated'; accessToken: string; expiresIn: number }
              | { status: 'totp-required'; challenge: string; expiresIn: number } =
              await inSessionOrder(() => firstValueFrom(api.login(credentials)));
            if (ticket !== authority.capture())
              return {
                kind: 'failed',
                error: toStoreError(new Error('Authentication request superseded.')),
              };
            if (answer.status === 'totp-required') {
              return { kind: 'code', challenge: answer.challenge };
            }
            authority.invalidate();
            locallySignedOut = false;
            refreshing = null;
            open(answer);
            return { kind: 'authenticated' };
          } catch (error: unknown) {
            return { kind: 'failed', error: toStoreError(error) };
          }
        },
        async verifyCode(request: TotpRequest): Promise<StoreError | null> {
          authority.invalidate();
          const ticket: number = authority.capture();
          try {
            const session: { accessToken: string; expiresIn: number } = await inSessionOrder(() =>
              firstValueFrom(api.verifyCode(request)),
            );
            if (ticket !== authority.capture())
              return toStoreError(new Error('Authentication request superseded.'));
            authority.invalidate();
            locallySignedOut = false;
            refreshing = null;
            open(session);
            return null;
          } catch (error: unknown) {
            return toStoreError(error);
          }
        },
        refresh,
        async validToken(): Promise<string | null> {
          const expiresAt: number | null = store.expiresAt();
          if (
            store.accessToken() &&
            expiresAt !== null &&
            expiresAt - Date.now() > EXPIRY_MARGIN_MS
          ) {
            return store.accessToken();
          }
          return (await refresh()) ? store.accessToken() : null;
        },
        async logout(): Promise<boolean> {
          // Cleared first: a refresh still running cannot bring the session back.
          reset();
          locallySignedOut = true;
          const ticket: number = authority.capture();
          patchState(store, { logoutCallState: pendingCallState() });
          try {
            await inSessionOrder(() => firstValueFrom(api.logout()));
            if (ticket === authority.capture())
              patchState(store, { logoutCallState: successCallState() });
            return ticket === authority.capture();
          } catch (error: unknown) {
            if (ticket === authority.capture())
              patchState(store, { logoutCallState: errorCallState(toStoreError(error)) });
            return false;
          }
        },
        clear: reset,
      };
    },
  ),
);

/**
 * Type SessionStoreType
 * @type SessionStoreType
 *
 * @description
 * Instance type inferred from the exported SignalStore factory for typed store injection.
 *
 * @type {InstanceType<typeof SessionStore>}
 */
export type SessionStoreType = InstanceType<typeof SessionStore>;
