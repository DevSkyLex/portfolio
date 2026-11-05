import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import type { PublicationStatusDto } from '@vfortin/content-contracts';
import {
  type CallState,
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@vfortin/web-http';
import { firstValueFrom } from 'rxjs';
import { AdminPublicationApiService } from '@internal/content-web-data-access/lib/admin/services/admin-publication/admin-publication.service';

/** Page-scoped publication status; obsolete reads cannot overwrite an accepted publication. */
export const AdminPublicationStore = signalStore(
  withState<{
    publication: PublicationStatusDto | null;
    loadCallState: CallState;
    writeCallState: CallState;
  }>({ publication: null, loadCallState: idleCallState(), writeCallState: idleCallState() }),
  withComputed((store) => ({
    loading: computed<boolean>((): boolean => store.loadCallState().status === 'pending'),
    writing: computed<boolean>((): boolean => store.writeCallState().status === 'pending'),
    conflict: computed<boolean>((): boolean => store.writeCallState().error?.status === 412),
  })),
  withMethods(
    (
      store,
      api: AdminPublicationApiService = inject<AdminPublicationApiService>(
        AdminPublicationApiService,
      ),
    ) => {
      let generation: number = 0;
      return {
        cancelRead(): void {
          generation++;
        },
        async load(): Promise<void> {
          if (store.writing()) return;
          const current: number = ++generation;
          patchState(store, { loadCallState: pendingCallState() });
          try {
            const publication: PublicationStatusDto = await firstValueFrom(api.status());
            if (current !== generation) return;
            patchState(store, {
              publication,
              loadCallState: successCallState(),
              writeCallState: idleCallState(),
            });
          } catch (error) {
            if (current === generation)
              patchState(store, { loadCallState: errorCallState(toStoreError(error)) });
          }
        },
        async change(action: 'start' | 'publish'): Promise<PublicationStatusDto | null> {
          const current: PublicationStatusDto | null = store.publication();
          if (current === null || store.writing()) return null;
          generation++;
          patchState(store, { writeCallState: pendingCallState(), loadCallState: idleCallState() });
          try {
            const publication: PublicationStatusDto = await firstValueFrom(
              api[action](current.version),
            );
            patchState(store, { publication, writeCallState: successCallState() });
            return publication;
          } catch (error) {
            patchState(store, { writeCallState: errorCallState(toStoreError(error)) });
            return null;
          }
        },
      };
    },
  ),
);

/** Instance type of the page-scoped publication store. */
export type AdminPublicationStoreType = InstanceType<typeof AdminPublicationStore>;
