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
import type { AdminProject } from '@internal/content-web-data-access/lib/admin/models/admin-project/admin-project.type';
import type { AdminProjectsState } from '@internal/content-web-data-access/lib/admin/state/admin-projects/models/admin-projects-state/admin-projects-state.interface';
import type { ProjectDraft } from '@internal/content-web-data-access/lib/admin/models/project-draft/project-draft.interface';
import {
  toProjectDraft,
  toRevisionRequest,
} from '@internal/content-web-data-access/lib/admin/utils/project-draft/project-draft.utils';
import { AdminProjectsApiService } from '@internal/content-web-data-access/lib/admin/services/admin-projects/admin-projects.service';

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Empty project collection with both asynchronous call states idle.
 *
 * @type {AdminProjectsState}
 */
const INITIAL_STATE: AdminProjectsState = {
  projects: [],
  loadCallState: idleCallState(),
  writeCallState: idleCallState(),
};

/**
 * Constant AdminProjectsStore
 *
 * @description
 * Page-scoped SignalStore for project listing, editing, publication, and request status.
 *
 * @type {typeof AdminProjectsStore}
 */
export const AdminProjectsStore = signalStore(
  withState<AdminProjectsState>(INITIAL_STATE),
  withComputed((store) => ({
    loading: computed<boolean>((): boolean => store.loadCallState().status === 'pending'),
    writing: computed<boolean>((): boolean => store.writeCallState().status === 'pending'),
    /**
     * Property conflict
     * @readonly
     *
     * @description
     * Whether the latest write failed because the project version is stale (HTTP 412).
     *
     * @type {Signal<boolean>}
     */
    conflict: computed<boolean>((): boolean => store.writeCallState().error?.status === 412),
    writeError: computed(() => store.writeCallState().error),
  })),
  withMethods(
    (
      store,
      api: AdminProjectsApiService = inject<AdminProjectsApiService>(AdminProjectsApiService),
    ) => {
      let readGeneration: number = 0;

      /**
       * Function replace
       *
       * @description
       * Adds or replaces the returned project in the collection and marks the latest write successful.
       *
       * @param {AdminProject} project - Project returned by a successful write.
       *
       * @returns {void} Updates the store state in place.
       */
      const replace: (project: AdminProject) => void = (project: AdminProject): void =>
        patchState(store, {
          projects: store.projects().some((p: AdminProject): boolean => p.id === project.id)
            ? store
                .projects()
                .map((p: AdminProject): AdminProject => (p.id === project.id ? project : p))
            : [...store.projects(), project],
          writeCallState: successCallState(),
        });

      /**
       * Function write
       *
       * @description
       * Runs one project write with pending/success/error state transitions and returns `null` after normalizing a request failure.
       *
       * @param {Observable<AdminProject>} call - HTTP operation that returns the updated project.
       *
       * @returns {Promise<AdminProject | null>} Updated project or `null` when the observable errors.
       */
      const write: (call: Observable<AdminProject>) => Promise<AdminProject | null> = async (
        call: Observable<AdminProject>,
      ): Promise<AdminProject | null> => {
        patchState(store, { writeCallState: pendingCallState() });
        try {
          const project: AdminProject = await firstValueFrom(call);
          replace(project);
          return project;
        } catch (error) {
          patchState(store, { writeCallState: errorCallState(toStoreError(error)) });
          return null;
        }
      };

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
            const projects: AdminProject[] = await firstValueFrom(api.list());
            if (generation !== readGeneration) return;
            patchState(store, {
              projects,
              loadCallState: successCallState(),
            });
          } catch (error) {
            if (generation === readGeneration)
              patchState(store, { loadCallState: errorCallState(toStoreError(error)) });
          }
        },
        async loadOne(id: string): Promise<AdminProject | null> {
          const generation: number = ++readGeneration;
          patchState(store, { loadCallState: pendingCallState() });
          try {
            const project: AdminProject = await firstValueFrom(api.get(id));
            if (generation !== readGeneration) return null;
            patchState(store, {
              projects: store
                .projects()
                .some((item: AdminProject): boolean => item.id === project.id)
                ? store
                    .projects()
                    .map((item: AdminProject): AdminProject =>
                      item.id === project.id ? project : item,
                    )
                : [...store.projects(), project],
              loadCallState: successCallState(),
            });
            return project;
          } catch (error) {
            if (generation === readGeneration)
              patchState(store, { loadCallState: errorCallState(toStoreError(error)) });
            return null;
          }
        },
        /**
         * Method create
         *
         * @description
         * Adds the draft as a new project, appended to the collection on success.
         *
         * @param {ProjectDraft} draft - Form values of the new project.
         *
         * @returns {Promise<AdminProject | null>} Created project, or `null` on failure.
         */
        create(draft: ProjectDraft): Promise<AdminProject | null> {
          return write(api.create(toRevisionRequest(draft)));
        },
        save(project: AdminProject, draft: ProjectDraft): Promise<AdminProject | null> {
          return write(api.revise(project.id, project.version, toRevisionRequest(draft)));
        },
        publish(project: AdminProject): Promise<AdminProject | null> {
          return write(api.publish(project.id, project.version));
        },
        unpublish(project: AdminProject): Promise<AdminProject | null> {
          return write(api.unpublish(project.id, project.version));
        },
        /**
         * Method feature
         *
         * @description
         * Sets the home-page feature of a project through a revision of its own current values
         * (`If-Match` on its version), the editor's round trip; status and position are kept (D36).
         *
         * @param {AdminProject} project - Project in its latest loaded version.
         * @param {boolean} featured - Wanted feature.
         *
         * @returns {Promise<AdminProject | null>} Revised project, or `null` on failure.
         */
        feature(project: AdminProject, featured: boolean): Promise<AdminProject | null> {
          return write(
            api.revise(
              project.id,
              project.version,
              toRevisionRequest({ ...toProjectDraft(project), featured }),
            ),
          );
        },
      };
    },
  ),
);

/**
 * Type AdminProjectsStoreType
 * @type AdminProjectsStoreType
 *
 * @description
 * Instance type exposing the project SignalStore state, computed selectors, and page commands.
 *
 * @type {InstanceType<typeof AdminProjectsStore>}
 */
export type AdminProjectsStoreType = InstanceType<typeof AdminProjectsStore>;
