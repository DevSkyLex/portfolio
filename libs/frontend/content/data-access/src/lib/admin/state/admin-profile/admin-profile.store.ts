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
import type { AdminProfileState } from '@internal/content-web-data-access/lib/admin/state/admin-profile/models/admin-profile-state/admin-profile-state.interface';
import type { AdminProfile } from '@internal/content-web-data-access/lib/admin/models/admin-profile/admin-profile.interface';
import type { ProfileDraft } from '@internal/content-web-data-access/lib/admin/models/profile-draft/profile-draft.interface';
import { AdminSiteTextsApiService } from '@internal/content-web-data-access/lib/admin/services/admin-site-texts/admin-site-texts.service';
import { toProfileRevisionRequest } from '@internal/content-web-data-access/lib/admin/utils/site-texts-draft/site-texts-draft.utils';

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Nothing read, no call made.
 */
const INITIAL_STATE: AdminProfileState = {
  profile: null,
  loadCallState: idleCallState(),
  writeCallState: idleCallState(),
};

/**
 * Store AdminProfileStore
 *
 * @description
 * State of the « Informations » page, provided by the page: one read of the profile and its saves
 * with `If-Match` on the version last read or written; a 412 is `conflict`, offering a reload. A read
 * answered after a newer one, or after the page left, is ignored.
 */
export const AdminProfileStore = signalStore(
  withState<AdminProfileState>(INITIAL_STATE),
  withComputed((store) => ({
    loading: computed<boolean>((): boolean => store.loadCallState().status === 'pending'),
    writing: computed<boolean>((): boolean => store.writeCallState().status === 'pending'),
    conflict: computed<boolean>((): boolean => store.writeCallState().error?.status === 412),
    writeError: computed(() => store.writeCallState().error),
  })),
  withMethods(
    (
      store,
      api: AdminSiteTextsApiService = inject<AdminSiteTextsApiService>(AdminSiteTextsApiService),
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
        async load(): Promise<AdminProfile | null> {
          const generation: number = ++readGeneration;
          patchState(store, { loadCallState: pendingCallState() });
          try {
            const profile: AdminProfile = await firstValueFrom(api.profile());
            if (generation !== readGeneration) return null;
            patchState(store, { profile, loadCallState: successCallState() });
            return profile;
          } catch (error) {
            if (generation === readGeneration)
              patchState(store, { loadCallState: errorCallState(toStoreError(error)) });
            return null;
          }
        },
        async save(draft: ProfileDraft): Promise<AdminProfile | null> {
          const current: AdminProfile | null = store.profile();
          if (current === null || store.writing()) return null;
          patchState(store, { writeCallState: pendingCallState() });
          try {
            const profile: AdminProfile = await firstValueFrom(
              api.reviseProfile(current, toProfileRevisionRequest(draft)),
            );
            patchState(store, { profile, writeCallState: successCallState() });
            return profile;
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
 * Type AdminProfileStoreType
 * @type AdminProfileStoreType
 *
 * @description
 * Instance type of `AdminProfileStore`.
 */
export type AdminProfileStoreType = InstanceType<typeof AdminProfileStore>;
