import { AdminPublicationSectionComponent } from '@internal/content-web-feature-admin/lib/ui/sections/admin-publication-section/admin-publication-section.component';
import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { lucideCircleAlert } from '@ng-icons/lucide';
import {
  type AdminTimelineEntry,
  AdminTimelineStore,
  type TimelineKind,
} from '@vfortin/content-web-data-access/admin';
import {
  AlertDescriptionDirective,
  AlertDirective,
  AlertTitleDirective,
  ButtonDirective,
  ConfirmDialogService,
  PAGE_HEADER_IMPORTS,
  SidebarTriggerComponent,
  ToastService,
} from '@vfortin/ui';
import { TIMELINE_KIND_TEXTS } from '@internal/content-web-feature-admin/lib/constants/timeline-kind-texts.constants';
import type { TimelineKindTexts } from '@internal/content-web-feature-admin/lib/models/timeline-kind-texts/timeline-kind-texts.interface';
import { TimelineListDataviewComponent } from '@internal/content-web-feature-admin/lib/ui/dataviews/timeline-list-dataview/timeline-list-dataview.component';
import { withSiteRebuildNotice } from '@internal/content-web-feature-admin/lib/utils/site-rebuild/site-rebuild.utils';
import {
  timelineCount,
  timelineDeleted,
  timelineFailures,
  timelineSingular,
} from '@internal/content-web-feature-admin/lib/utils/timeline-bulk/timeline-bulk.utils';
import { timelineDocumentTitle } from '@internal/content-web-feature-admin/lib/utils/timeline-document-title/timeline-document-title.utils';

/**
 * Component AdminTimelinePageComponent
 * @class AdminTimelinePageComponent
 *
 * @description
 * « Expériences » or « Formations » list route (the `kind` route data): loads the kind into its table,
 * most recent first (the public timeline places the entries by date, so the list offers no manual
 * order, D36 timeline selection revision), offers « Nouvelle expérience » / « Nouvelle formation » in
 * the page header (D43), opens the editor of an activated row, deletes after a danger confirmation
 * (focus back on the row's menu button), and toasts each outcome with the site rebuild notice. A
 * version conflict reloads the list and warns; a failed load stays an inline alert offering to retry.
 * The selection bar deletes the checked entries after one danger confirmation, one after the other,
 * each with its own version (every deletion answers the remaining list and its new version); one
 * toast gives the count, a partial failure as a warning that keeps the failed entries selected, and a
 * conflict reloads the list. Copy is French source with English targets; counts follow the plural
 * rules of the build locale.
 */
@Component({
  selector: 'content-admin-timeline-page',
  imports: [
    AdminPublicationSectionComponent,
    AlertDescriptionDirective,
    AlertDirective,
    AlertTitleDirective,
    ButtonDirective,
    NgIcon,
    PAGE_HEADER_IMPORTS,
    RouterLink,
    SidebarTriggerComponent,
    TimelineListDataviewComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-auto flex-col' },
  providers: [AdminTimelineStore],
  templateUrl: './admin-timeline-page.component.html',
})
export class AdminTimelinePageComponent {
  // #region Properties
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Kind listed by this route, from its `data`.
   *
   * @type {InputSignal<TimelineKind>}
   */
  public readonly kind: InputSignal<TimelineKind> = input.required<TimelineKind>();

  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped list state and commands.
   *
   * @type {InstanceType<typeof AdminTimelineStore>}
   */
  protected readonly store: InstanceType<typeof AdminTimelineStore> =
    inject<InstanceType<typeof AdminTimelineStore>>(AdminTimelineStore);

  /**
   * Property texts
   * @readonly
   *
   * @description
   * Copy of the kind.
   *
   * @type {Signal<TimelineKindTexts>}
   */
  protected readonly texts: Signal<TimelineKindTexts> = computed<TimelineKindTexts>(
    (): TimelineKindTexts => TIMELINE_KIND_TEXTS[this.kind()],
  );

  /**
   * Property countNoun
   * @readonly
   *
   * @description
   * Noun read after the header count by screen readers, singular or plural by the build locale.
   *
   * @type {Signal<string>}
   */
  protected readonly countNoun: Signal<string> = computed<string>((): string =>
    timelineSingular(this.store.entries().length, this.locale)
      ? this.texts().one
      : this.texts().many,
  );

  /**
   * Property loadFailed
   * @readonly
   *
   * @description
   * Whether the last load failed.
   *
   * @type {Signal<boolean>}
   */
  protected readonly loadFailed: Signal<boolean> = computed<boolean>(
    (): boolean => this.store.loadCallState().status === 'error',
  );

  /**
   * Property selection
   * @readonly
   *
   * @description
   * Entries checked in the table.
   *
   * @type {WritableSignal<readonly AdminTimelineEntry[]>}
   */
  protected readonly selection: WritableSignal<readonly AdminTimelineEntry[]> = signal<
    readonly AdminTimelineEntry[]
  >([]);

  /**
   * Property bulkRunning
   * @readonly
   *
   * @description
   * Whether a bulk deletion is writing; between two of its requests the store is briefly idle.
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly bulkRunning: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icon of the load alert.
   */
  protected readonly icons: { readonly error: typeof lucideCircleAlert } = {
    error: lucideCircleAlert,
  } as const;

  /**
   * Property dataview
   * @readonly
   *
   * @description
   * Table, asked for a row's controls to focus.
   *
   * @type {Signal<TimelineListDataviewComponent | undefined>}
   */
  private readonly dataview: Signal<TimelineListDataviewComponent | undefined> = viewChild<
    TimelineListDataviewComponent | undefined
  >(TimelineListDataviewComponent);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Opens the editor of a row.
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property route
   * @readonly
   *
   * @description
   * List route, base of the editor links.
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property confirmations
   * @readonly
   *
   * @description
   * Asks before a deletion.
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
   * Outcome of each request, through the admin layout's toaster.
   *
   * @type {ToastService}
   */
  private readonly toasts: ToastService = inject<ToastService>(ToastService);

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Build locale, whose plural rules choose the count messages.
   *
   * @type {string}
   */
  private readonly locale: string = inject<string>(LOCALE_ID);

  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Loads the kind of the route, again when a reused route changes it, and names the document.
   */
  public constructor() {
    const title: Title = inject<Title>(Title);
    effect((): void => {
      const kind: TimelineKind = this.kind();
      untracked((): void => {
        title.setTitle(timelineDocumentTitle(TIMELINE_KIND_TEXTS[kind].section));
        this.selection.set([]);
        void this.store.load(kind);
      });
    });
  }
  // #endregion

  // #region Methods
  /**
   * Method reload
   * @method reload
   *
   * @description
   * Loads the list again.
   *
   * @returns {Promise<void>} Completion after the load.
   */
  protected reload(): Promise<void> {
    return this.store.load(this.kind());
  }

  /**
   * Method open
   * @method open
   *
   * @description
   * Opens the editor of an activated row.
   *
   * @param {AdminTimelineEntry} entry - Entry of the row.
   */
  protected open(entry: AdminTimelineEntry): void {
    void this.router.navigate([entry.id], { relativeTo: this.route });
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Deletes an entry once confirmed.
   *
   * @param {AdminTimelineEntry} entry - Entry to delete.
   *
   * @returns {Promise<void>} Completion after the request.
   */
  protected async remove(entry: AdminTimelineEntry): Promise<void> {
    const confirmed: boolean = await this.confirmations.confirm({
      title: $localize`:@@admin.timeline.confirm.delete.title:Supprimer « ${entry.title.fr}:title: » ?`,
      description: $localize`:@@admin.timeline.confirm.delete.description:Elle disparaîtra du site public à la prochaine reconstruction (quelques minutes). Cette action est définitive.`,
      confirmLabel: $localize`:@@admin.timeline.action.delete:Supprimer`,
      cancelLabel: $localize`:@@admin.timeline.action.cancel:Annuler`,
      tone: 'danger',
      // The menu item that opened the dialog is gone: its row's menu button takes the focus back.
      restoreFocus: this.dataview()?.actionsTrigger(entry) ?? null,
    });
    if (!confirmed) return;
    if (await this.store.remove(entry)) {
      this.toasts.success(
        $localize`:@@admin.timeline.toast.deleted:« ${entry.title.fr}:title: » supprimée.`,
        {
          description: withSiteRebuildNotice(),
        },
      );
    } else {
      await this.reportFailure();
    }
  }

  /**
   * Method removeMany
   * @method removeMany
   *
   * @description
   * Confirms once (danger tone), then deletes the selected entries one after the other, each in its
   * latest loaded version, and toasts the count; the failed entries stay selected and a conflict
   * reloads the list. Nothing happens while a write is running or for an empty selection.
   *
   * @param {readonly AdminTimelineEntry[]} entries - Selected entries.
   *
   * @returns {Promise<void>} Completion after cancellation, or after the writes and any reload.
   */
  protected async removeMany(entries: readonly AdminTimelineEntry[]): Promise<void> {
    if (this.bulkRunning() || this.store.writing() || entries.length === 0) return;
    const texts: TimelineKindTexts = this.texts();
    const one: boolean = entries.length === 1;
    const confirmed: boolean = await this.confirmations.confirm({
      title: one
        ? $localize`:@@admin.timeline.confirm.delete.title:Supprimer « ${entries[0]?.title.fr}:title: » ?`
        : $localize`:@@admin.timeline.confirm.deleteMany.title:Supprimer ${timelineCount(texts, entries.length, this.locale)}:count: ?`,
      description: one
        ? $localize`:@@admin.timeline.confirm.delete.description:Elle disparaîtra du site public à la prochaine reconstruction (quelques minutes). Cette action est définitive.`
        : $localize`:@@admin.timeline.confirm.deleteMany.description:Elles disparaîtront du site public à la prochaine reconstruction (quelques minutes). Cette action est définitive.`,
      confirmLabel: $localize`:@@admin.timeline.action.delete:Supprimer`,
      cancelLabel: $localize`:@@admin.timeline.action.cancel:Annuler`,
      tone: 'danger',
    });
    if (!confirmed) return;
    this.bulkRunning.set(true);
    const failed: AdminTimelineEntry[] = [];
    let conflict: boolean = false;
    let message: string | null = null;
    try {
      for (const target of entries) {
        // The latest loaded version: each deletion answers the remaining list.
        const current: AdminTimelineEntry =
          this.store.entries().find((e: AdminTimelineEntry): boolean => e.id === target.id) ??
          target;
        if (await this.store.remove(current)) continue;
        failed.push(current);
        if (this.store.conflict()) conflict = true;
        else message ??= this.store.writeError()?.message ?? null;
      }
    } finally {
      this.bulkRunning.set(false);
    }
    this.reportRemoval(entries.length, failed.length, conflict, message);
    if (conflict) {
      await this.reload();
      this.store.resetWriteState();
    }
    const kept: Set<string> = new Set(failed.map((e: AdminTimelineEntry): string => e.id));
    this.selection.set(
      this.store.entries().filter((e: AdminTimelineEntry): boolean => kept.has(e.id)),
    );
  }

  /**
   * Method reportRemoval
   * @method reportRemoval
   *
   * @description
   * Toasts a bulk deletion: success, partial failure (warning) or failure (error), with the conflict
   * reload or the first readable error as the description, followed by the rebuild notice when at
   * least one entry left the list.
   *
   * @param {number} total - Entries attempted.
   * @param {number} failures - Entries whose deletion failed.
   * @param {boolean} conflict - Whether a failure was a version conflict.
   * @param {string | null} message - First readable error of another failure.
   */
  private reportRemoval(
    total: number,
    failures: number,
    conflict: boolean,
    message: string | null,
  ): void {
    const texts: TimelineKindTexts = this.texts();
    if (failures === 0) {
      this.toasts.success(`${timelineDeleted(texts, total, this.locale)}.`, {
        description: withSiteRebuildNotice(),
      });
      return;
    }
    const reason: string = conflict
      ? texts.listConflict
      : (message ?? $localize`:@@admin.timeline.toast.requestFailed:La requête a échoué.`);
    const description: string = $localize`:@@admin.timeline.toast.failureReason:${timelineFailures(failures, this.locale)}:failures: : ${reason}:reason:`;
    if (failures === total) {
      this.toasts.error(texts.noneDeleted(total), { description });
    } else {
      const deleted: string = timelineDeleted(texts, total - failures, this.locale);
      this.toasts.warning(
        $localize`:@@admin.timeline.toast.deletedOutOf:${deleted}:deleted: sur ${total}:total:.`,
        {
          description: withSiteRebuildNotice(description),
        },
      );
    }
  }

  /**
   * Method reportFailure
   * @method reportFailure
   *
   * @description
   * Reloads the list after a conflict and warns; toasts any other failure.
   *
   * @returns {Promise<void>} Completion after the reload.
   */
  private async reportFailure(): Promise<void> {
    if (this.store.conflict()) {
      this.toasts.warning(
        $localize`:@@admin.timeline.toast.listChanged:La liste a été modifiée entre-temps : elle a été rechargée, recommencez.`,
      );
      await this.reload();
      this.store.resetWriteState();
      return;
    }
    const error: { readonly message: string } | null = this.store.writeError();
    if (error) this.toasts.error(error.message);
  }
  // #endregion
}
