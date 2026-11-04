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
import type { AdminLegalState } from '@internal/content-web-data-access/lib/admin/state/admin-legal/models/admin-legal-state/admin-legal-state.interface';
import type { AdminLegalDocument } from '@internal/content-web-data-access/lib/admin/models/admin-legal-document/admin-legal-document.interface';
import type { ArticleDocumentDraft } from '@internal/content-web-data-access/lib/admin/models/article-document/article-document-draft.interface';
import type { LegalDocumentKind } from '@internal/content-web-data-access/lib/admin/models/legal-document-kind/legal-document-kind.type';
import { AdminSiteTextsApiService } from '@internal/content-web-data-access/lib/admin/services/admin-site-texts/admin-site-texts.service';
import { toLegalDocumentRevisionRequest } from '@internal/content-web-data-access/lib/admin/utils/site-texts-draft/site-texts-draft.utils';

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Nothing read, no call made.
 */
const INITIAL_STATE: AdminLegalState = {
  documents: null,
  loadCallState: idleCallState(),
  writeCallState: idleCallState(),
  writeKind: null,
};

/**
 * Store AdminLegalStore
 *
 * @description
 * State of the « Légal » page, provided by the page: one read of the legal notice and the privacy
 * policy, and the save of either with `If-Match` on its version; a 412 is `conflict` for the document
 * saved (`writeKind`), offering to reload it alone. A read answered after a newer one, or after the
 * page left, is ignored.
 */
export const AdminLegalStore = signalStore(
  withState<AdminLegalState>(INITIAL_STATE),
  withComputed((store) => ({
    loading: computed<boolean>((): boolean => store.loadCallState().status === 'pending'),
    writing: computed<boolean>((): boolean => store.writeCallState().status === 'pending'),
    conflict: computed<LegalDocumentKind | null>((): LegalDocumentKind | null =>
      store.writeCallState().error?.status === 412 ? store.writeKind() : null,
    ),
    writeError: computed(() => store.writeCallState().error),
  })),
  withMethods(
    (
      store,
      api: AdminSiteTextsApiService = inject<AdminSiteTextsApiService>(AdminSiteTextsApiService),
    ) => {
      let readGeneration: number = 0;
      const replace: (document: AdminLegalDocument) => void = (
        document: AdminLegalDocument,
      ): void => {
        const documents: Readonly<Record<LegalDocumentKind, AdminLegalDocument>> | null =
          store.documents();
        if (documents)
          patchState(store, { documents: { ...documents, [document.kind]: document } });
      };
      return {
        cancelRead(): void {
          readGeneration++;
          patchState(store, { loadCallState: idleCallState() });
        },
        resetWriteState(): void {
          if (!store.writing())
            patchState(store, { writeCallState: idleCallState(), writeKind: null });
        },
        async load(): Promise<Readonly<Record<LegalDocumentKind, AdminLegalDocument>> | null> {
          const generation: number = ++readGeneration;
          patchState(store, { loadCallState: pendingCallState() });
          try {
            const [notice, privacy] = await Promise.all([
              firstValueFrom(api.legal('notice')),
              firstValueFrom(api.legal('privacy')),
            ]);
            if (generation !== readGeneration) return null;
            const documents: Readonly<Record<LegalDocumentKind, AdminLegalDocument>> = {
              notice,
              privacy,
            };
            patchState(store, { documents, loadCallState: successCallState() });
            return documents;
          } catch (error) {
            if (generation === readGeneration)
              patchState(store, { loadCallState: errorCallState(toStoreError(error)) });
            return null;
          }
        },
        async reload(kind: LegalDocumentKind): Promise<AdminLegalDocument | null> {
          if (store.writing()) return null;
          try {
            const document: AdminLegalDocument = await firstValueFrom(api.legal(kind));
            replace(document);
            patchState(store, { writeCallState: idleCallState(), writeKind: null });
            return document;
          } catch (error) {
            patchState(store, {
              writeCallState: errorCallState(toStoreError(error)),
              writeKind: kind,
            });
            return null;
          }
        },
        async save(
          kind: LegalDocumentKind,
          body: Readonly<{ fr: ArticleDocumentDraft; en: ArticleDocumentDraft }>,
        ): Promise<AdminLegalDocument | null> {
          const current: AdminLegalDocument | undefined = store.documents()?.[kind];
          if (current === undefined || store.writing()) return null;
          patchState(store, { writeCallState: pendingCallState(), writeKind: kind });
          try {
            const document: AdminLegalDocument = await firstValueFrom(
              api.reviseLegal(current, toLegalDocumentRevisionRequest(body)),
            );
            replace(document);
            patchState(store, { writeCallState: successCallState() });
            return document;
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
 * Type AdminLegalStoreType
 * @type AdminLegalStoreType
 *
 * @description
 * Instance type of `AdminLegalStore`.
 */
export type AdminLegalStoreType = InstanceType<typeof AdminLegalStore>;
