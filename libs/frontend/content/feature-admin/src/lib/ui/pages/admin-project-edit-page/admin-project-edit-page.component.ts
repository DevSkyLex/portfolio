import { AdminPublicationSectionComponent } from '@internal/content-web-feature-admin/lib/ui/sections/admin-publication-section/admin-publication-section.component';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  untracked,
  DestroyRef,
  Injector,
  LOCALE_ID,
  computed,
  inject,
  input,
  signal,
  viewChild,
  type InputSignal,
  type WritableSignal,
  type Signal,
  type TemplateRef,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  type AdminMedia,
  type AdminProject,
  type ProjectDraft,
  AdminMediaApiService,
  AdminProjectsStore,
  toProjectDraft,
} from '@vfortin/content-web-data-access/admin';
import { firstValueFrom } from 'rxjs';
import {
  AlertDescriptionDirective,
  AlertDirective,
  AlertTitleDirective,
  ButtonDirective,
  ConfirmDialogService,
  PAGE_HEADER_IMPORTS,
  ResizableHandleComponent,
  ResizableLayoutService,
  ResizablePanelDirective,
  ResizablePanelGroupDirective,
  SheetHeaderDirective,
  SheetService,
  SheetTitleDirective,
  SidebarTriggerComponent,
  SkeletonDirective,
  ToastService,
  type DialogRef,
  type PanelSize,
} from '@vfortin/ui';
import { EMPTY_PROJECT_DRAFT } from '@internal/content-web-feature-admin/lib/constants/empty-project-draft.constants';
import {
  PROJECT_EDITOR_LAYOUT,
  PROJECT_EDITOR_NARROW_QUERY,
} from '@internal/content-web-feature-admin/lib/constants/project-editor-layout.constants';
import { ProjectPropertiesPanelComponent } from '@internal/content-web-feature-admin/lib/ui/components/project-properties-panel/project-properties-panel.component';
import { ProjectFormComponent } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/project-form.component';
import type { ProjectFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/project-form-values.model';
import type { ArticleImageUpload } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/models/article-image-upload.type';
import { projectPublicPath } from '@internal/content-web-feature-admin/lib/utils/project-public-path/project-public-path.utils';
import { withSiteRebuildNotice } from '@internal/content-web-feature-admin/lib/utils/site-rebuild/site-rebuild.utils';

/**
 * Component AdminProjectEditPageComponent
 * @class AdminProjectEditPageComponent
 *
 * @description
 * Project editor route: loads the project, saves the form's values with `If-Match`, toggles the
 * publication of a clean form and saves on Ctrl/Cmd+S (D36). Each request's outcome is a toast, which
 * carries the rebuild notice when the public site changes (a published save, a publication or an
 * unpublication, not a draft save); a version conflict stays an inline alert offering to reload. It uploads the article and cover images
 * (D40) and keeps the uploaded media beside the project's, so that a new image shows before saving.
 * The properties panel, which also holds the form's shared settings, sits beside the form behind a
 * separator whose position is remembered per viewer, or in a right sheet opened from the title bar
 * below 1180 px. While it loads, skeletons hold the header and first fields in place; a missing
 * project (404) links back to the list, any other failure offers to try again.
 */
@Component({
  selector: 'content-admin-project-edit-page',
  imports: [
    AdminPublicationSectionComponent,
    AlertDescriptionDirective,
    AlertDirective,
    AlertTitleDirective,
    ButtonDirective,
    NgIcon,
    PAGE_HEADER_IMPORTS,
    ProjectFormComponent,
    ProjectPropertiesPanelComponent,
    ResizableHandleComponent,
    ResizablePanelDirective,
    ResizablePanelGroupDirective,
    RouterLink,
    SheetHeaderDirective,
    SheetTitleDirective,
    SidebarTriggerComponent,
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
  public readonly id: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /**
   * Property creating
   * @readonly
   *
   * @description
   * Whether the page creates a project (the `new` route, without identifier).
   */
  protected readonly creating: Signal<boolean> = computed<boolean>((): boolean => !this.id());

  private readonly router: Router = inject<Router>(Router);

  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  // Set once the creation succeeded, so that moving to the new project's address asks nothing.
  private leaving: boolean = false;

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
   * Property localeId
   * @readonly
   *
   * @description
   * Locale of the running build, which picks the public page « Voir la page » opens.
   *
   * @type {string}
   */
  private readonly localeId: string = inject<string>(LOCALE_ID);

  /**
   * Property saveFirst
   * @readonly
   *
   * @description
   * Title of the publication button while the form holds unsaved changes.
   *
   * @type {string}
   */
  protected readonly createLabel: string = $localize`:@@admin.project.create.title:Nouveau projet`;

  protected readonly saveFirst: string = $localize`:@@admin.project.publish.saveFirst:Enregistrez d’abord les modifications.`;

  /**
   * Property mediaApi
   * @readonly
   *
   * @description
   * Uploads the images of the article and the cover.
   *
   * @type {AdminMediaApiService}
   */
  private readonly mediaApi: AdminMediaApiService =
    inject<AdminMediaApiService>(AdminMediaApiService);

  /**
   * Property uploaded
   * @readonly
   *
   * @description
   * Media uploaded on this page, by id, until a saved project lists them.
   *
   * @type {WritableSignal<ReadonlyMap<string, AdminMedia>>}
   */
  private readonly uploaded: WritableSignal<ReadonlyMap<string, AdminMedia>> = signal<
    ReadonlyMap<string, AdminMedia>
  >(new Map<string, AdminMedia>());

  /**
   * Property media
   * @readonly
   *
   * @description
   * Media known to the editor: the project's and the ones uploaded since it loaded.
   *
   * @type {Signal<ReadonlyMap<string, AdminMedia>>}
   */
  protected readonly media: Signal<ReadonlyMap<string, AdminMedia>> = computed<
    ReadonlyMap<string, AdminMedia>
  >((): ReadonlyMap<string, AdminMedia> => {
    const known: Map<string, AdminMedia> = new Map<string, AdminMedia>(this.uploaded());
    for (const item of this.project()?.media ?? []) known.set(item.id, item);
    return known;
  });

  /**
   * Property upload
   * @readonly
   *
   * @description
   * Image upload given to the form: stores the file, remembers the media and resolves to it, or
   * rejects with a localized reason (too large, unsupported format, unreachable service).
   *
   * @type {ArticleImageUpload}
   */
  protected readonly upload: ArticleImageUpload = async (file: File): Promise<AdminMedia> => {
    try {
      const media: AdminMedia = await firstValueFrom(this.mediaApi.upload(file));
      this.uploaded.update(
        (known: ReadonlyMap<string, AdminMedia>): ReadonlyMap<string, AdminMedia> =>
          new Map<string, AdminMedia>(known).set(media.id, media),
      );
      return media;
    } catch (error) {
      throw new Error(this.uploadFailure(error));
    }
  };

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
      if (project) return toProjectDraft(project);
      return this.creating() ? EMPTY_PROJECT_DRAFT : null;
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
   * Property document
   * @readonly
   *
   * @description
   * Document whose window answers the narrow layout query.
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property layouts
   * @readonly
   *
   * @description
   * Per-viewer storage of the split between the form and the properties panel.
   *
   * @type {ResizableLayoutService}
   */
  private readonly layouts: ResizableLayoutService =
    inject<ResizableLayoutService>(ResizableLayoutService);

  /**
   * Property splitLayout
   * @readonly
   *
   * @description
   * Default split, bounds and storage key of the form and the properties panel.
   */
  protected readonly splitLayout: typeof PROJECT_EDITOR_LAYOUT = PROJECT_EDITOR_LAYOUT;

  /**
   * Property panelWidth
   * @readonly
   *
   * @description
   * Last properties panel width in pixels, read from storage before the first render so the panel
   * starts at its remembered width (320 px by default, or after a percentage layout stored before),
   * and kept in step with each save so the panels created again for another project reuse it.
   *
   * @type {WritableSignal<number>}
   */
  protected readonly panelWidth: WritableSignal<number> = signal<number>(
    this.layouts.readPixels(PROJECT_EDITOR_LAYOUT),
  );

  /**
   * Property panelDefault
   * @readonly
   *
   * @description
   * Properties panel width bound to its panel, as a pixel size; the form takes the rest.
   *
   * @type {Signal<PanelSize>}
   */
  protected readonly panelDefault: Signal<PanelSize> = computed<PanelSize>(
    (): PanelSize => `${this.panelWidth()}px` as const,
  );

  /**
   * Property narrow
   * @readonly
   *
   * @description
   * Whether the properties move to the sheet, which removes the separator; `false` where `matchMedia`
   * is unavailable.
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly narrow: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property sheets
   * @readonly
   *
   * @description
   * Opens the properties sheet below 1180 px.
   *
   * @type {SheetService}
   */
  private readonly sheets: SheetService = inject<SheetService>(SheetService);

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Page injector handed to the sheet, whose content renders the page's form settings.
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject<Injector>(Injector);

  /**
   * Property propertiesTemplate
   * @readonly
   *
   * @description
   * Content of the properties sheet.
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly propertiesTemplate: Signal<TemplateRef<unknown> | undefined> = viewChild<
    TemplateRef<unknown> | undefined
  >('properties');

  /**
   * Property propertiesSheet
   *
   * @description
   * Open properties sheet, `null` while closed.
   *
   * @type {DialogRef<unknown> | null}
   */
  private propertiesSheet: DialogRef<unknown> | null = null;

  /**
   * Property propertiesOpen
   * @readonly
   *
   * @description
   * Whether the properties sheet is open, for the trigger's `aria-expanded`.
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly propertiesOpen: WritableSignal<boolean> = signal<boolean>(false);

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

  /**
   * Property settings
   * @readonly
   *
   * @description
   * Shared settings of the form (cover, site, technologies, home-page feature), which the properties
   * panel renders while they stay bound to the form; `null` until the form exists.
   *
   * @type {Signal<TemplateRef<unknown> | null>}
   */
  protected readonly settings: Signal<TemplateRef<unknown> | null> =
    computed<TemplateRef<unknown> | null>(
      (): TemplateRef<unknown> | null => this.form()?.settings() ?? null,
    );
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
      const id: string | undefined = this.id();
      let active: boolean = true;
      onCleanup((): void => {
        active = false;
      });
      untracked((): void => {
        this.project.set(null);
        this.store.resetWriteState();
        if (id === undefined) return;
        void this.store.loadOne(id).then((project: AdminProject | null): void => {
          if (active && project) this.project.set(project);
        });
      });
    });
    destroy.onDestroy((): void => {
      this.store.cancelRead();
      this.propertiesSheet?.close();
    });
    this.watchWidth(destroy);
    this.followTitle();
  }
  // #endregion

  // #region Methods
  /**
   * Method publicPath
   * @method publicPath
   *
   * @description
   * Public page of the published project, in the admin's language.
   *
   * @param {AdminProject} project - Edited project.
   *
   * @returns {string} Root-relative path.
   */
  protected publicPath(project: AdminProject): string {
    return projectPublicPath(project.slug, this.localeId);
  }

  /**
   * Method openProperties
   * @method openProperties
   *
   * @description
   * Opens the properties in a narrow right sheet whose title takes the focus first, as the inbox's
   * reading sheet does: the cover button would otherwise be the first stop.
   */
  protected openProperties(): void {
    const template: TemplateRef<unknown> | undefined = this.propertiesTemplate();
    if (!template || this.propertiesSheet) return;
    const sheet: DialogRef<unknown> = this.sheets.open(template, {
      side: 'right',
      class: 'max-w-80 gap-6 p-5',
      autoFocus: 'first-heading',
      injector: this.injector,
    });
    this.propertiesSheet = sheet;
    this.propertiesOpen.set(true);
    sheet.closed.subscribe((): void => {
      this.propertiesSheet = null;
      this.propertiesOpen.set(false);
    });
  }

  /**
   * Method saveSplit
   * @method saveSplit
   *
   * @description
   * Remembers the properties panel width after a drag, a key press or a reset on the separator; a
   * width not measured yet is not saved.
   *
   * @param {number | undefined} width - Properties panel width in pixels.
   */
  protected saveSplit(width: number | undefined): void {
    if (!width) return;
    this.panelWidth.set(Math.round(width));
    this.layouts.writePixels(PROJECT_EDITOR_LAYOUT, width);
  }

  /**
   * Method resetSplit
   * @method resetSplit
   *
   * @description
   * Restores the default panel width (320 px) on a double click of the separator, then saves it.
   *
   * @param {ResizablePanelGroupDirective} group - Group of the form and the properties panel.
   * @param {ResizableHandleComponent} handle - Separator between them.
   */
  protected resetSplit(
    group: ResizablePanelGroupDirective,
    handle: ResizableHandleComponent,
  ): void {
    // The delta applies to the form, before the handle: the panel grows when the form shrinks.
    const width: number = PROJECT_EDITOR_LAYOUT.pixels.default;
    group.resizePixels(handle, (group.pixelSizes()[1] ?? width) - width);
    group.commit();
  }

  /**
   * Method canLeave
   *
   * @description
   * Blocks navigation during accepted writes and asks before discarding a dirty draft.
   *
   * @returns {Promise<boolean>} Whether route deactivation is accepted.
   */
  public async canLeave(): Promise<boolean> {
    if (this.leaving) return true;
    if (this.store.writing()) return false;
    if (!this.dirty()) return true;
    const accepted: boolean = await this.confirmations.confirm({
      title: $localize`:@@admin.project.leave.confirmTitle:Quitter sans enregistrer ?`,
      description: $localize`:@@admin.project.unsaved.lost:Les modifications de ce projet seront perdues.`,
      confirmLabel: $localize`:@@admin.project.leave.confirmLabel:Quitter`,
      cancelLabel: $localize`:@@admin.project.unsaved.keepEditing:Continuer la modification`,
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
    const id: string | undefined = this.id();
    if (this.store.writing() || id === undefined) return;
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
  /**
   * Method cancel
   * @method cancel
   *
   * @description
   * After the form dropped its changes: reloads the project, or leaves the creation page.
   *
   * @returns {Promise<void>} Completion after the reload or the navigation.
   */
  protected async cancel(): Promise<void> {
    if (this.creating()) {
      await this.router.navigate(['..'], { relativeTo: this.route });
      return;
    }
    await this.reload();
  }

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
    if (this.creating()) {
      await this.create(values);
      return;
    }
    const project: AdminProject | null = this.project();
    // The fields are disabled while a write is running: the answer then replaces the values without loss.
    if (!project || this.store.writing()) {
      return;
    }
    const saved: AdminProject | null = await this.store.save(project, values);
    if (saved) {
      this.project.set(saved);
      if (saved.status === 'published') {
        this.toasts.success($localize`:@@admin.project.toast.saved:Enregistré.`, {
          description: withSiteRebuildNotice(),
        });
      } else {
        this.toasts.success($localize`:@@admin.project.toast.savedDraft:Enregistré (brouillon).`);
      }
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
  /**
   * Method create
   * @method create
   *
   * @description
   * Adds the project as a draft, then moves to its address in place of the creation page.
   *
   * @param {ProjectFormValues} values - Submitted form values.
   * @returns {Promise<void>} Completion after the request and the navigation.
   */
  private async create(values: ProjectFormValues): Promise<void> {
    if (this.store.writing()) return;
    const created: AdminProject | null = await this.store.create(values);
    if (!created) {
      this.reportFailure();
      return;
    }
    this.toasts.success(
      $localize`:@@admin.project.toast.created:« ${created.title.fr}:title: » créé (brouillon).`,
    );
    this.leaving = true;
    await this.router.navigate(['..', created.id], { relativeTo: this.route, replaceUrl: true });
  }

  protected async togglePublication(): Promise<void> {
    const project: AdminProject | null = this.project();
    if (!project || this.dirty()) {
      return;
    }
    if (
      project.status === 'published' &&
      !(await this.confirmations.confirm({
        title: $localize`:@@admin.projects.unpublish.confirmTitle:Dépublier « ${project.title.fr}:title: » ?`,
        description: $localize`:@@admin.projects.unpublish.confirmDescription:Le projet repasse en brouillon et disparaît du site public à la prochaine reconstruction (quelques minutes).`,
        confirmLabel: $localize`:@@admin.projects.action.unpublish:Dépublier`,
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
          ? $localize`:@@admin.project.toast.published:Publié.`
          : $localize`:@@admin.project.toast.unpublished:Retiré du site public.`,
        {
          description: withSiteRebuildNotice(),
        },
      );
    } else {
      this.reportFailure();
    }
  }

  /**
   * Method uploadFailure
   *
   * @description
   * Localized reason of a refused upload, from the media problem codes (`MEDIA_ERROR_CODES`; the browser
   * imports no value from the contracts, D10).
   *
   * @param {unknown} error - Failure of the upload request.
   *
   * @returns {string} Readable reason.
   */
  private uploadFailure(error: unknown): string {
    if (!(error instanceof HttpErrorResponse))
      return $localize`:@@admin.project.upload.unexpected:Une erreur inattendue est survenue.`;
    const code: unknown = (error.error as { code?: unknown } | null)?.code;
    if (error.status === 413 || code === 'content.media-too-large')
      return $localize`:@@admin.project.upload.tooLarge:L’image dépasse 10 Mo.`;
    if (error.status === 415 || code === 'content.media-unsupported')
      return $localize`:@@admin.project.upload.unsupported:Format non pris en charge : JPEG, PNG, WebP, AVIF ou GIF.`;
    if (error.status === 0)
      return $localize`:@@admin.project.upload.offline:La connexion est indisponible. Réessayez.`;
    return error.status >= 500
      ? $localize`:@@admin.project.upload.server:Le service ne répond pas. Réessayez dans un moment.`
      : $localize`:@@admin.project.upload.rejected:L’image a été refusée.`;
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
      this.toasts.error(
        $localize`:@@admin.project.toast.incomplete:Un projet publié doit rester complet.`,
        {
          description: $localize`:@@admin.project.toast.incompleteHint:Complétez les deux langues ou dépubliez le projet avant de retirer un texte.`,
        },
      );
      return;
    }
    this.toasts.error(error.message);
  }

  /**
   * Method followTitle
   * @method followTitle
   *
   * @description
   * Names the document after the project once it has loaded (« Movah — Projets — Administration »),
   * and after a missing project (« Projet introuvable — … »). The route's static title covers the
   * loading time and the other failures: the router sets it at the end of the navigation, before the
   * project answers, so this later title wins until the next navigation.
   */
  private followTitle(): void {
    const title: Title = inject<Title>(Title);
    effect((): void => {
      const current: AdminProject | null = this.project();
      if (this.creating()) {
        title.setTitle(
          $localize`:@@admin.project.create.documentTitle:Nouveau projet — Projets — Administration`,
        );
        return;
      }
      const missing: boolean = !current && this.store.loadCallState().error?.status === 404;
      if (current || missing) {
        title.setTitle(
          current
            ? $localize`:@@admin.project.documentTitle:${current.title.fr}:project: — Projets — Administration`
            : $localize`:@@admin.project.notFound.documentTitle:Projet introuvable — Projets — Administration`,
        );
      }
    });
  }

  /**
   * Method watchWidth
   * @method watchWidth
   *
   * @description
   * Follows the properties sheet breakpoint until the page is destroyed. The admin renders in the
   * browser only (D18); the optional calls cover environments without `matchMedia`.
   *
   * @param {DestroyRef} destroyRef - Lifetime of the page, which removes the listener.
   */
  private watchWidth(destroyRef: DestroyRef): void {
    const query: MediaQueryList | undefined = this.document.defaultView?.matchMedia?.(
      PROJECT_EDITOR_NARROW_QUERY,
    );
    if (!query) {
      return;
    }
    this.narrow.set(query.matches);
    const listener: (event: MediaQueryListEvent) => void = (event: MediaQueryListEvent): void =>
      this.narrow.set(event.matches);
    query.addEventListener('change', listener);
    destroyRef.onDestroy(() => query.removeEventListener('change', listener));
  }
  // #endregion
}
