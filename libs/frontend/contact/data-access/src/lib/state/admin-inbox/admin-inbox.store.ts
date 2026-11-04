import type { AdminMessagePage } from '@internal/contact-web-data-access/lib/models/admin-message/admin-message-page.interface';
import { AdminInboxSummaryService } from '@internal/contact-web-data-access/lib/services/admin-inbox-summary/admin-inbox-summary.service';
import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  type StoreError,
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@vfortin/web-http';
import { type Observable, firstValueFrom } from 'rxjs';
import { INBOX_PAGE_SIZE } from '@internal/contact-web-data-access/lib/constants/admin-messages.constants';
import type { AdminMessage } from '@internal/contact-web-data-access/lib/models/admin-message/admin-message.type';
import type { AdminMessageStatus } from '@internal/contact-web-data-access/lib/models/admin-message/admin-message-status.type';
import { AdminMessagesApiService } from '@internal/contact-web-data-access/lib/services/admin-messages/admin-messages.service';
import type { AdminInboxState } from '@internal/contact-web-data-access/lib/state/admin-inbox/models/admin-inbox-state.interface';

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Inbox starts on the first page of every message (no status filter) with no loaded rows, no known overall count and
 * no active calls.
 *
 * @type {AdminInboxState}
 */
const INITIAL_STATE: AdminInboxState = {
  status: null,
  page: 1,
  messages: [],
  total: 0,
  allTotal: null,
  loadCallState: idleCallState(),
  writeCallState: idleCallState(),
  countCallState: idleCallState(),
};

/**
 * Constant AdminInboxStore
 *
 * @description
 * Provides inbox filters, paginated messages, loading state, and optimistic write operations to the
 * administration page that owns the store instance.
 */
export const AdminInboxStore = signalStore(
  withState<AdminInboxState>(INITIAL_STATE),
  withComputed(
    (
      store,
      summary: AdminInboxSummaryService = inject<AdminInboxSummaryService>(
        AdminInboxSummaryService,
      ),
    ) => ({
      loading: computed<boolean>(() => store.loadCallState().status === 'pending'),
      // Owner unread count shared with the sidebar: null while unknown or failed, never a false zero.
      unread: computed<number | null>(() => summary.count()),
      writing: computed<boolean>(() => store.writeCallState().status === 'pending'),
      pages: computed<number>(() => Math.max(1, Math.ceil(store.total() / INBOX_PAGE_SIZE))),
      error: computed<StoreError | null>(
        () => store.writeCallState().error ?? store.loadCallState().error,
      ),
      // A 412 on a write means another session changed the message first (If-Match).
      conflict: computed<boolean>(() => store.writeCallState().error?.status === 412),
      // Rows kept on screen although they no longer match the filter (a message read on "Non lus").
      outdated: computed<number>(() => {
        const status: AdminMessageStatus | null = store.status();
        return status === null ? 0 : store.messages().filter((m) => m.status !== status).length;
      }),
    }),
  ),
  withMethods(
    (
      store,
      api: AdminMessagesApiService = inject<AdminMessagesApiService>(AdminMessagesApiService),
      summary: AdminInboxSummaryService = inject<AdminInboxSummaryService>(
        AdminInboxSummaryService,
      ),
    ) => {
      /**
       * Variable generation
       *
       * @description
       * Monotonic request version used to discard stale list results after a newer load starts.
       *
       * @type {number}
       */
      let generation: number = 0;
      /**
       * Variable countGeneration
       *
       * @description
       * Monotonic version of the overall count, so an older count never overwrites a newer figure
       * (another count, or the total of an unfiltered list).
       *
       * @type {number}
       */
      let countGeneration: number = 0;
      /**
       * Function countAll
       *
       * @description
       * Counts the messages of every status for the page heading; a failure keeps the last known figure.
       *
       * @returns {Promise<void>} Resolves once the count is applied or its failure recorded.
       */
      const countAll = async (): Promise<void> => {
        const ticket: number = ++countGeneration;
        patchState(store, { countCallState: pendingCallState() });
        try {
          const allTotal: number = await firstValueFrom(api.countAll());
          if (ticket !== countGeneration) return;
          patchState(store, { allTotal, countCallState: successCallState() });
        } catch (error: unknown) {
          if (ticket !== countGeneration) return;
          patchState(store, { countCallState: errorCallState(toStoreError(error)) });
        }
      };
      /**
       * Function load
       *
       * @description
       * Loads the active page and applies only the newest response. If the last message leaves the final
       * page, it moves to the preceding valid page and reloads; current failures become load call state.
       * A filtered load also counts every status while that figure is unknown; an unfiltered list gives
       * it directly.
       *
       * @returns {Promise<void>} Resolves after the current load or corrective reload completes.
       */
      const load = async (): Promise<void> => {
        const ticket: number = ++generation;
        patchState(store, { loadCallState: pendingCallState() });
        const counting: boolean = store.countCallState().status === 'pending';
        if (store.status() !== null && store.allTotal() === null && !counting) void countAll();
        try {
          const list: AdminMessagePage = await firstValueFrom(
            api.list(store.status(), store.page()),
          );
          if (ticket !== generation) return;
          const last: number = Math.max(1, Math.ceil(list.totalItems / INBOX_PAGE_SIZE));
          if (list.member.length === 0 && store.page() > last) {
            // The last message of the last page was archived or deleted: show the page before it.
            patchState(store, { page: last });
            await load();
            return;
          }
          patchState(store, {
            messages: list.member,
            total: list.totalItems,
            loadCallState: successCallState(),
          });
          if (store.status() === null) {
            // The unfiltered total is the overall count: fence any count still in flight.
            countGeneration++;
            patchState(store, { allTotal: list.totalItems, countCallState: successCallState() });
          }
        } catch (error: unknown) {
          if (ticket !== generation) return;
          patchState(store, { loadCallState: errorCallState(toStoreError(error)) });
        }
      };

      /**
       * Function write
       *
       * @description
       * Runs a mutation, stores its normalized outcome, then reloads the active page so conflicts and
       * successful changes both display authoritative server state.
       *
       * @param {Observable<unknown>} call - API mutation observable to execute.
       *
       * @returns {Promise<void>} Resolves after the mutation and following list reload complete.
       */
      const write = async (call: Observable<unknown>): Promise<void> => {
        patchState(store, { writeCallState: pendingCallState() });
        try {
          await firstValueFrom(call);
          patchState(store, { writeCallState: successCallState() });
          summary.invalidate();
        } catch (error: unknown) {
          patchState(store, { writeCallState: errorCallState(toStoreError(error)) });
        }

        // The list is reloaded in every case: a conflict (412) shows the actual state.
        await load();
      };

      return {
        load,
        async filter(status: AdminMessageStatus | null): Promise<void> {
          patchState(store, { status, page: 1, writeCallState: idleCallState() });
          await load();
        },
        async goTo(page: number): Promise<void> {
          patchState(store, { page: Math.min(Math.max(1, page), store.pages()) });
          await load();
        },
        /**
         * Marks a message read and replaces its row in place with the server's answer (new status and
         * version) instead of reloading, so a message read on "Non lus" stays under the reader until
         * the next load (`outdated` counts such rows). A 412 reloads the page to show the actual state.
         *
         * @param {AdminMessage} message - Received message, with the version sent in `If-Match`.
         *
         * @returns {Promise<void>} Resolves once the row is replaced, or the failure recorded.
         */
        async markRead(message: AdminMessage): Promise<void> {
          patchState(store, { writeCallState: pendingCallState() });
          try {
            const read: AdminMessage = await firstValueFrom(api.transition(message, 'read'));
            patchState(store, {
              messages: store.messages().map((m) => (m.id === read.id ? read : m)),
              writeCallState: successCallState(),
            });
            summary.invalidate();
          } catch (error: unknown) {
            patchState(store, { writeCallState: errorCallState(toStoreError(error)) });
            if (store.conflict()) await load();
          }
        },
        archive: (message: AdminMessage): Promise<void> =>
          write(api.transition(message, 'archive')),
        async remove(message: AdminMessage): Promise<void> {
          await write(api.remove(message));
          // An unfiltered reload has already counted; read and archive never change the overall count.
          if (store.writeCallState().status === 'success' && store.status() !== null) {
            void countAll();
          }
        },
      };
    },
  ),
);

/**
 * Type AdminInboxStoreType
 * @type AdminInboxStoreType
 *
 * @description
 * Instance type inferred from the inbox SignalStore factory for typed dependency injection.
 *
 * @type {InstanceType<typeof AdminInboxStore>}
 */
export type AdminInboxStoreType = InstanceType<typeof AdminInboxStore>;
