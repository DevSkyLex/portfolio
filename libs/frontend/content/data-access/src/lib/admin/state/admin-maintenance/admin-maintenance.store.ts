import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@vfortin/web-http';
import { firstValueFrom } from 'rxjs';
import type { AdminMaintenance } from '@internal/content-web-data-access/lib/admin/models/admin-maintenance/admin-maintenance.interface';
import type { MaintenanceDraft } from '@internal/content-web-data-access/lib/admin/models/maintenance-draft/maintenance-draft.interface';
import { AdminMaintenanceApiService } from '@internal/content-web-data-access/lib/admin/services/admin-maintenance/admin-maintenance.service';
import type { AdminMaintenanceState } from '@internal/content-web-data-access/lib/admin/state/admin-maintenance/models/admin-maintenance-state/admin-maintenance-state.interface';
import { toMaintenanceRequest } from '@internal/content-web-data-access/lib/admin/utils/maintenance-draft/maintenance-draft.utils';

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Nothing read, no call made.
 */
const INITIAL_STATE: AdminMaintenanceState = {
  setting: null,
  loadCallState: idleCallState(),
  writeCallState: idleCallState(),
};

/**
 * Store AdminMaintenanceStore
 *
 * @description
 * State of the « Maintenance » page, provided by the page: one read of the setting and its saves with
 * `If-Match` on the version last read or written; a 412 is `conflict`, offering a reload. A read
 * answered after a newer one, or after the page left, is ignored.
 */
export const AdminMaintenanceStore = signalStore(
  withState<AdminMaintenanceState>(INITIAL_STATE),
  withComputed((store) => ({
    loading: computed<boolean>((): boolean => store.loadCallState().status === 'pending'),
    writing: computed<boolean>((): boolean => store.writeCallState().status === 'pending'),
    conflict: computed<boolean>((): boolean => store.writeCallState().error?.status === 412),
    writeError: computed(() => store.writeCallState().error),
  })),
  withMethods(
    (
      store,
      api: AdminMaintenanceApiService = inject<AdminMaintenanceApiService>(
        AdminMaintenanceApiService,
      ),
    ) => {
      let readGeneration: number = 0;
      return {
        cancelRead(): void {
          readGeneration++;
          patchState(store, { loadCallState: idleCallState() });
        },
        resetWriteState(): void {
          if (!store.writing()) patchState(store, { writeCallState: idleCallState() });
        },
        async load(): Promise<AdminMaintenance | null> {
          const generation: number = ++readGeneration;
          patchState(store, { loadCallState: pendingCallState() });
          try {
            const setting: AdminMaintenance = await firstValueFrom(api.get());
            if (generation !== readGeneration) return null;
            patchState(store, { setting, loadCallState: successCallState() });
            return setting;
          } catch (error) {
            if (generation === readGeneration)
              patchState(store, { loadCallState: errorCallState(toStoreError(error)) });
            return null;
          }
        },
        async save(draft: MaintenanceDraft): Promise<AdminMaintenance | null> {
          const current: AdminMaintenance | null = store.setting();
          if (current === null || store.writing()) return null;
          patchState(store, { writeCallState: pendingCallState() });
          try {
            const setting: AdminMaintenance = await firstValueFrom(
              api.revise(current, toMaintenanceRequest(draft)),
            );
            patchState(store, { setting, writeCallState: successCallState() });
            return setting;
          } catch (error) {
            patchState(store, { writeCallState: errorCallState(toStoreError(error)) });
            return null;
          }
        },
      };
    },
  ),
);

/**
 * Type AdminMaintenanceStoreType
 * @type AdminMaintenanceStoreType
 *
 * @description
 * Instance type of `AdminMaintenanceStore`.
 */
export type AdminMaintenanceStoreType = InstanceType<typeof AdminMaintenanceStore>;
