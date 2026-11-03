import {
  ChangeDetectionStrategy,
  Component,
  effect,
  untracked,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
  viewChild,
  type InputSignal,
  type WritableSignal,
  type Signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideChevronRight,
  lucideCircleAlert,
  lucideExternalLink,
  lucidePanelRight,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
import {
  type AdminProject,
  type ProjectDraft,
  AdminProjectsStore,
  toProjectDraft,
} from '@vfortin/content-web-data-access/admin';
import {
  AlertDescriptionDirective,
  AlertDirective,
  AlertTitleDirective,
  BadgeDirective,
  ButtonDirective,
  ConfirmDialogService,
  SheetContentDirective,
  SheetHeaderDirective,
  SheetTitleDirective,
  SheetTriggerDirective,
  SkeletonDirective,
  ToastService,
} from '@vfortin/ui';
import { ProjectPropertiesPanelComponent } from '@internal/content-web-feature-admin/lib/ui/components/project-properties-panel/project-properties-panel.component';
import { ProjectFormComponent } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/project-form.component';
import type { ProjectFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/project-form-values.model';

/**
 * Component AdminProjectEditPageComponent
 * @class AdminProjectEditPageComponent
 *
 * @description
 * Project editor route: loads the project, saves the form's values with `If-Match`, toggles the
 * publication of a clean form and saves on Ctrl/Cmd+S (D36). Each request's outcome is a toast; a
 * version conflict stays an inline alert offering to reload. The properties panel sits beside the form,
 * or in a right sheet opened from the title bar below 1180 px.
 */
@Component({
  selector: 'content-admin-project-edit-page',
  imports: [
    AlertDescriptionDirective,
    AlertDirective,
    AlertTitleDirective,
    BadgeDirective,
    ButtonDirective,
    NgIcon,
    ProjectFormComponent,
    ProjectPropertiesPanelComponent,
    RouterLink,
    SheetContentDirective,
    SheetHeaderDirective,
    SheetTitleDirective,
    SheetTriggerDirective,
    SkeletonDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AdminProjectsStore],
  host: {
    class: 'flex min-h-dvh flex-col',
    '(window:keydown.control.s)': 'shortcut($event)',
    '(window:keydown.meta.s)': 'shortcut($event)',
    '(window:beforeunload)': 'beforeUnload($event)',
  },
  templateUrl: './admin-project-edit-page.component.html',
})
export class AdminProjectEditPageComponent {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Project identifier from the route.
   *
   * @type {InputSignal<string>}
   */
  public readonly id: InputSignal<string> = input.required<string>();

  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped state and commands for loading and revising the project.
   *
   * @type {InstanceType<typeof AdminProjectsStore>}
   */
  protected readonly store: InstanceType<typeof AdminProjectsStore> =
    inject<InstanceType<typeof AdminProjectsStore>>(AdminProjectsStore);

  /**
   * Property confirmations
   * @readonly
   *
   * @description
   * Asks before unpublishing, like the project list (D37).
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

  /**
   * Property project
   * @readonly
   *
   * @description
   * Project as last loaded or written, or `null` before a successful load.
   *
   * @type {WritableSignal<AdminProject | null>}
   */
  protected readonly project: WritableSignal<AdminProject | null> = signal<AdminProject | null>(
    null,
  );

  /**
   * Property values
   * @readonly
   *
   * @description
   * Form values of the current project; each new project resets the form.
   *
   * @type {Signal<ProjectFormValues | null>}
   */
  protected readonly values: Signal<ProjectFormValues | null> = computed<ProjectDraft | null>(
    (): ProjectDraft | null => {
      const project: AdminProject | null = this.project();
      return project ? toProjectDraft(project) : null;
    },
  );

  /**
   * Property dirty
   * @readonly
   *
   * @description
   * Whether the form holds unsaved changes; publication waits for a clean form.
   *
   * @type {Signal<boolean>}
   */
  protected readonly dirty: Signal<boolean> = computed<boolean>(
    (): boolean => this.form()?.dirty() ?? false,
  );

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the title bar and the inline alerts.
   */
  protected readonly icons: {
    readonly back: typeof lucideArrowLeft;
    readonly chevron: typeof lucideChevronRight;
    readonly conflict: typeof lucideTriangleAlert;
    readonly error: typeof lucideCircleAlert;
    readonly open: typeof lucideExternalLink;
    readonly properties: typeof lucidePanelRight;
  } = {
    back: lucideArrowLeft,
    chevron: lucideChevronRight,
    conflict: lucideTriangleAlert,
    error: lucideCircleAlert,
    open: lucideExternalLink,
    properties: lucidePanelRight,
  } as const;

  /**
   * Property form
   * @readonly
   *
   * @description
   * Project form, present once the project has loaded.
   *
   * @type {Signal<ProjectFormComponent | undefined>}
   */
  private readonly form: Signal<ProjectFormComponent | undefined> = viewChild<
    ProjectFormComponent | undefined
  >(ProjectFormComponent);
  // #endregion

  // #region Constructor
  /**
   * Constructor
   *
   * @description
   * Replaces the current projection for every routed identity and ignores obsolete responses.
   */
  public constructor() {
    const destroy: DestroyRef = inject<DestroyRef>(DestroyRef);
    effect((onCleanup): void => {
      const id: string = this.id();
      let active: boolean = true;
      onCleanup((): void => {
        active = false;
      });
      untracked((): void => {
        this.project.set(null);
        this.store.resetWriteState();
        void this.store.loadOne(id).then((project: AdminProject | null): void => {
          if (active && project) this.project.set(project);
        });
      });
    });
    destroy.onDestroy((): void => this.store.cancelRead());
  }
  // #endregion

  // #region Methods
  /**
   * Method canLeave
   *
   * @description
   * Blocks navigation during accepted writes and asks before discarding a dirty draft.
   *
   * @returns {Promise<boolean>} Whether route deactivation is accepted.
   */
  public async canLeave(): Promise<boolean> {
    if (this.store.writing()) return false;
    if (!this.dirty()) return true;
    const accepted: boolean = await this.confirmations.confirm({
      title: 'Quitter sans enregistrer ?',
      description: 'Les modifications de ce projet seront perdues.',
      confirmLabel: 'Quitter',
      cancelLabel: 'Continuer la modification',
      tone: 'danger',
    });
    return accepted && !this.store.writing();
  }

  /**
   * Method beforeUnload
   *
   * @description
   * Requests the browser's native exit warning while a draft or accepted write needs protection.
   *
   * @param {BeforeUnloadEvent} event - Browser document exit event.
   */
  protected beforeUnload(event: BeforeUnloadEvent): void {
    if (this.dirty() || this.store.writing()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  /**
   * Method reload
   * @method reload
   *
   * @description
   * Loads the project; a successful answer resets the form and clears the conflict.
   *
   * @returns {Promise<void>} Completion after the load attempt.
   */
  protected async reload(): Promise<void> {
    if (this.store.writing()) return;
    const id: string = this.id();
    const project: AdminProject | null = await this.store.loadOne(id);
    if (project && id === this.id()) {
      this.store.resetWriteState();
      this.project.set(project);
    }
  }

  /**
   * Method shortcut
   * @method shortcut
   *
   * @description
   * Submits the form on Ctrl+S / Cmd+S instead of the browser's "save page"; does nothing while the form is clean.
   *
   * @param {Event} event - Keyboard event of the shortcut.
   */
  protected shortcut(event: Event): void {
    event.preventDefault();
    const form: ProjectFormComponent | undefined = this.form();
    if (form?.dirty()) {
      form.submit();
    }
  }

  /**
   * Method save
   * @method save
   *
   * @description
   * Saves validated form values; the answer replaces the project, which resets the form to it, and a
   * toast confirms the save or reports its failure.
   *
   * @param {ProjectFormValues} values - Values emitted by the form.
   *
   * @returns {Promise<void>} Completion after the save response.
   */
  protected async save(values: ProjectFormValues): Promise<void> {
    const project: AdminProject | null = this.project();
    // The fields are disabled while a write is running: the answer then replaces the values without loss.
    if (!project || this.store.writing()) {
      return;
    }
    const saved: AdminProject | null = await this.store.save(project, values);
    if (saved) {
      this.project.set(saved);
      this.toasts.success(
        saved.status === 'published'
          ? 'Enregistré. Le site public sera reconstruit dans quelques minutes.'
          : 'Enregistré (brouillon).',
      );
    } else {
      this.reportFailure();
    }
  }

  /**
   * Method togglePublication
   * @method togglePublication
   *
   * @description
   * Publishes the project, or unpublishes it once confirmed, while the form is clean, then toasts the
   * outcome.
   *
   * @returns {Promise<void>} Completion after the publication request.
   */
  protected async togglePublication(): Promise<void> {
    const project: AdminProject | null = this.project();
    if (!project || this.dirty()) {
      return;
    }
    if (
      project.status === 'published' &&
      !(await this.confirmations.confirm({
        title: `Dépublier « ${project.title.fr} » ?`,
        description:
          'Le projet repasse en brouillon et disparaît du site public à la prochaine reconstruction (quelques minutes).',
        confirmLabel: 'Dépublier',
        cancelLabel: 'Annuler',
        tone: 'danger',
      }))
    ) {
      return;
    }
    const updated: AdminProject | null =
      project.status === 'published'
        ? await this.store.unpublish(project)
        : await this.store.publish(project);
    if (updated) {
      this.project.set(updated);
      this.toasts.success(
        updated.status === 'published'
          ? 'Publié. Le site public sera reconstruit dans quelques minutes.'
          : 'Retiré du site public.',
      );
    } else {
      this.reportFailure();
    }
  }

  /**
   * Method reportFailure
   *
   * @description
   * Toasts the readable message of a failed write; a version conflict is left to the inline alert,
   * which offers to reload. An incomplete published project, which the form normally catches first,
   * gets its own explanation instead of the generic rejection.
   */
  private reportFailure(): void {
    const error: { readonly message: string; readonly code: string | null } | null | undefined =
      this.store.writeError();
    if (!error || this.store.conflict()) return;
    // CONTENT_ADMIN_ERROR_CODES.incomplete: the browser imports no value from the contracts (D10).
    if (error.code === 'content.project-incomplete') {
      this.toasts.error('Un projet publié doit rester complet.', {
        description: 'Complétez les deux langues ou dépubliez le projet avant de retirer un texte.',
      });
      return;
    }
    this.toasts.error(error.message);
  }
  // #endregion
}
