import { AdminPublicationSectionComponent } from '@internal/content-web-feature-admin/lib/ui/sections/admin-publication-section/admin-publication-section.component';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
  type InputSignal,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideChevronRight,
  lucideCircleAlert,
  lucideTrash2,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
import {
  type AdminTimelineEntry,
  type AdminTimelineList,
  AdminTimelineApiService,
  AdminTimelineStore,
  type TimelineKind,
  emptyTimelineEntryDraft,
  toTimelineEntryDraft,
} from '@vfortin/content-web-data-access/admin';
import {
  AlertDescriptionDirective,
  AlertDirective,
  AlertTitleDirective,
  ButtonDirective,
  ConfirmDialogService,
  PAGE_HEADER_IMPORTS,
  SidebarTriggerComponent,
  SkeletonDirective,
  ToastService,
} from '@vfortin/ui';
import { PROJECT_EDITOR_NARROW_QUERY } from '@internal/content-web-feature-admin/lib/constants/project-editor-layout.constants';
import { TIMELINE_KIND_TEXTS } from '@internal/content-web-feature-admin/lib/constants/timeline-kind-texts.constants';
import type { TimelineKindTexts } from '@internal/content-web-feature-admin/lib/models/timeline-kind-texts/timeline-kind-texts.interface';
import type { TimelineEntryFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/timeline-entry-form/models/timeline-entry-form-values.model';
import { TimelineEntryFormComponent } from '@internal/content-web-feature-admin/lib/ui/forms/timeline-entry-form/timeline-entry-form.component';
import { timelineDocumentTitle } from '@internal/content-web-feature-admin/lib/utils/timeline-document-title/timeline-document-title.utils';
import { timelinePeriod } from '@internal/content-web-feature-admin/lib/utils/timeline-period/timeline-period.utils';
import { withSiteRebuildNotice } from '@internal/content-web-feature-admin/lib/utils/site-rebuild/site-rebuild.utils';
import { timelinePlaces } from '@internal/content-web-feature-admin/lib/utils/timeline-places/timeline-places.utils';
import { type Subscription, forkJoin } from 'rxjs';

/**
 * Component AdminTimelineEditPageComponent
 * @class AdminTimelineEditPageComponent
 *
 * @description
 * Editor of an education or experience entry, or of a new one on the `new` route, built like the
 * project editor (D36, D43): a 48 px bar back to the list, a page header with the title, period and
 * version, « Supprimer » and the FR/EN tabs, the form's language panels, and the shared period and
 * technologies in a properties panel beside them (below them under 1180 px). Saves with `If-Match`
 * (Ctrl/Cmd+S, the save bar), creates then moves to the new entry's address, deletes after a danger
 * confirmation, asks before leaving a dirty form and toasts each outcome; a version conflict stays an
 * inline alert offering to reload, a missing entry (404) links back to the list. Copy is French source
 * with English targets.
 */
@Component({
  selector: 'content-admin-timeline-edit-page',
  imports: [
    AdminPublicationSectionComponent,
    AlertDescriptionDirective,
    AlertDirective,
    AlertTitleDirective,
    ButtonDirective,
    NgIcon,
    NgTemplateOutlet,
    PAGE_HEADER_IMPORTS,
    RouterLink,
    SidebarTriggerComponent,
    SkeletonDirective,
    TimelineEntryFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AdminTimelineStore],
  host: {
    class: 'flex min-h-dvh flex-col',
    '(window:keydown.control.s)': 'shortcut($event)',
    '(window:keydown.meta.s)': 'shortcut($event)',
    '(window:beforeunload)': 'beforeUnload($event)',
  },
  templateUrl: './admin-timeline-edit-page.component.html',
})
export class AdminTimelineEditPageComponent {
  // #region Properties
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Kind of the route, from its `data`.
   *
   * @type {InputSignal<TimelineKind>}
   */
  public readonly kind: InputSignal<TimelineKind> = input.required<TimelineKind>();

  /**
   * Property id
   * @readonly
   *
   * @description
   * Entry identifier from the route; absent on the `new` route.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly id: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped entry state and commands.
   *
   * @type {InstanceType<typeof AdminTimelineStore>}
   */
  protected readonly store: InstanceType<typeof AdminTimelineStore> =
    inject<InstanceType<typeof AdminTimelineStore>>(AdminTimelineStore);

  /**
   * Property entry
   * @readonly
   *
   * @description
   * Entry as last loaded or written, `null` before a load or while creating.
   *
   * @type {WritableSignal<AdminTimelineEntry | null>}
   */
  protected readonly entry: WritableSignal<AdminTimelineEntry | null> =
    signal<AdminTimelineEntry | null>(null);

  /**
   * Property creating
   * @readonly
   *
   * @description
   * Whether the page creates an entry.
   *
   * @type {Signal<boolean>}
   */
  protected readonly creating: Signal<boolean> = computed<boolean>((): boolean => !this.id());

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
   * Property values
   * @readonly
   *
   * @description
   * Form values: the loaded entry's, an empty draft while creating, `null` before a load.
   *
   * @type {Signal<TimelineEntryFormValues | null>}
   */
  protected readonly values: Signal<TimelineEntryFormValues | null> =
    computed<TimelineEntryFormValues | null>((): TimelineEntryFormValues | null => {
      const entry: AdminTimelineEntry | null = this.entry();
      if (entry) return toTimelineEntryDraft(entry);
      return this.creating() ? emptyTimelineEntryDraft() : null;
    });

  /**
   * Property period
   * @readonly
   *
   * @description
   * Period of the loaded entry for the header meta line.
   *
   * @type {Signal<string>}
   */
  protected readonly period: Signal<string> = computed<string>((): string => {
    const entry: AdminTimelineEntry | null = this.entry();
    return entry ? timelinePeriod(entry.start, entry.end) : '';
  });

  /**
   * Property narrow
   * @readonly
   *
   * @description
   * Whether the properties go below the form (under 1180 px).
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly narrow: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the bar, the header and the alerts.
   */
  protected readonly icons: {
    readonly back: typeof lucideArrowLeft;
    readonly chevron: typeof lucideChevronRight;
    readonly conflict: typeof lucideTriangleAlert;
    readonly error: typeof lucideCircleAlert;
    readonly remove: typeof lucideTrash2;
  } = {
    back: lucideArrowLeft,
    chevron: lucideChevronRight,
    conflict: lucideTriangleAlert,
    error: lucideCircleAlert,
    remove: lucideTrash2,
  } as const;

  /**
   * Property form
   * @readonly
   *
   * @description
   * Entry form, once values exist.
   *
   * @type {Signal<TimelineEntryFormComponent | undefined>}
   */
  private readonly form: Signal<TimelineEntryFormComponent | undefined> = viewChild<
    TimelineEntryFormComponent | undefined
  >(TimelineEntryFormComponent);

  /**
   * Property dirty
   * @readonly
   *
   * @description
   * Whether the form holds unsaved changes.
   *
   * @type {Signal<boolean>}
   */
  protected readonly dirty: Signal<boolean> = computed<boolean>(
    (): boolean => this.form()?.dirty() ?? false,
  );

  /**
   * Property settings
   * @readonly
   *
   * @description
   * Period and technologies of the form, rendered in the properties panel.
   *
   * @type {Signal<TemplateRef<unknown> | null>}
   */
  protected readonly settings: Signal<TemplateRef<unknown> | null> =
    computed<TemplateRef<unknown> | null>(
      (): TemplateRef<unknown> | null => this.form()?.settings() ?? null,
    );

  /**
   * Property leaving
   *
   * @description
   * Set once a creation or a deletion succeeded, so that its own navigation passes the leave guard.
   *
   * @type {boolean}
   */
  private leaving: boolean = false;

  /**
   * Property places
   * @readonly
   *
   * @description
   * Places already written in the experiences and the education entries, offered by the « Lieu »
   * field; loaded once with the page, the defaults until then or on failure.
   *
   * @type {WritableSignal<ReturnType<typeof timelinePlaces>>}
   */
  protected readonly places: WritableSignal<ReturnType<typeof timelinePlaces>> = signal<
    ReturnType<typeof timelinePlaces>
  >(timelinePlaces([]));

  /**
   * Property api
   * @readonly
   *
   * @description
   * Lists of both kinds, read once for the place suggestions.
   *
   * @type {AdminTimelineApiService}
   */
  private readonly api: AdminTimelineApiService =
    inject<AdminTimelineApiService>(AdminTimelineApiService);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Navigates after a creation or a deletion.
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property route
   * @readonly
   *
   * @description
   * Editor route, base of the relative navigations.
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property confirmations
   * @readonly
   *
   * @description
   * Asks before a deletion and before leaving a dirty form.
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
   * Outcome of each request.
   *
   * @type {ToastService}
   */
  private readonly toasts: ToastService = inject<ToastService>(ToastService);

  /**
   * Property document
   * @readonly
   *
   * @description
   * Document whose window answers the narrow layout query.
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Replaces the projection for every routed kind and identity, ignoring obsolete answers, and
   * follows the narrow layout and the document title.
   */
  public constructor() {
    const destroy: DestroyRef = inject<DestroyRef>(DestroyRef);
    effect((onCleanup): void => {
      const kind: TimelineKind = this.kind();
      const id: string | undefined = this.id();
      let active: boolean = true;
      onCleanup((): void => {
        active = false;
      });
      untracked((): void => {
        this.entry.set(null);
        this.store.resetWriteState();
        if (id === undefined) return;
        void this.store.loadOne(kind, id).then((entry: AdminTimelineEntry | null): void => {
          if (active && entry) this.entry.set(entry);
        });
      });
    });
    // Both kinds: an internship and a job often share a city.
    const places: Subscription = forkJoin([
      this.api.list('experience'),
      this.api.list('education'),
    ]).subscribe({
      next: (lists: AdminTimelineList[]): void =>
        this.places.set(timelinePlaces(lists.flatMap((list: AdminTimelineList) => list.entries))),
      error: (): void => undefined,
    });
    destroy.onDestroy((): void => places.unsubscribe());
    destroy.onDestroy((): void => this.store.cancelRead());
    this.watchWidth(destroy);
    this.followTitle();
  }
  // #endregion

  // #region Methods
  /**
   * Method canLeave
   *
   * @description
   * Blocks navigation during writes and asks before discarding a dirty form.
   *
   * @returns {Promise<boolean>} Whether route deactivation is accepted.
   */
  public async canLeave(): Promise<boolean> {
    if (this.leaving) return true;
    if (this.store.writing()) return false;
    if (!this.dirty()) return true;
    const accepted: boolean = await this.confirmations.confirm({
      title: $localize`:@@admin.timeline.confirm.leave.title:Quitter sans enregistrer ?`,
      description: $localize`:@@admin.timeline.confirm.changesLost:Les modifications de cette entrée seront perdues.`,
      confirmLabel: $localize`:@@admin.timeline.confirm.leave.confirm:Quitter`,
      cancelLabel: $localize`:@@admin.timeline.confirm.keepEditing:Continuer la modification`,
      tone: 'danger',
    });
    return accepted && !this.store.writing();
  }

  /**
   * Method beforeUnload
   *
   * @description
   * Requests the browser's exit warning while a dirty form or a write needs protection.
   *
   * @param {BeforeUnloadEvent} event - Document exit event.
   */
  protected beforeUnload(event: BeforeUnloadEvent): void {
    if (this.dirty() || this.store.writing()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  /**
   * Method shortcut
   * @method shortcut
   *
   * @description
   * Submits the form on Ctrl+S / Cmd+S instead of the browser's "save page", when there is something
   * to save.
   *
   * @param {Event} event - Keyboard event.
   */
  protected shortcut(event: Event): void {
    event.preventDefault();
    const form: TimelineEntryFormComponent | undefined = this.form();
    if (form && (form.dirty() || this.creating())) form.submit();
  }

  /**
   * Method reload
   * @method reload
   *
   * @description
   * Loads the entry again; a successful answer resets the form and clears the conflict.
   *
   * @returns {Promise<void>} Completion after the load.
   */
  protected async reload(): Promise<void> {
    const id: string | undefined = this.id();
    if (this.store.writing() || id === undefined) return;
    const entry: AdminTimelineEntry | null = await this.store.loadOne(this.kind(), id);
    if (entry && id === this.id()) {
      this.store.resetWriteState();
      this.entry.set(entry);
    }
  }

  /**
   * Method save
   * @method save
   *
   * @description
   * Creates the entry, then moves to its address, or saves it with `If-Match`; the answer resets the
   * form and a toast confirms or reports the failure.
   *
   * @param {TimelineEntryFormValues} values - Valid values from the form.
   *
   * @returns {Promise<void>} Completion after the request.
   */
  protected async save(values: TimelineEntryFormValues): Promise<void> {
    if (this.store.writing()) return;
    const current: AdminTimelineEntry | null = this.entry();
    if (this.creating()) {
      const created: AdminTimelineEntry | null = await this.store.create(this.kind(), values);
      if (!created) {
        this.reportFailure();
        return;
      }
      this.toasts.success(
        $localize`:@@admin.timeline.toast.created:« ${created.title.fr}:title: » ajoutée.`,
        {
          description: withSiteRebuildNotice(),
        },
      );
      this.leaving = true;
      await this.router.navigate(['..', created.id], { relativeTo: this.route, replaceUrl: true });
      return;
    }
    if (!current) return;
    const saved: AdminTimelineEntry | null = await this.store.save(current, values);
    if (saved) {
      this.entry.set(saved);
      this.toasts.success($localize`:@@admin.timeline.toast.saved:Enregistré.`, {
        description: withSiteRebuildNotice(),
      });
    } else {
      this.reportFailure();
    }
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Deletes the entry once confirmed, then returns to the list.
   *
   * @returns {Promise<void>} Completion after the request.
   */
  protected async remove(): Promise<void> {
    const entry: AdminTimelineEntry | null = this.entry();
    if (!entry || this.store.writing()) return;
    const confirmed: boolean = await this.confirmations.confirm({
      title: $localize`:@@admin.timeline.confirm.delete.title:Supprimer « ${entry.title.fr}:title: » ?`,
      description: $localize`:@@admin.timeline.confirm.delete.description:Elle disparaîtra du site public à la prochaine reconstruction (quelques minutes). Cette action est définitive.`,
      confirmLabel: $localize`:@@admin.timeline.action.delete:Supprimer`,
      cancelLabel: $localize`:@@admin.timeline.action.cancel:Annuler`,
      tone: 'danger',
    });
    if (!confirmed) return;
    if (await this.store.remove(entry)) {
      this.toasts.success(
        $localize`:@@admin.timeline.toast.deleted:« ${entry.title.fr}:title: » supprimée.`,
        {
          description: withSiteRebuildNotice(),
        },
      );
      this.leaving = true;
      await this.router.navigate(['..'], { relativeTo: this.route });
    } else {
      this.reportFailure();
    }
  }

  /**
   * Method reportFailure
   *
   * @description
   * Toasts a failed write; a version conflict is left to the inline alert, and field errors stay on
   * their fields with a short toast.
   */
  private reportFailure(): void {
    const error: { readonly message: string; readonly code: string | null } | null =
      this.store.writeError();
    if (!error || this.store.conflict()) return;
    // TIMELINE_ERROR_CODES.incomplete: the browser imports no value from the contracts (D10).
    if (error.code === 'content.timeline-entry-incomplete') {
      this.toasts.error($localize`:@@admin.timeline.toast.incomplete:Complétez les deux langues.`, {
        description: $localize`:@@admin.timeline.toast.incompleteHint:Une entrée est publiée dès son enregistrement, en français et en anglais.`,
      });
      return;
    }
    this.toasts.error(error.message);
  }

  /**
   * Method followTitle
   *
   * @description
   * Names the document after the entry once loaded, after a new entry, or after a missing one.
   */
  private followTitle(): void {
    const title: Title = inject<Title>(Title);
    effect((): void => {
      const texts: TimelineKindTexts = this.texts();
      const current: AdminTimelineEntry | null = this.entry();
      const missing: boolean = !current && this.store.loadCallState().error?.status === 404;
      const name: string | null = current
        ? current.title.fr
        : this.creating()
          ? texts.create
          : missing
            ? $localize`:@@admin.timeline.title.missing:Entrée introuvable`
            : null;
      if (name) title.setTitle(timelineDocumentTitle(texts.section, name));
    });
  }

  /**
   * Method watchWidth
   *
   * @description
   * Follows the narrow layout until the page is destroyed (the admin renders in the browser only,
   * D18; the optional calls cover environments without `matchMedia`).
   *
   * @param {DestroyRef} destroyRef - Lifetime of the page.
   */
  private watchWidth(destroyRef: DestroyRef): void {
    const query: MediaQueryList | undefined = this.document.defaultView?.matchMedia?.(
      PROJECT_EDITOR_NARROW_QUERY,
    );
    if (!query) return;
    this.narrow.set(query.matches);
    const listener: (event: MediaQueryListEvent) => void = (event: MediaQueryListEvent): void =>
      this.narrow.set(event.matches);
    query.addEventListener('change', listener);
    destroyRef.onDestroy((): void => query.removeEventListener('change', listener));
  }
  // #endregion
}
