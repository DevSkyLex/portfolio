import type { AdminProject } from '@internal/content-web-data-access/lib/admin/models/admin-project/admin-project.type';

import { Injectable, inject, signal, type WritableSignal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  idleCallState,
  pendingCallState,
  successCallState,
  errorCallState,
  toStoreError,
  type CallState,
} from '@vfortin/web-http';
import { AdminProjectsApiService } from '@internal/content-web-data-access/lib/admin/services/admin-projects/admin-projects.service';
import type { AdminProjectNavigationPort } from '@internal/content-web-data-access/lib/ports/admin-project-navigation/admin-project-navigation.port';
import type { AdminProjectNavigationItem } from '@internal/content-web-data-access/lib/ports/admin-project-navigation/models/admin-project-navigation-item.interface';

/**
 * Service AdminProjectNavigationService
 *
 * @description
 * Content-owned adapter that maps transport projects into shell navigation projections.
 */
@Injectable({ providedIn: 'root' })
export class AdminProjectNavigationService implements AdminProjectNavigationPort {
  // #region Properties
  /**
   * Property api
   *
   * @description
   * Owner HTTP transport kept behind the published contract.
   */
  private readonly api: AdminProjectsApiService =
    inject<AdminProjectsApiService>(AdminProjectsApiService);

  /**
   * Property items
   *
   * @description
   * Transport-independent navigation items from the latest successful refresh.
   */
  public readonly items: WritableSignal<readonly AdminProjectNavigationItem[]> = signal<
    readonly AdminProjectNavigationItem[]
  >([]);

  /**
   * Property callState
   *
   * @description
   * Named load lifecycle and normalized failure exposed to capability consumers.
   */
  public readonly callState: WritableSignal<CallState> = signal<CallState>(idleCallState());

  /**
   * Property generation
   *
   * @description
   * Version that fences obsolete read results.
   */
  private generation: number = 0;
  // #endregion

  // #region Methods
  /**
   * Method refresh
   *
   * @description
   * Reloads the latest projection and records failures without inventing a zero result.
   */
  public async refresh(): Promise<void> {
    const ticket: number = ++this.generation;
    this.callState.set(pendingCallState());
    try {
      const projects: AdminProject[] = await firstValueFrom(this.api.list());
      if (ticket !== this.generation) return;
      this.items.set(
        projects.map(
          (
            project: AdminProject,
          ): {
            id: string;
            label: string;
            keywords: string[];
            path: string;
            status: 'draft' | 'published';
          } => ({
            id: project.id,
            label: project.title.fr,
            keywords: [project.slug, project.title.en ?? ''],
            path: '/admin/projects/' + encodeURIComponent(project.id),
            status: project.status,
          }),
        ),
      );
      this.callState.set(successCallState());
    } catch (error) {
      if (ticket !== this.generation) return;
      this.items.set([]);
      this.callState.set(errorCallState(toStoreError(error)));
    }
  }
  // #endregion
}
