import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import type {
  ConnectedApplication,
  ConnectedApplicationsResponse,
} from '@vfortin/identity-contracts';
import {
  type CallState,
  type StoreError,
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
} from '@vfortin/web-http';
import { firstValueFrom } from 'rxjs';
import { OAuthApiService } from '@internal/identity-web-data-access/lib/services/oauth-api/oauth-api.service';
import { toOAuthError } from '@internal/identity-web-data-access/lib/utils/oauth-error/oauth-error.utils';

/**
 * Interface ConnectedApplicationsState
 * @interface ConnectedApplicationsState
 *
 * @description
 * Section-scoped state of « Applications connectées ».
 */
export interface ConnectedApplicationsState {
  // #region Properties
  /** Consented clients, `null` until the first answer. */
  readonly applications: readonly ConnectedApplication[] | null;
  /** List read. */
  readonly loadCallState: CallState;
  /** Revocation. */
  readonly revokeCallState: CallState;
  /** Application being revoked, `null` otherwise. */
  readonly revokingId: string | null;
  // #endregion
}

/** Unknown list and idle calls. */
const INITIAL_STATE: ConnectedApplicationsState = {
  applications: null,
  loadCallState: idleCallState(),
  revokeCallState: idleCallState(),
  revokingId: null,
};

/** Code answered when the application was revoked elsewhere: the list is read again. */
const NOT_FOUND_CODE: string = 'identity.oauth-application-not-found';

/**
 * Constant ConnectedApplicationsStore
 *
 * @description
 * State of the « Applications connectées » section of the security page (D45): the consented MCP
 * clients and their revocation, one at a time. A revoked application leaves the list at once; a
 * revocation answered 404 reloads it. Provided by the section.
 */
export const ConnectedApplicationsStore = signalStore(
  withState<ConnectedApplicationsState>(INITIAL_STATE),
  withComputed((store) => ({
    loading: computed<boolean>(() => store.loadCallState().status === 'pending'),
    revoking: computed<boolean>(() => store.revokeCallState().status === 'pending'),
  })),
  withMethods((store, api: OAuthApiService = inject<OAuthApiService>(OAuthApiService)) => {
    // Incremented by every read: only the latest one projects its answer.
    let latestRead: number = 0;

    /** Reads the list, ignoring an answer once a newer read started. */
    const load = async (): Promise<void> => {
      const read: number = ++latestRead;
      patchState(store, { loadCallState: pendingCallState() });
      try {
        const answer: ConnectedApplicationsResponse = await firstValueFrom(api.applications());
        if (read === latestRead) {
          patchState(store, { applications: answer.items, loadCallState: successCallState() });
        }
      } catch (error: unknown) {
        if (read === latestRead)
          patchState(store, { loadCallState: errorCallState(toOAuthError(error)) });
      }
    };

    return {
      load,

      /**
       * Revokes one application. Resolves `true` once revoked, `false` on a failure (in
       * `revokeCallState`) or while another revocation runs.
       */
      async revoke(id: string): Promise<boolean> {
        if (store.revoking()) return false;
        patchState(store, { revokeCallState: pendingCallState(), revokingId: id });
        try {
          await firstValueFrom(api.revoke(id));
          latestRead++;
          patchState(store, {
            applications: (store.applications() ?? []).filter(
              (application: ConnectedApplication): boolean => application.id !== id,
            ),
            revokeCallState: successCallState(),
            revokingId: null,
          });
          return true;
        } catch (error: unknown) {
          const failure: StoreError = toOAuthError(error);
          patchState(store, { revokeCallState: errorCallState(failure), revokingId: null });
          if (failure.code === NOT_FOUND_CODE) void load();
          return false;
        }
      },
    };
  }),
);

/**
 * Type ConnectedApplicationsStoreType
 * @type ConnectedApplicationsStoreType
 *
 * @description
 * Instance type of the section-provided store.
 */
export type ConnectedApplicationsStoreType = InstanceType<typeof ConnectedApplicationsStore>;
