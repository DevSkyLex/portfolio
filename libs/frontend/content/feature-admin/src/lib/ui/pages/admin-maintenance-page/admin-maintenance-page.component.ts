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
  type AdminMaintenance,
  AdminMaintenanceStore,
  type AdminMaintenanceStoreType,
  toMaintenanceDraft,
} from '@vfortin/content-web-data-access/admin';
import {
  AlertDescriptionDirective,
  AlertDirective,
  AlertTitleDirective,
  BadgeDirective,
  ButtonDirective,
  ConfirmDialogService,
  PAGE_HEADER_IMPORTS,
  SidebarTriggerComponent,
  SkeletonDirective,
  ToastService,
} from '@vfortin/ui';
import { MaintenanceFormComponent } from '@internal/content-web-feature-admin/lib/ui/forms/maintenance-form/maintenance-form.component';
import type { MaintenanceFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/maintenance-form/models/maintenance-form-values.model';

/**
 * Component AdminMaintenancePageComponent
 * @class AdminMaintenancePageComponent
 *
 * @description
 * « Maintenance » page: the stored state as a badge in the page header, and the form switching the
 * public site's maintenance screen and editing its message. A save applies to the next public
 * request; a stale version shows the conflict alert with a reload, as on « Informations ».
 */
@Component({
  selector: 'content-admin-maintenance-page',
  imports: [
    AlertDescriptionDirective,
    AlertDirective,
    AlertTitleDirective,
    BadgeDirective,
    ButtonDirective,
    MaintenanceFormComponent,
    NgIcon,
    PAGE_HEADER_IMPORTS,
    SidebarTriggerComponent,
    SkeletonDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AdminMaintenanceStore],
  host: {
    class: 'flex min-h-dvh flex-col',
    '(window:keydown.control.s)': 'shortcut($event)',
    '(window:keydown.meta.s)': 'shortcut($event)',
    '(window:beforeunload)': 'beforeUnload($event)',
  },
  templateUrl: './admin-maintenance-page.component.html',
})
export class AdminMaintenancePageComponent {
  // #region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped maintenance state.
   *
   * @type {AdminMaintenanceStoreType}
   */
  protected readonly store: AdminMaintenanceStoreType =
    inject<AdminMaintenanceStoreType>(AdminMaintenanceStore);

  /**
   * Property values
   * @readonly
   *
   * @description
   * Form values of the stored setting, `null` before the read.
   *
   * @type {Signal<MaintenanceFormValues | null>}
   */
  protected readonly values: Signal<MaintenanceFormValues | null> =
    computed<MaintenanceFormValues | null>((): MaintenanceFormValues | null => {
      const setting: AdminMaintenance | null = this.store.setting();
      return setting ? toMaintenanceDraft(setting) : null;
    });

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Icons of the conflict and load error alerts.
   *
   * @type {{ readonly conflict: typeof lucideTriangleAlert; readonly error: typeof lucideCircleAlert }}
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
   * Form once the setting is read.
   *
   * @type {Signal<MaintenanceFormComponent | undefined>}
   */
  private readonly form: Signal<MaintenanceFormComponent | undefined> = viewChild<
    MaintenanceFormComponent | undefined
  >(MaintenanceFormComponent);

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
   * Confirmation dialog of leaving with changes.
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
   * Save outcome notices.
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
   * Reads the setting and ignores the answer once the page left.
   */
  public constructor() {
    void this.store.load();
    inject<DestroyRef>(DestroyRef).onDestroy((): void => this.store.cancelRead());
  }
  // #endregion

  // #region Methods
  /**
   * Method canLeave
   * @method canLeave
   *
   * @description
   * Lets the router leave, after confirmation when the form holds unsaved changes
   * (`leaveProjectEditor`).
   *
   * @returns {Promise<boolean>} Whether to leave.
   */
  public async canLeave(): Promise<boolean> {
    if (this.store.writing()) return false;
    if (!this.dirty()) return true;
    const accepted: boolean = await this.confirmations.confirm({
      title: $localize`:@@admin.maintenance.leave.title:Quitter sans enregistrer ?`,
      description: $localize`:@@admin.maintenance.leave.description:Les modifications de la maintenance seront perdues.`,
      confirmLabel: $localize`:@@admin.maintenance.leave.confirm:Quitter`,
      cancelLabel: $localize`:@@admin.maintenance.leave.cancel:Continuer la modification`,
      tone: 'danger',
    });
    return accepted && !this.store.writing();
  }

  /**
   * Method beforeUnload
   * @method beforeUnload
   *
   * @description
   * Asks the browser to confirm leaving with unsaved changes or a running save.
   *
   * @param {BeforeUnloadEvent} event - Unload event.
   * @returns {void} Completes after flagging the event.
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
   * Saves with Ctrl+S or Cmd+S when the form holds changes.
   *
   * @param {Event} event - Keyboard event.
   * @returns {void} Completes after submitting.
   */
  protected shortcut(event: Event): void {
    event.preventDefault();
    const form: MaintenanceFormComponent | undefined = this.form();
    if (form?.dirty()) form.submit();
  }

  /**
   * Method reload
   * @method reload
   *
   * @description
   * Reads the setting again, clearing a conflict.
   *
   * @returns {Promise<void>} Completion.
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
   * Saves the values and reports the outcome; a conflict is shown by the alert instead.
   *
   * @param {MaintenanceFormValues} values - Form values.
   * @returns {Promise<void>} Completion.
   */
  protected async save(values: MaintenanceFormValues): Promise<void> {
    if (this.store.writing()) return;
    const saved: AdminMaintenance | null = await this.store.save(values);
    if (saved) {
      this.toasts.success($localize`:@@admin.maintenance.toast.saved:Maintenance enregistrée.`, {
        description: saved.enabled
          ? $localize`:@@admin.maintenance.toast.on:Le site public affiche l’écran de maintenance.`
          : $localize`:@@admin.maintenance.toast.off:Le site public est en ligne.`,
      });
      return;
    }
    const error: { readonly message: string } | null = this.store.writeError();
    if (error && !this.store.conflict()) this.toasts.error(error.message);
  }
  // #endregion
}
