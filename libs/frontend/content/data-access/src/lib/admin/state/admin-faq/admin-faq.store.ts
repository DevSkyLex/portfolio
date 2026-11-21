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
import type { AdminFaqEntry } from '@internal/content-web-data-access/lib/admin/models/admin-faq-entry/admin-faq-entry.interface';
import type { AdminFaqList } from '@internal/content-web-data-access/lib/admin/models/admin-faq-list/admin-faq-list.interface';
import type { FaqEntryDraft } from '@internal/content-web-data-access/lib/admin/models/faq-entry-draft/faq-entry-draft.interface';
import { AdminFaqApiService } from '@internal/content-web-data-access/lib/admin/services/admin-faq/admin-faq.service';
import type { AdminFaqState } from '@internal/content-web-data-access/lib/admin/state/admin-faq/models/admin-faq-state/admin-faq-state.interface';
import { toFaqEntryRequest } from '@internal/content-web-data-access/lib/admin/utils/faq-entry-draft/faq-entry-draft.utils';

/**
 * Constant INITIAL_STATE
 *
 * @description
 * No list loaded, both call states idle.
 *
 * @type {AdminFaqState}
 */
const INITIAL_STATE: AdminFaqState = {
  version: 0,
  entries: [],
  loadCallState: idleCallState(),
  writeCallState: idleCallState(),
};

/**
 * Constant AdminFaqStore
 *
 * @description
 * Page-scoped SignalStore of the « FAQ » administration: the questions by position and the list
 * version, the entry an editor loads, creations, saves and deletions with the entry version in
 * `If-Match`, and reorders with the list version (the public FAQ follows this order, unlike the
 * timeline). A move shows at once and is rolled back when the API refuses it; `conflict` flags a 412.
 *
 * @type {typeof AdminFaqStore}
 */
export const AdminFaqStore = signalStore(
  withState<AdminFaqState>(INITIAL_STATE),
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
  withMethods((store, api: AdminFaqApiService = inject<AdminFaqApiService>(AdminFaqApiService)) => {
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
    const write: <T>(call: Observable<T>, apply: (result: T) => void) => Promise<T | null> = async <
      T,
    >(
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
     * Stores a list answer and its version.
     *
     * @param {AdminFaqList} list - List answered by the API.
     *
     * @returns {void} Updates the state.
     */
    const replaceList: (list: AdminFaqList) => void = (list: AdminFaqList): void =>
      patchState(store, { version: list.version, entries: list.entries });

    /**
     * Function replaceEntry
     *
     * @description
     * Replaces an entry answered by the API in place, or appends a new one (a creation goes last).
     *
     * @param {AdminFaqEntry} entry - Entry answered by the API.
     *
     * @returns {void} Updates the state.
     */
    const replaceEntry: (entry: AdminFaqEntry) => void = (entry: AdminFaqEntry): void =>
      patchState(store, {
        entries: store.entries().some((item: AdminFaqEntry): boolean => item.id === entry.id)
          ? store
              .entries()
              .map((item: AdminFaqEntry): AdminFaqEntry => (item.id === entry.id ? entry : item))
          : [...store.entries(), entry],
      });

    return {
      cancelRead(): void {
        readGeneration++;
        patchState(store, { loadCallState: idleCallState() });
      },
      resetWriteState(): void {
        if (!store.writing()) patchState(store, { writeCallState: idleCallState() });
      },
      async load(): Promise<void> {
        const generation: number = ++readGeneration;
        patchState(store, { loadCallState: pendingCallState() });
        try {
          const list: AdminFaqList = await firstValueFrom(api.list());
          if (generation !== readGeneration) return;
          replaceList(list);
          patchState(store, { loadCallState: successCallState() });
        } catch (error) {
          if (generation === readGeneration)
            patchState(store, { loadCallState: errorCallState(toStoreError(error)) });
        }
      },
      async loadOne(id: string): Promise<AdminFaqEntry | null> {
        const generation: number = ++readGeneration;
        patchState(store, { loadCallState: pendingCallState() });
        try {
          const entry: AdminFaqEntry = await firstValueFrom(api.get(id));
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
      create(draft: FaqEntryDraft): Promise<AdminFaqEntry | null> {
        return write(api.create(toFaqEntryRequest(draft)), replaceEntry);
      },
      save(entry: AdminFaqEntry, draft: FaqEntryDraft): Promise<AdminFaqEntry | null> {
        return write(api.revise(entry, toFaqEntryRequest(draft)), replaceEntry);
      },
      remove(entry: AdminFaqEntry): Promise<AdminFaqList | null> {
        return write(api.remove(entry), replaceList);
      },
      /**
       * Method move
       *
       * @description
       * Moves a question from one position to another: the list shows the new order at once, the
       * API stores it with the list version, and a refusal restores the previous order.
       *
       * @param {number} from - Current position.
       * @param {number} to - Wanted position.
       *
       * @returns {Promise<AdminFaqList | null>} Reordered list, or `null` when nothing moved or
       * after a normalized failure.
       */
      async move(from: number, to: number): Promise<AdminFaqList | null> {
        const before: readonly AdminFaqEntry[] = store.entries();
        if (store.writing() || from === to || !before[from] || to < 0 || to >= before.length)
          return null;
        const next: AdminFaqEntry[] = [...before];
        const [moved] = next.splice(from, 1);
        if (moved) next.splice(to, 0, moved);
        patchState(store, { entries: next });
        const ids: string[] = next.map((entry: AdminFaqEntry): string => entry.id);
        const result: AdminFaqList | null = await write(
          api.reorder(store.version(), ids),
          replaceList,
        );
        if (!result) patchState(store, { entries: before });
        return result;
      },
    };
  }),
);

/**
 * Type AdminFaqStoreType
 * @type AdminFaqStoreType
 *
 * @description
 * Instance type of the FAQ SignalStore.
 *
 * @type {InstanceType<typeof AdminFaqStore>}
 */
export type AdminFaqStoreType = InstanceType<typeof AdminFaqStore>;
