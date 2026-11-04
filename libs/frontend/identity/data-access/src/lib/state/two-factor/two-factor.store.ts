import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import type {
  TwoFactorDisableRequest,
  TwoFactorSetupResponse,
  TwoFactorStatusResponse,
} from '@vfortin/identity-contracts';
import {
  type StoreError,
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
} from '@vfortin/web-http';
import { firstValueFrom } from 'rxjs';
import { TwoFactorApiService } from '@internal/identity-web-data-access/lib/services/two-factor-api/two-factor-api.service';
import type { TwoFactorState } from '@internal/identity-web-data-access/lib/state/two-factor/models/two-factor-state.interface';
import { toTwoFactorError } from '@internal/identity-web-data-access/lib/utils/two-factor-error/two-factor-error.utils';

/** Unknown status and idle calls; the pending secret never enters the store. */
const INITIAL_STATE: TwoFactorState = {
  enabled: null,
  loadCallState: idleCallState(),
  setupCallState: idleCallState(),
  enableCallState: idleCallState(),
  disableCallState: idleCallState(),
};

/** Code answered when the server state differs from the page's (409): the status is read again. */
const TOTP_STATE_CODE: string = 'identity.totp-state';

/**
 * Constant TwoFactorStore
 *
 * @description
 * Page-scoped state of the "Sécurité" administration page (D17): the second-factor status and one
 * named call state per command. Failures are normalized by `toTwoFactorError` so that the page can
 * place a wrong password or code on its field; a 409 reloads the status. Writes do not overlap, and a
 * status read started before a write cannot overwrite the state that write established.
 */
export const TwoFactorStore = signalStore(
  withState<TwoFactorState>(INITIAL_STATE),
  withComputed((store) => ({
    loading: computed<boolean>(() => store.loadCallState().status === 'pending'),
    writing: computed<boolean>(
      () =>
        store.setupCallState().status === 'pending' ||
        store.enableCallState().status === 'pending' ||
        store.disableCallState().status === 'pending',
    ),
  })),
  withMethods(
    (store, api: TwoFactorApiService = inject<TwoFactorApiService>(TwoFactorApiService)) => {
      // Incremented by every read and accepted write: only the latest one projects `enabled`.
      let version: number = 0;
      // Incremented by every read: only the latest one projects `loadCallState`.
      let latestRead: number = 0;

      /** Reads the status, ignoring the answer once a newer read or write has started. */
      const load = async (): Promise<void> => {
        const read: number = ++latestRead;
        const ticket: number = ++version;
        patchState(store, { loadCallState: pendingCallState() });
        try {
          const status: TwoFactorStatusResponse = await firstValueFrom(api.status());
          if (ticket === version) patchState(store, { enabled: status.enabled });
          if (read === latestRead) patchState(store, { loadCallState: successCallState() });
        } catch (error: unknown) {
          if (read === latestRead)
            patchState(store, { loadCallState: errorCallState(toTwoFactorError(error)) });
        }
      };

      /** Normalizes a write failure and resynchronizes the status after a state conflict. */
      const failed = (error: unknown): StoreError => {
        const failure: StoreError = toTwoFactorError(error);
        if (failure.code === TOTP_STATE_CODE) void load();
        return failure;
      };

      return {
        load,

        /**
         * Confirms the password and returns the new pending secret to the caller, which shows it once.
         * Resolves `null` on a failure (in `setupCallState`) or while another command runs.
         */
        async setup(password: string): Promise<TwoFactorSetupResponse | null> {
          if (store.writing()) return null;
          patchState(store, { setupCallState: pendingCallState() });
          try {
            const material: TwoFactorSetupResponse = await firstValueFrom(api.setup({ password }));
            patchState(store, { setupCallState: successCallState() });
            return material;
          } catch (error: unknown) {
            patchState(store, { setupCallState: errorCallState(failed(error)) });
            return null;
          }
        },

        /**
         * Activates the pending secret. Resolves `true` once enabled, `false` on a failure (in
         * `enableCallState`) or while another command runs.
         */
        async enable(totp: string): Promise<boolean> {
          if (store.writing()) return false;
          patchState(store, { enableCallState: pendingCallState() });
          try {
            const status: TwoFactorStatusResponse = await firstValueFrom(api.enable({ totp }));
            version++;
            patchState(store, { enabled: status.enabled, enableCallState: successCallState() });
            return true;
          } catch (error: unknown) {
            patchState(store, { enableCallState: errorCallState(failed(error)) });
            return false;
          }
        },

        /**
         * Removes the second factor with both factors. Resolves `true` once disabled, `false` on a
         * failure (in `disableCallState`) or while another command runs.
         */
        async disable(request: TwoFactorDisableRequest): Promise<boolean> {
          if (store.writing()) return false;
          patchState(store, { disableCallState: pendingCallState() });
          try {
            const status: TwoFactorStatusResponse = await firstValueFrom(api.disable(request));
            version++;
            patchState(store, { enabled: status.enabled, disableCallState: successCallState() });
            return true;
          } catch (error: unknown) {
            patchState(store, { disableCallState: errorCallState(failed(error)) });
            return false;
          }
        },

        /** Forgets the outcome of the previous dialog before a new one opens. */
        resetCommands(): void {
          if (store.writing()) return;
          patchState(store, {
            setupCallState: idleCallState(),
            enableCallState: idleCallState(),
            disableCallState: idleCallState(),
          });
        },
      };
    },
  ),
);

/**
 * Type TwoFactorStoreType
 * @type TwoFactorStoreType
 *
 * @description
 * Instance type of the page-provided second-factor store.
 */
export type TwoFactorStoreType = InstanceType<typeof TwoFactorStore>;
