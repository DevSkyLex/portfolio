import type { ProjectGroup } from '@internal/content-web-feature-admin/lib/models/project-group/project-group.interface';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideFolderOpen, lucideInfo } from '@ng-icons/lucide';
import { type AdminProject, AdminProjectsStore } from '@vfortin/content-web-data-access/admin';
import { ConfirmDialogService, EMPTY_IMPORTS, SkeletonDirective, ToastService } from '@vfortin/ui';
import type { ProjectView } from '@internal/content-web-feature-admin/lib/models/project-view/project-view.type';
import { ProjectListToolbarComponent } from '@internal/content-web-feature-admin/lib/ui/components/project-list-toolbar/project-list-toolbar.component';
import { ProjectListDataviewComponent } from '@internal/content-web-feature-admin/lib/ui/dataviews/project-list-dataview/project-list-dataview.component';
import { groupProjects } from '@internal/content-web-feature-admin/lib/utils/group-projects/group-projects.utils';

/**
 * Component AdminProjectsPageComponent
 * @class AdminProjectsPageComponent
 *
 * @description
 * Project list route: loads the collection, filters it from the title bar, confirms unpublication and
 * toasts each request's outcome; after a version conflict it reloads the list and warns.
 */
@Component({
  selector: 'content-admin-projects-page',
  imports: [
    EMPTY_IMPORTS,
    NgIcon,
    ProjectListDataviewComponent,
    ProjectListToolbarComponent,
    SkeletonDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AdminProjectsStore],
  templateUrl: './admin-projects-page.component.html',
})
export class AdminProjectsPageComponent {
  // #region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped project state and commands, released with this route component.
   *
   * @type {InstanceType<typeof AdminProjectsStore>}
   */
  protected readonly store: InstanceType<typeof AdminProjectsStore> =
    inject<InstanceType<typeof AdminProjectsStore>>(AdminProjectsStore);

  /**
   * Property view
   * @readonly
   *
   * @description
   * Status filter in use; the list keeps all projects loaded and only hides groups.
   */
  protected readonly view: WritableSignal<ProjectView> = signal<ProjectView>('all');

  /**
   * Property query
   * @readonly
   *
   * @description
   * Search typed in the title bar.
   */
  protected readonly query: WritableSignal<string> = signal<string>('');

  /**
   * Property groups
   * @readonly
   *
   * @description
   * Projects grouped by status within the search and filter, without empty groups.
   */
  protected readonly groups: Signal<ProjectGroup[]> = computed<ProjectGroup[]>((): ProjectGroup[] =>
    groupProjects(this.store.projects(), this.query(), this.view()),
  );

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the rebuild note and the empty state.
   */
  protected readonly icons: {
    readonly empty: typeof lucideFolderOpen;
    readonly info: typeof lucideInfo;
  } = {
    empty: lucideFolderOpen,
    info: lucideInfo,
  } as const;

  /**
   * Property confirmations
   * @readonly
   *
   * @description
   * Asks before unpublishing.
   *
   * @type {ConfirmDialogService}
   */
  private readonly confirmations: ConfirmDialogService =
    inject<ConfirmDialogService>(ConfirmDialogService);

  /**
   * Property toasts
   * @readonly
   *
   * @description
   * Announces each request's outcome through the toaster of the admin layout.
   *
   * @type {ToastService}
   */
  private readonly toasts: ToastService = inject<ToastService>(ToastService);
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Starts loading the project collection when the route page is created.
   */
  public constructor() {
    void this.load();
  }
  // #endregion

  // #region Methods
  /**
   * Method publish
   * @method publish
   *
   * @description
   * Publishes the project and toasts the outcome; a version conflict reloads the collection.
   *
   * @param {AdminProject} project - Row selected for publication.
   *
   * @returns {Promise<void>} Completion after the write and any conflict reload.
   */
  protected async publish(project: AdminProject): Promise<void> {
    if (await this.store.publish(project)) {
      this.toasts.success(`« ${project.title.fr} » publié.`, {
        description: 'Le site public sera reconstruit dans quelques minutes.',
      });
    } else {
      await this.reportFailure();
    }
  }

  /**
   * Method unpublish
   * @method unpublish
   *
   * @description
   * Confirms (danger tone), unpublishes the project and toasts the outcome; a version conflict reloads
   * the collection.
   *
   * @param {AdminProject} project - Row selected for unpublication.
   *
   * @returns {Promise<void>} Completion after cancellation, or after the write and any conflict reload.
   */
  protected async unpublish(project: AdminProject): Promise<void> {
    const confirmed: boolean = await this.confirmations.confirm({
      title: `Dépublier « ${project.title.fr} » ?`,
      description:
        'Le projet repasse en brouillon et disparaît du site public à la prochaine reconstruction (quelques minutes).',
      confirmLabel: 'Dépublier',
      cancelLabel: 'Annuler',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }
    if (await this.store.unpublish(project)) {
      this.toasts.success(`« ${project.title.fr} » retiré du site public.`);
    } else {
      await this.reportFailure();
    }
  }

  /**
   * Method load
   *
   * @description
   * Loads the collection and toasts the readable message when the request fails.
   *
   * @returns {Promise<void>} Completion after the load attempt.
   */
  private async load(): Promise<void> {
    await this.store.load();
    const error: { readonly message: string } | null | undefined = this.store.loadCallState().error;
    if (error) this.toasts.error(error.message);
  }

  /**
   * Method reportFailure
   *
   * @description
   * After a failed write, reloads the list and warns on a version conflict, otherwise toasts the
   * readable error message.
   *
   * @returns {Promise<void>} Completion after the toast and any reload.
   */
  private async reportFailure(): Promise<void> {
    if (this.store.conflict()) {
      this.toasts.warning(
        'Le projet a été modifié entre-temps : la liste a été rechargée, recommencez.',
      );
      await this.load();
      return;
    }
    const error: { readonly message: string } | null | undefined = this.store.writeError();
    if (error) this.toasts.error(error.message);
  }
  // #endregion
}
