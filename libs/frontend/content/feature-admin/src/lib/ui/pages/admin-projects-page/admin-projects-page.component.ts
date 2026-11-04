import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, type ParamMap } from '@angular/router';
import { type AdminProject, AdminProjectsStore } from '@vfortin/content-web-data-access/admin';
import {
  ConfirmDialogService,
  DATA_TABLE_INITIAL_STATE,
  type DataTableState,
  PAGE_HEADER_IMPORTS,
  ToastService,
} from '@vfortin/ui';
import { PROJECT_BULK_TEXTS } from '@internal/content-web-feature-admin/lib/constants/project-bulk-texts.constants';
import { PROJECT_TABLE_PAGE_SIZE } from '@internal/content-web-feature-admin/lib/constants/project-table-page-size.constants';
import type { ProjectBulkAction } from '@internal/content-web-feature-admin/lib/models/project-bulk-action/project-bulk-action.type';
import type { ProjectBulkRequest } from '@internal/content-web-feature-admin/lib/models/project-bulk-action/project-bulk-request.interface';
import type { ProjectBulkTexts } from '@internal/content-web-feature-admin/lib/models/project-bulk-action/project-bulk-texts.interface';
import { ProjectListToolbarComponent } from '@internal/content-web-feature-admin/lib/ui/components/project-list-toolbar/project-list-toolbar.component';
import { ProjectListDataviewComponent } from '@internal/content-web-feature-admin/lib/ui/dataviews/project-list-dataview/project-list-dataview.component';
import {
  projectTableQuery,
  projectTableState,
} from '@internal/content-web-feature-admin/lib/utils/project-table-query/project-table-query.utils';
import { visibleProjectCount } from '@internal/content-web-feature-admin/lib/utils/visible-project-count/visible-project-count.utils';
import {
  bulkTargets,
  changesPublicSite,
  projectCount,
} from '@internal/content-web-feature-admin/lib/utils/project-bulk/project-bulk.utils';
import { withSiteRebuildNotice } from '@internal/content-web-feature-admin/lib/utils/site-rebuild/site-rebuild.utils';

/**
 * Component AdminProjectsPageComponent
 * @class AdminProjectsPageComponent
 *
 * @description
 * Project list route: loads the collection into the project table, mirrors the table's search, facets,
 * sort and page in the query parameters (replacing the history entry, so that a reload and the way back
 * from the editor restore them), counts the kept projects in the title ("N sur M" while filtered), opens
 * the editor of an activated row, confirms unpublication (focus back on the row's menu button) and toasts
 * each request's outcome; after a version conflict it reloads the list and warns. A bulk action of
 * the selection bar keeps the eligible selected projects, confirms once when it changes the public
 * site, writes them one after the other (each with `If-Match` on its latest version), toasts the count
 * (a partial failure as a warning) and empties the selection, or keeps the failed projects selected.
 * A write that changes the public site carries the rebuild notice in its result toast, once per action.
 */
@Component({
  selector: 'content-admin-projects-page',
  imports: [PAGE_HEADER_IMPORTS, ProjectListDataviewComponent, ProjectListToolbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Fills the layout's main column, so that the table's selection bar rests at the bottom of the window.
  host: { class: 'flex flex-auto flex-col' },
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
   * Property route
   * @readonly
   *
   * @description
   * List route whose query parameters hold the table state.
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Writes the table state to the URL and opens the editor.
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property tableState
   * @readonly
   *
   * @description
   * Search, facets, sort, page and columns of the project table, first read from the URL.
   *
   * @type {WritableSignal<DataTableState>}
   */
  protected readonly tableState: WritableSignal<DataTableState> = signal<DataTableState>(
    projectTableState(this.route.snapshot.queryParamMap, {
      ...DATA_TABLE_INITIAL_STATE,
      pageSize: PROJECT_TABLE_PAGE_SIZE,
    }),
  );

  /**
   * Property selection
   * @readonly
   *
   * @description
   * Projects checked in the table.
   *
   * @type {WritableSignal<readonly AdminProject[]>}
   */
  protected readonly selection: WritableSignal<readonly AdminProject[]> = signal<
    readonly AdminProject[]
  >([]);

  /**
   * Property bulkRunning
   * @readonly
   *
   * @description
   * Whether a bulk action is writing; between two of its requests the store is briefly idle.
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly bulkRunning: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property shownCount
   * @readonly
   *
   * @description
   * Projects kept by the table's search and facets, shown as "N sur M" in the title; `null` while
   * nothing narrows the list.
   *
   * @type {Signal<number | null>}
   */
  protected readonly shownCount: Signal<number | null> = computed<number | null>(
    (): number | null => visibleProjectCount(this.store.projects(), this.tableState()),
  );

  /**
   * Property countLabel
   * @readonly
   *
   * @description
   * Visible count beside the title: "N sur M" while the table narrows the list, else the total; the
   * noun after it is read by screen readers only.
   *
   * @type {Signal<string>}
   */
  protected readonly countLabel: Signal<string> = computed<string>((): string => {
    const total: number = this.store.projects().length;
    const shown: number | null = this.shownCount();
    return shown === null
      ? String(total)
      : $localize`:@@admin.projects.count.filtered:${shown}:shown: sur ${total}:total:`;
  });

  /**
   * Property dataview
   * @readonly
   *
   * @description
   * Project table, asked to focus a row's menu button again after a confirmation.
   *
   * @type {Signal<ProjectListDataviewComponent | undefined>}
   */
  private readonly dataview: Signal<ProjectListDataviewComponent | undefined> = viewChild<
    ProjectListDataviewComponent | undefined
  >(ProjectListDataviewComponent);

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
   * Follows the query parameters (back, forward, links) and starts loading the project collection.
   */
  public constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params: ParamMap): void => {
      const next: DataTableState = projectTableState(params, this.tableState());
      // The URL written by `changeState` comes back here: keep the state as it is.
      if (!this.sameQuery(next, this.tableState())) this.tableState.set(next);
    });
    void this.load();
  }
  // #endregion

  // #region Methods
  /**
   * Method changeState
   * @method changeState
   *
   * @description
   * Keeps a table change and writes it to the query parameters, replacing the history entry.
   *
   * @param {DataTableState} state - New table state.
   */
  protected changeState(state: DataTableState): void {
    const previous: DataTableState = this.tableState();
    this.tableState.set(state);
    if (this.sameQuery(state, previous)) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: projectTableQuery(state),
      replaceUrl: true,
    });
  }

  /**
   * Method open
   * @method open
   *
   * @description
   * Opens the editor of an activated row.
   *
   * @param {AdminProject} project - Project of the row.
   */
  protected open(project: AdminProject): void {
    void this.router.navigate([project.id], { relativeTo: this.route });
  }

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
      this.toasts.success(
        $localize`:@@admin.projects.toast.published:« ${project.title.fr}:title: » publié.`,
        { description: withSiteRebuildNotice() },
      );
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
    // The catalogue's localized « Annuler » cancels.
    const confirmed: boolean = await this.confirmations.confirm({
      title: $localize`:@@admin.projects.unpublish.confirmTitle:Dépublier « ${project.title.fr}:title: » ?`,
      description: $localize`:@@admin.projects.unpublish.confirmDescription:Le projet repasse en brouillon et disparaît du site public à la prochaine reconstruction (quelques minutes).`,
      confirmLabel: $localize`:@@admin.projects.action.unpublish:Dépublier`,
      tone: 'danger',
      // The menu item that opened the dialog is gone: its row's menu button takes the focus back.
      restoreFocus: this.dataview()?.actionsTrigger(project) ?? null,
    });
    if (!confirmed) {
      return;
    }
    if (await this.store.unpublish(project)) {
      this.toasts.success(
        $localize`:@@admin.projects.toast.unpublished:« ${project.title.fr}:title: » retiré du site public.`,
        { description: withSiteRebuildNotice() },
      );
    } else {
      await this.reportFailure();
    }
  }

  /**
   * Method bulk
   * @method bulk
   *
   * @description
   * Runs a bulk action on the eligible selected projects, one request after the other, then toasts
   * the outcome; a version conflict reloads the list.
   *
   * @param {ProjectBulkRequest} request - Action and selection from the selection bar.
   *
   * @returns {Promise<void>} Completion after cancellation, or after the writes and any reload.
   */
  protected async bulk(request: ProjectBulkRequest): Promise<void> {
    if (this.bulkRunning() || this.store.writing()) return;
    const targets: AdminProject[] = bulkTargets(request.action, request.projects);
    if (targets.length === 0) return;
    const texts: ProjectBulkTexts = PROJECT_BULK_TEXTS[request.action];
    const publicChange: boolean = changesPublicSite(request.action, targets);
    if (publicChange) {
      const skipped: number = request.projects.length - targets.length;
      const subject: string =
        targets.length === 1
          ? $localize`:@@admin.projects.subject.title:« ${targets[0]?.title.fr}:title: »`
          : projectCount(targets.length);
      // The catalogue's localized « Annuler » cancels.
      const confirmed: boolean = await this.confirmations.confirm({
        title: texts.confirmTitle(subject),
        description:
          skipped > 0
            ? `${texts.confirmDescription} ${this.skippedText(skipped)}`
            : texts.confirmDescription,
        confirmLabel: texts.confirmLabel,
        tone: texts.tone,
      });
      if (!confirmed) return;
    }
    this.bulkRunning.set(true);
    const failed: AdminProject[] = [];
    let conflict: boolean = false;
    let message: string | null = null;
    try {
      for (const target of targets) {
        // The latest loaded version: an earlier write of this run may have replaced it.
        const current: AdminProject =
          this.store.projects().find((p: AdminProject): boolean => p.id === target.id) ?? target;
        if (await this.write(request.action, current)) continue;
        failed.push(current);
        if (this.store.conflict()) conflict = true;
        else message ??= this.store.writeError()?.message ?? null;
      }
    } finally {
      this.bulkRunning.set(false);
    }
    const kept: Set<string> = new Set(failed.map((p: AdminProject): string => p.id));
    // Only the projects actually written change the public site (a featured draft does not).
    const siteChanged: boolean = changesPublicSite(
      request.action,
      targets.filter((p: AdminProject): boolean => !kept.has(p.id)),
    );
    this.report(request.action, targets.length, failed.length, siteChanged, conflict, message);
    if (conflict) await this.load();
    this.selection.set(this.store.projects().filter((p: AdminProject): boolean => kept.has(p.id)));
  }

  /**
   * Method skippedText
   *
   * @description
   * Sentence naming the selected projects an action leaves unchanged.
   *
   * @param {number} count - Ineligible selected projects.
   *
   * @returns {string} Localized sentence.
   */
  private skippedText(count: number): string {
    return count < 2
      ? $localize`:@@admin.projects.bulk.skipped.one:${count}:count: projet sélectionné n'est pas concerné.`
      : $localize`:@@admin.projects.bulk.skipped.other:${count}:count: projets sélectionnés ne sont pas concernés.`;
  }

  /**
   * Method write
   *
   * @description
   * One request of a bulk action through the store.
   *
   * @param {ProjectBulkAction} action - Bulk action.
   * @param {AdminProject} project - Project in its latest loaded version.
   *
   * @returns {Promise<AdminProject | null>} Written project, or `null` on failure.
   */
  private write(action: ProjectBulkAction, project: AdminProject): Promise<AdminProject | null> {
    switch (action) {
      case 'publish':
        return this.store.publish(project);
      case 'unpublish':
        return this.store.unpublish(project);
      case 'feature':
        return this.store.feature(project, true);
      case 'unfeature':
        return this.store.feature(project, false);
    }
  }

  /**
   * Method report
   *
   * @description
   * Toasts a bulk action's outcome: success, partial failure (warning) or failure (error), with the
   * conflict reload or the first readable error as the description, followed by the rebuild notice
   * when the written projects changed the public site.
   *
   * @param {ProjectBulkAction} action - Bulk action.
   * @param {number} total - Projects attempted.
   * @param {number} failures - Projects whose request failed.
   * @param {boolean} siteChanged - Whether the written projects changed the public site.
   * @param {boolean} conflict - Whether a failure was a version conflict.
   * @param {string | null} message - First readable error of another failure.
   */
  private report(
    action: ProjectBulkAction,
    total: number,
    failures: number,
    siteChanged: boolean,
    conflict: boolean,
    message: string | null,
  ): void {
    const texts: ProjectBulkTexts = PROJECT_BULK_TEXTS[action];
    if (failures === 0) {
      this.toasts.success(
        `${texts.done(total)}.`,
        siteChanged ? { description: withSiteRebuildNotice() } : {},
      );
      return;
    }
    const reason: string = conflict
      ? $localize`:@@admin.projects.bulk.conflict:Un projet a été modifié entre-temps : la liste a été rechargée, recommencez.`
      : (message ?? $localize`:@@admin.projects.bulk.failed:La requête a échoué.`);
    const description: string =
      failures < 2
        ? $localize`:@@admin.projects.bulk.failures.one:1 échec : ${reason}:reason:`
        : $localize`:@@admin.projects.bulk.failures.other:${failures}:count: échecs : ${reason}:reason:`;
    if (failures === total) {
      this.toasts.error(
        total < 2
          ? $localize`:@@admin.projects.bulk.noneChanged.one:Aucun projet modifié sur ${total}:total:.`
          : $localize`:@@admin.projects.bulk.noneChanged.other:Aucun projet modifié sur ${total}:total:.`,
        { description },
      );
    } else {
      this.toasts.warning(`${texts.partial(total - failures, total)}.`, {
        description: siteChanged ? withSiteRebuildNotice(description) : description,
      });
    }
  }

  /**
   * Method sameQuery
   *
   * @description
   * Whether two table states write the same query parameters.
   *
   * @param {DataTableState} a - First state.
   * @param {DataTableState} b - Second state.
   *
   * @returns {boolean} Whether their URLs match.
   */
  private sameQuery(a: DataTableState, b: DataTableState): boolean {
    return JSON.stringify(projectTableQuery(a)) === JSON.stringify(projectTableQuery(b));
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
        $localize`:@@admin.projects.toast.conflict:Le projet a été modifié entre-temps : la liste a été rechargée, recommencez.`,
      );
      await this.load();
      return;
    }
    const error: { readonly message: string } | null | undefined = this.store.writeError();
    if (error) this.toasts.error(error.message);
  }
  // #endregion
}
