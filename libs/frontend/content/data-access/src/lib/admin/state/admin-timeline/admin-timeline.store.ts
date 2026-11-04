import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@vfortin/web-http';
import { type Observable, firstValueFrom } from 'rxjs';
import type { AdminTimelineEntry } from '@internal/content-web-data-access/lib/admin/models/admin-timeline-entry/admin-timeline-entry.interface';
import type { AdminTimelineList } from '@internal/content-web-data-access/lib/admin/models/admin-timeline-list/admin-timeline-list.interface';
import type { TimelineEntryDraft } from '@internal/content-web-data-access/lib/admin/models/timeline-entry-draft/timeline-entry-draft.interface';
import type { TimelineKind } from '@internal/content-web-data-access/lib/admin/models/timeline-kind/timeline-kind.type';
import { AdminTimelineApiService } from '@internal/content-web-data-access/lib/admin/services/admin-timeline/admin-timeline.service';
import type { AdminTimelineState } from '@internal/content-web-data-access/lib/admin/state/admin-timeline/models/admin-timeline-state/admin-timeline-state.interface';
import { toTimelineEntryRequest } from '@internal/content-web-data-access/lib/admin/utils/timeline-entry-draft/timeline-entry-draft.utils';
import { timelineByRecency } from '@internal/content-web-data-access/lib/admin/utils/timeline-order/timeline-order.utils';

/**
 * Constant INITIAL_STATE
 *
 * @description
 * No list loaded, both call states idle.
 *
 * @type {AdminTimelineState}
 */
const INITIAL_STATE: AdminTimelineState = {
  kind: null,
  version: 0,
  entries: [],
  loadCallState: idleCallState(),
  writeCallState: idleCallState(),
};

/**
 * Constant AdminTimelineStore
 *
 * @description
 * Page-scoped SignalStore of the « Expériences » and « Formations » administration: one kind's list
 * and its version, kept most recent first (`timelineByRecency`, D36 timeline selection revision: the
 * public timeline places the entries by date, so no manual order is offered), the entry an editor
 * loads, and creations, saves and deletions with the entry version in `If-Match` (`conflict` on a
 * 412).
 *
 * @type {typeof AdminTimelineStore}
 */
export const AdminTimelineStore = signalStore(
  withState<AdminTimelineState>(INITIAL_STATE),
  withComputed((store) => ({
    loading: computed<boolean>((): boolean => store.loadCallState().status === 'pending'),
    writing: computed<boolean>((): boolean => store.writeCallState().status === 'pending'),
    /**
     * Property conflict
     * @readonly
     *
     * @description
     * Whether the latest write failed on a stale entry or list version (HTTP 412).
     *
     * @type {Signal<boolean>}
     */
    conflict: computed<boolean>((): boolean => store.writeCallState().error?.status === 412),
    writeError: computed(() => store.writeCallState().error),
  })),
  withMethods(
    (
      store,
      api: AdminTimelineApiService = inject<AdminTimelineApiService>(AdminTimelineApiService),
    ) => {
      let readGeneration: number = 0;

      /**
       * Function write
       *
       * @description
       * Runs one write with pending/success/error transitions; `apply` stores its answer.
       *
       * @param {Observable<T>} call - HTTP write.
       * @param {(result: T) => void} apply - State update of a successful answer.
       *
       * @returns {Promise<T | null>} Answer, or `null` after a normalized failure.
       */
      const write: <T>(
        call: Observable<T>,
        apply: (result: T) => void,
      ) => Promise<T | null> = async <T>(
        call: Observable<T>,
        apply: (result: T) => void,
      ): Promise<T | null> => {
        patchState(store, { writeCallState: pendingCallState() });
        try {
          const result: T = await firstValueFrom(call);
          apply(result);
          patchState(store, { writeCallState: successCallState() });
          return result;
        } catch (error) {
          patchState(store, { writeCallState: errorCallState(toStoreError(error)) });
          return null;
        }
      };

      /**
       * Function replaceList
       *
       * @description
       * Stores a list answer and its version, the entries most recent first.
       *
       * @param {AdminTimelineList} list - List answered by the API.
       *
       * @returns {void} Updates the state.
       */
      const replaceList: (list: AdminTimelineList) => void = (list: AdminTimelineList): void =>
        patchState(store, {
          kind: list.kind,
          version: list.version,
          entries: timelineByRecency(list.entries),
        });

      /**
       * Function replaceEntry
       *
       * @description
       * Adds or replaces an entry answered by the API, in its place by date (a save may change it).
       *
       * @param {AdminTimelineEntry} entry - Entry answered by the API.
       *
       * @returns {void} Updates the state.
       */
      const replaceEntry: (entry: AdminTimelineEntry) => void = (entry: AdminTimelineEntry): void =>
        patchState(store, {
          entries: timelineByRecency(
            store.entries().some((item: AdminTimelineEntry): boolean => item.id === entry.id)
              ? store
                  .entries()
                  .map((item: AdminTimelineEntry): AdminTimelineEntry =>
                    item.id === entry.id ? entry : item,
                  )
              : [...store.entries(), entry],
          ),
        });

      return {
        cancelRead(): void {
          readGeneration++;
          patchState(store, { loadCallState: idleCallState() });
        },
        resetWriteState(): void {
          if (!store.writing()) patchState(store, { writeCallState: idleCallState() });
        },
        async load(kind: TimelineKind): Promise<void> {
          const generation: number = ++readGeneration;
          patchState(store, { loadCallState: pendingCallState() });
          try {
            const list: AdminTimelineList = await firstValueFrom(api.list(kind));
            if (generation !== readGeneration) return;
            replaceList(list);
            patchState(store, { loadCallState: successCallState() });
          } catch (error) {
            if (generation === readGeneration)
              patchState(store, { loadCallState: errorCallState(toStoreError(error)) });
          }
        },
        async loadOne(kind: TimelineKind, id: string): Promise<AdminTimelineEntry | null> {
          const generation: number = ++readGeneration;
          patchState(store, { loadCallState: pendingCallState() });
          try {
            const entry: AdminTimelineEntry = await firstValueFrom(api.get(kind, id));
            if (generation !== readGeneration) return null;
            replaceEntry(entry);
            patchState(store, { loadCallState: successCallState() });
            return entry;
          } catch (error) {
            if (generation === readGeneration)
              patchState(store, { loadCallState: errorCallState(toStoreError(error)) });
            return null;
          }
        },
        create(kind: TimelineKind, draft: TimelineEntryDraft): Promise<AdminTimelineEntry | null> {
          return write(api.create(kind, toTimelineEntryRequest(draft)), replaceEntry);
        },
        save(
          entry: AdminTimelineEntry,
          draft: TimelineEntryDraft,
        ): Promise<AdminTimelineEntry | null> {
          return write(api.revise(entry, toTimelineEntryRequest(draft)), replaceEntry);
        },
        remove(entry: AdminTimelineEntry): Promise<AdminTimelineList | null> {
          return write(api.remove(entry), replaceList);
        },
      };
    },
  ),
);

/**
 * Type AdminTimelineStoreType
 * @type AdminTimelineStoreType
 *
 * @description
 * Instance type of the timeline SignalStore.
 *
 * @type {InstanceType<typeof AdminTimelineStore>}
 */
export type AdminTimelineStoreType = InstanceType<typeof AdminTimelineStore>;
