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
  type WritableSignal,
} from '@angular/core';
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
  type AdminFaqEntry,
  AdminFaqStore,
  emptyFaqEntryDraft,
  toFaqEntryDraft,
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
import { FaqEntryFormComponent } from '@internal/content-web-feature-admin/lib/ui/forms/faq-entry-form/faq-entry-form.component';
import type { FaqEntryFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/faq-entry-form/models/faq-entry-form-values.model';
import { faqDocumentTitle } from '@internal/content-web-feature-admin/lib/utils/faq-document-title/faq-document-title.utils';
import { withSiteRebuildNotice } from '@internal/content-web-feature-admin/lib/utils/site-rebuild/site-rebuild.utils';

/**
 * Component AdminFaqEditPageComponent
 * @class AdminFaqEditPageComponent
 *
 * @description
 * Editor of a FAQ question, or of a new one on the `new` route, built like the timeline editor (D36,
 * D43) without its properties panel: a 48 px bar back to the list, a page header with the question
 * and its version and « Supprimer », then the form. Saves with `If-Match` (Ctrl/Cmd+S, the save bar),
 * creates then moves to the new question's address, deletes after a danger confirmation, asks before
 * leaving a dirty form and toasts each outcome; a version conflict stays an inline alert offering to
 * reload, a missing question (404) links back to the list. Copy is French source with English
 * targets.
 */
@Component({
  selector: 'content-admin-faq-edit-page',
  imports: [
    AlertDescriptionDirective,
    AlertDirective,
    AlertTitleDirective,
    ButtonDirective,
    FaqEntryFormComponent,
    NgIcon,
    PAGE_HEADER_IMPORTS,
    RouterLink,
    SidebarTriggerComponent,
    SkeletonDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AdminFaqStore],
  host: {
    class: 'flex min-h-dvh flex-col',
    '(window:keydown.control.s)': 'shortcut($event)',
    '(window:keydown.meta.s)': 'shortcut($event)',
    '(window:beforeunload)': 'beforeUnload($event)',
  },
  templateUrl: './admin-faq-edit-page.component.html',
})
export class AdminFaqEditPageComponent {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Question identifier from the route; absent on the `new` route.
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
   * @type {InstanceType<typeof AdminFaqStore>}
   */
  protected readonly store: InstanceType<typeof AdminFaqStore> =
    inject<InstanceType<typeof AdminFaqStore>>(AdminFaqStore);

  /**
   * Property entry
   * @readonly
   *
   * @description
   * Question as last loaded or written, `null` before a load or while creating.
   *
   * @type {WritableSignal<AdminFaqEntry | null>}
   */
  protected readonly entry: WritableSignal<AdminFaqEntry | null> = signal<AdminFaqEntry | null>(
    null,
  );

  /**
   * Property creating
   * @readonly
   *
   * @description
   * Whether the page creates a question.
   *
   * @type {Signal<boolean>}
   */
  protected readonly creating: Signal<boolean> = computed<boolean>((): boolean => !this.id());

  /**
   * Property heading
   * @readonly
   *
   * @description
   * French question of the loaded entry, or « Nouvelle question ».
   *
   * @type {Signal<string>}
   */
  protected readonly heading: Signal<string> = computed<string>(
    (): string => this.entry()?.question.fr ?? $localize`:@@admin.faq.create:Nouvelle question`,
  );

  /**
   * Property values
   * @readonly
   *
   * @description
   * Form values: the loaded question's, an empty draft while creating, `null` before a load.
   *
   * @type {Signal<FaqEntryFormValues | null>}
   */
  protected readonly values: Signal<FaqEntryFormValues | null> =
    computed<FaqEntryFormValues | null>((): FaqEntryFormValues | null => {
      const entry: AdminFaqEntry | null = this.entry();
      if (entry) return toFaqEntryDraft(entry);
      return this.creating() ? emptyFaqEntryDraft() : null;
    });

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
   * Question form, once values exist.
   *
   * @type {Signal<FaqEntryFormComponent | undefined>}
   */
  private readonly form: Signal<FaqEntryFormComponent | undefined> = viewChild<
    FaqEntryFormComponent | undefined
  >(FaqEntryFormComponent);

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
   * Property leaving
   *
   * @description
   * Set once a creation or a deletion succeeded, so that its own navigation passes the leave guard.
   *
   * @type {boolean}
   */
  private leaving: boolean = false;

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
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Replaces the projection for every routed identity, ignoring obsolete answers, and follows the
   * document title.
   */
  public constructor() {
    effect((onCleanup): void => {
      const id: string | undefined = this.id();
      let active: boolean = true;
      onCleanup((): void => {
        active = false;
      });
      untracked((): void => {
        this.entry.set(null);
        this.store.resetWriteState();
        if (id === undefined) return;
        void this.store.loadOne(id).then((entry: AdminFaqEntry | null): void => {
          if (active && entry) this.entry.set(entry);
        });
      });
    });
    inject<DestroyRef>(DestroyRef).onDestroy((): void => this.store.cancelRead());
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
      title: $localize`:@@admin.faq.confirm.leave.title:Quitter sans enregistrer ?`,
      description: $localize`:@@admin.faq.confirm.changesLost:Les modifications de cette question seront perdues.`,
      confirmLabel: $localize`:@@admin.faq.confirm.leave.confirm:Quitter`,
      cancelLabel: $localize`:@@admin.faq.confirm.keepEditing:Continuer la modification`,
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
    const form: FaqEntryFormComponent | undefined = this.form();
    if (form && (form.dirty() || this.creating())) form.submit();
  }

  /**
   * Method reload
   * @method reload
   *
   * @description
   * Loads the question again; a successful answer resets the form and clears the conflict.
   *
   * @returns {Promise<void>} Completion after the load.
   */
  protected async reload(): Promise<void> {
    const id: string | undefined = this.id();
    if (this.store.writing() || id === undefined) return;
    const entry: AdminFaqEntry | null = await this.store.loadOne(id);
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
   * Creates the question, then moves to its address, or saves it with `If-Match`; the answer resets
   * the form and a toast confirms or reports the failure.
   *
   * @param {FaqEntryFormValues} values - Valid values from the form.
   *
   * @returns {Promise<void>} Completion after the request.
   */
  protected async save(values: FaqEntryFormValues): Promise<void> {
    if (this.store.writing()) return;
    if (this.creating()) {
      const created: AdminFaqEntry | null = await this.store.create(values);
      if (!created) {
        this.reportFailure();
        return;
      }
      this.toasts.success(
        $localize`:@@admin.faq.toast.created:« ${created.question.fr}:question: » ajoutée.`,
        { description: withSiteRebuildNotice() },
      );
      this.leaving = true;
      await this.router.navigate(['..', created.id], { relativeTo: this.route, replaceUrl: true });
      return;
    }
    const current: AdminFaqEntry | null = this.entry();
    if (!current) return;
    const saved: AdminFaqEntry | null = await this.store.save(current, values);
    if (saved) {
      this.entry.set(saved);
      this.toasts.success($localize`:@@admin.faq.toast.saved:Enregistré.`, {
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
   * Deletes the question once confirmed, then returns to the list.
   *
   * @returns {Promise<void>} Completion after the request.
   */
  protected async remove(): Promise<void> {
    const entry: AdminFaqEntry | null = this.entry();
    if (!entry || this.store.writing()) return;
    const confirmed: boolean = await this.confirmations.confirm({
      title: $localize`:@@admin.faq.confirm.delete.title:Supprimer « ${entry.question.fr}:question: » ?`,
      description: $localize`:@@admin.faq.confirm.delete.description:Elle disparaîtra du site public à la prochaine reconstruction (quelques minutes). Cette action est définitive.`,
      confirmLabel: $localize`:@@admin.faq.action.delete:Supprimer`,
      cancelLabel: $localize`:@@admin.faq.action.cancel:Annuler`,
      tone: 'danger',
    });
    if (!confirmed) return;
    if (await this.store.remove(entry)) {
      this.toasts.success(
        $localize`:@@admin.faq.toast.deleted:« ${entry.question.fr}:question: » supprimée.`,
        { description: withSiteRebuildNotice() },
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
    // FAQ_ERROR_CODES.incomplete: the browser imports no value from the contracts (D10).
    if (error.code === 'content.faq-entry-incomplete') {
      this.toasts.error($localize`:@@admin.faq.toast.incomplete:Complétez les deux langues.`, {
        description: $localize`:@@admin.faq.toast.incompleteHint:Une question est publiée dès son enregistrement, en français et en anglais.`,
      });
      return;
    }
    this.toasts.error(error.message);
  }

  /**
   * Method followTitle
   *
   * @description
   * Names the document after the question once loaded, after a new question, or after a missing one.
   */
  private followTitle(): void {
    const title: Title = inject<Title>(Title);
    effect((): void => {
      const current: AdminFaqEntry | null = this.entry();
      const missing: boolean = !current && this.store.loadCallState().error?.status === 404;
      const name: string | null = current
        ? current.question.fr
        : this.creating()
          ? $localize`:@@admin.faq.create:Nouvelle question`
          : missing
            ? $localize`:@@admin.faq.title.missing:Question introuvable`
            : null;
      if (name) title.setTitle(faqDocumentTitle(name));
    });
  }
  // #endregion
}
