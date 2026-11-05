import { AdminPublicationSectionComponent } from '@internal/content-web-feature-admin/lib/ui/sections/admin-publication-section/admin-publication-section.component';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  viewChild,
  type Signal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideCircleAlert, lucideTriangleAlert } from '@ng-icons/lucide';
import {
  type AdminProfile,
  AdminProfileStore,
  type AdminProfileStoreType,
  toProfileDraft,
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
import type { ProfileFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/profile-form/models/profile-form-values.model';
import { ProfileFormComponent } from '@internal/content-web-feature-admin/lib/ui/forms/profile-form/profile-form.component';
import { withSiteRebuildNotice } from '@internal/content-web-feature-admin/lib/utils/site-rebuild/site-rebuild.utils';

/**
 * Component AdminInformationPageComponent
 * @class AdminInformationPageComponent
 *
 * @description
 * « Informations » page: the profile texts of the home and « À propos » sections, their facts and
 * the public links (contact section, footer), laid out like the « Sécurité » settings page (D36
 * settings page revision): the 48 px bar naming the section, the page header with its meta line,
 * then the centred 920 px column of setting sections, each bilingual field with its own language
 * selector. Saves with `If-Match`
 * (Ctrl/Cmd+S, the save bar) and toasts the outcome with the rebuild notice; a version conflict stays
 * an inline alert offering to reload; leaving a dirty form asks first.
 */
@Component({
  selector: 'content-admin-information-page',
  imports: [
    AdminPublicationSectionComponent,
    AlertDescriptionDirective,
    AlertDirective,
    AlertTitleDirective,
    ButtonDirective,
    NgIcon,
    PAGE_HEADER_IMPORTS,
    ProfileFormComponent,
    SidebarTriggerComponent,
    SkeletonDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AdminProfileStore],
  host: {
    class: 'flex min-h-dvh flex-col',
    '(window:keydown.control.s)': 'shortcut($event)',
    '(window:keydown.meta.s)': 'shortcut($event)',
    '(window:beforeunload)': 'beforeUnload($event)',
  },
  templateUrl: './admin-information-page.component.html',
})
export class AdminInformationPageComponent {
  // #region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped profile state and commands.
   *
   * @type {AdminProfileStoreType}
   */
  protected readonly store: AdminProfileStoreType =
    inject<AdminProfileStoreType>(AdminProfileStore);

  /**
   * Property values
   * @readonly
   *
   * @description
   * Form values of the profile last read or saved, `null` before the first read.
   *
   * @type {Signal<ProfileFormValues | null>}
   */
  protected readonly values: Signal<ProfileFormValues | null> = computed<ProfileFormValues | null>(
    (): ProfileFormValues | null => {
      const profile: AdminProfile | null = this.store.profile();
      return profile ? toProfileDraft(profile) : null;
    },
  );

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the alerts.
   */
  protected readonly icons: {
    readonly conflict: typeof lucideTriangleAlert;
    readonly error: typeof lucideCircleAlert;
  } = { conflict: lucideTriangleAlert, error: lucideCircleAlert } as const;

  /**
   * Property form
   * @readonly
   *
   * @description
   * Profile form, once the profile is read.
   *
   * @type {Signal<ProfileFormComponent | undefined>}
   */
  private readonly form: Signal<ProfileFormComponent | undefined> = viewChild<
    ProfileFormComponent | undefined
  >(ProfileFormComponent);

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
   * Property confirmations
   * @readonly
   *
   * @description
   * Asks before leaving a dirty form.
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
   * Outcome of each save.
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
   * Reads the profile, ignoring an answer arriving after the page left.
   */
  public constructor() {
    void this.store.load();
    inject<DestroyRef>(DestroyRef).onDestroy((): void => this.store.cancelRead());
  }
  // #endregion

  // #region Methods
  /**
   * Method canLeave
   *
   * @description
   * Blocks navigation during a save and asks before discarding a dirty form.
   *
   * @returns {Promise<boolean>} Whether route deactivation is accepted.
   */
  public async canLeave(): Promise<boolean> {
    if (this.store.writing()) return false;
    if (!this.dirty()) return true;
    const accepted: boolean = await this.confirmations.confirm({
      title: $localize`:@@admin.information.leave.title:Quitter sans enregistrer ?`,
      description: $localize`:@@admin.information.leave.description:Les modifications des informations seront perdues.`,
      confirmLabel: $localize`:@@admin.information.leave.confirm:Quitter`,
      cancelLabel: $localize`:@@admin.information.leave.cancel:Continuer la modification`,
      tone: 'danger',
    });
    return accepted && !this.store.writing();
  }

  /**
   * Method beforeUnload
   *
   * @description
   * Requests the browser's exit warning while a dirty form or a save needs protection.
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
   * Submits the form on Ctrl+S / Cmd+S instead of the browser's "save page", when it holds changes.
   *
   * @param {Event} event - Keyboard event.
   */
  protected shortcut(event: Event): void {
    event.preventDefault();
    const form: ProfileFormComponent | undefined = this.form();
    if (form?.dirty()) form.submit();
  }

  /**
   * Method reload
   * @method reload
   *
   * @description
   * Reads the profile again, replacing the form and clearing a conflict.
   *
   * @returns {Promise<void>} Completion after the read.
   */
  protected async reload(): Promise<void> {
    if (this.store.writing()) return;
    if (await this.store.load()) this.store.resetWriteState();
  }

  /**
   * Method save
   * @method save
   *
   * @description
   * Saves the values with `If-Match`; the answer resets the form and a toast confirms or reports the
   * failure (a conflict is left to the inline alert, field errors stay on their fields).
   *
   * @param {ProfileFormValues} values - Valid values from the form.
   *
   * @returns {Promise<void>} Completion after the request.
   */
  protected async save(values: ProfileFormValues): Promise<void> {
    if (this.store.writing()) return;
    if (await this.store.save(values)) {
      this.toasts.success($localize`:@@admin.information.toast.saved:Informations enregistrées.`, {
        description: withSiteRebuildNotice(),
      });
      return;
    }
    const error: { readonly message: string; readonly code: string | null } | null =
      this.store.writeError();
    if (!error || this.store.conflict()) return;
    // PROFILE_ERROR_CODES.incomplete: the browser imports no value from the contracts (D10).
    if (error.code === 'content.profile-incomplete') {
      this.toasts.error(
        $localize`:@@admin.information.toast.incomplete:Complétez les deux langues.`,
        {
          description: $localize`:@@admin.information.toast.incompleteDescription:Le profil est publié dès son enregistrement, en français et en anglais.`,
        },
      );
      return;
    }
    this.toasts.error(error.message);
  }
  // #endregion
}
