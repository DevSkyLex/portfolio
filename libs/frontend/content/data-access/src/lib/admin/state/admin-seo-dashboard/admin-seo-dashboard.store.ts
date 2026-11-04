import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import type { SeoRefreshAcceptedDto } from '@vfortin/content-contracts';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  type StoreError,
} from '@vfortin/web-http';
import { firstValueFrom } from 'rxjs';
import {
  SEO_DEFAULT_RANGE,
  SEO_REFRESH_POLL_MS,
  SEO_REFRESH_TOO_SOON,
} from '@internal/content-web-data-access/lib/admin/constants/seo-dashboard.constants';
import type {
  SeoDashboard,
  SeoRange,
} from '@internal/content-web-data-access/lib/admin/models/seo-dashboard/seo-dashboard.type';
import type { SeoRefreshOutcome } from '@internal/content-web-data-access/lib/admin/models/seo-refresh-outcome/seo-refresh-outcome.type';
import { AdminSeoDashboardApiService } from '@internal/content-web-data-access/lib/admin/services/admin-seo-dashboard/admin-seo-dashboard.service';
import type { AdminSeoDashboardState } from '@internal/content-web-data-access/lib/admin/state/admin-seo-dashboard/models/admin-seo-dashboard-state/admin-seo-dashboard-state.interface';

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Nothing read, the API's default window, no call made.
 */
const INITIAL_STATE: AdminSeoDashboardState = {
  dashboard: null,
  range: SEO_DEFAULT_RANGE,
  retryAt: null,
  loadCallState: idleCallState(),
  refreshCallState: idleCallState(),
  pollCallState: idleCallState(),
};

/**
 * Function retryTime
 *
 * @description
 * Time a 429 allows the next refresh: the ISO time of the problem's `details[0]`, else its
 * `Retry-After` HTTP date, else `null`.
 *
 * @param {unknown} error - Rejected refresh request.
 *
 * @returns {string | null} ISO time, or `null` when the answer gives none.
 */
function retryTime(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  const body: unknown = error.error;
  const details: unknown =
    typeof body === 'object' && body !== null ? (body as { details?: unknown }).details : null;
  const first: unknown = Array.isArray(details) ? (details as unknown[])[0] : null;
  const candidates: unknown[] = [first, error.headers.get('Retry-After')];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const time: number = Date.parse(candidate);
    if (!Number.isNaN(time)) return new Date(time).toISOString();
  }
  return null;
}

/**
 * Store AdminSeoDashboardStore
 *
 * @description
 * State of the « Tableau de bord » page (D47), provided by the page. `load` reads a window and keeps
 * the previous dashboard on screen meanwhile; a read answered after a newer one is ignored. `refresh`
 * starts a background refresh, then reads the same window every `SEO_REFRESH_POLL_MS` until
 * `refresh.running` is false (a read finding a refresh already running polls the same way); a 429
 * gives back the time the next refresh is accepted. Polling stops with the store.
 */
export const AdminSeoDashboardStore = signalStore(
  withState<AdminSeoDashboardState>(INITIAL_STATE),
  withComputed((store) => ({
    loading: computed<boolean>((): boolean => store.loadCallState().status === 'pending'),
    refreshing: computed<boolean>(
      (): boolean =>
        store.refreshCallState().status === 'pending' ||
        (store.dashboard()?.refresh.running ?? false),
    ),
    nextAllowedAt: computed<string | null>((): string | null => {
      const times: number[] = [store.dashboard()?.refresh.nextAllowedAt, store.retryAt()]
        .filter((time: string | null | undefined): time is string => typeof time === 'string')
        .map((time: string): number => Date.parse(time))
        .filter((time: number): boolean => !Number.isNaN(time));
      return times.length ? new Date(Math.max(...times)).toISOString() : null;
    }),
  })),
  withMethods(
    (
      store,
      api: AdminSeoDashboardApiService = inject<AdminSeoDashboardApiService>(
        AdminSeoDashboardApiService,
      ),
    ) => {
      let readGeneration: number = 0;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const stopPolling = (): void => {
        if (timer !== null) clearTimeout(timer);
        timer = null;
      };

      const schedulePoll = (): void => {
        stopPolling();
        const generation: number = readGeneration;
        timer = setTimeout((): void => {
          timer = null;
          void poll(generation);
        }, SEO_REFRESH_POLL_MS);
      };

      const poll = async (generation: number): Promise<void> => {
        patchState(store, { pollCallState: pendingCallState() });
        try {
          const dashboard: SeoDashboard = await firstValueFrom(api.dashboard(store.range()));
          if (generation !== readGeneration) return;
          patchState(store, { dashboard, pollCallState: successCallState() });
          if (dashboard.refresh.running) schedulePoll();
        } catch (error) {
          if (generation === readGeneration)
            patchState(store, { pollCallState: errorCallState(toStoreError(error)) });
        }
      };

      return {
        async load(range: SeoRange): Promise<SeoDashboard | null> {
          const generation: number = ++readGeneration;
          stopPolling();
          patchState(store, { range, loadCallState: pendingCallState() });
          try {
            const dashboard: SeoDashboard = await firstValueFrom(api.dashboard(range));
            if (generation !== readGeneration) return null;
            patchState(store, { dashboard, loadCallState: successCallState() });
            if (dashboard.refresh.running) schedulePoll();
            return dashboard;
          } catch (error) {
            if (generation === readGeneration)
              patchState(store, { loadCallState: errorCallState(toStoreError(error)) });
            return null;
          }
        },
        async refresh(): Promise<SeoRefreshOutcome | null> {
          if (store.refreshing()) return null;
          patchState(store, { refreshCallState: pendingCallState() });
          try {
            const accepted: SeoRefreshAcceptedDto = await firstValueFrom(api.refresh());
            const current: SeoDashboard | null = store.dashboard();
            patchState(store, {
              retryAt: null,
              refreshCallState: successCallState(),
              pollCallState: idleCallState(),
              dashboard: current && {
                ...current,
                refresh: {
                  ...current.refresh,
                  running: true,
                  startedAt: accepted.startedAt,
                  nextAllowedAt: accepted.nextAllowedAt,
                },
              },
            });
            schedulePoll();
            return { status: 'started' };
          } catch (error) {
            const failure: StoreError = toStoreError(error);
            if (failure.status === 429 && failure.code === SEO_REFRESH_TOO_SOON) {
              const retryAt: string | null = retryTime(error);
              patchState(store, { retryAt, refreshCallState: errorCallState(failure) });
              return { status: 'too-soon', retryAt };
            }
            patchState(store, { refreshCallState: errorCallState(failure) });
            return { status: 'failed', error: failure };
          }
        },
        stop(): void {
          readGeneration++;
          stopPolling();
        },
      };
    },
  ),
  withHooks((store) => ({
    onDestroy(): void {
      store.stop();
    },
  })),
);

/**
 * Type AdminSeoDashboardStoreType
 * @type AdminSeoDashboardStoreType
 *
 * @description
 * Instance type of `AdminSeoDashboardStore`.
 */
export type AdminSeoDashboardStoreType = InstanceType<typeof AdminSeoDashboardStore>;
