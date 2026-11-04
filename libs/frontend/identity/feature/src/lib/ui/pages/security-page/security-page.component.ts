import { DOCUMENT } from '@angular/common';
import {
  type Signal,
  type TemplateRef,
  type WritableSignal,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucideCopy,
  lucideMonitorSmartphone,
  lucideShield,
} from '@ng-icons/lucide';
import { TwoFactorStore, type TwoFactorStoreType } from '@vfortin/identity-web-data-access';
import {
  AlertDirective,
  BadgeDirective,
  EMPTY_IMPORTS,
  ButtonDirective,
  type DialogRef,
  type DialogSize,
  DialogDescriptionDirective,
  DialogHeaderDirective,
  DialogService,
  DialogTitleDirective,
  PAGE_HEADER_IMPORTS,
  SidebarTriggerComponent,
  SkeletonDirective,
  ToastService,
  TooltipDirective,
} from '@vfortin/ui';
import type { TwoFactorMaterial } from '@internal/identity-web-feature/lib/models/two-factor-material/two-factor-material.type';
import type { TwoFactorFailure } from '@internal/identity-web-feature/lib/models/two-factor-failure/two-factor-failure.type';
import { TWO_FACTOR_TOASTS } from '@internal/identity-web-feature/lib/constants/two-factor-toasts.constants';
import { QrCodeComponent } from '@internal/identity-web-feature/lib/ui/components/qr-code/qr-code.component';
import { ConnectedApplicationsSectionComponent } from '@internal/identity-web-feature/lib/ui/sections/connected-applications-section/connected-applications-section.component';
import { TwoFactorCodeFormComponent } from '@internal/identity-web-feature/lib/ui/forms/two-factor-code-form/two-factor-code-form.component';
import type { TwoFactorCodeFormValues } from '@internal/identity-web-feature/lib/ui/forms/two-factor-code-form/models/two-factor-code-form-values.model';
import { TwoFactorDisableFormComponent } from '@internal/identity-web-feature/lib/ui/forms/two-factor-disable-form/two-factor-disable-form.component';
import type { TwoFactorDisableFormValues } from '@internal/identity-web-feature/lib/ui/forms/two-factor-disable-form/models/two-factor-disable-form-values.model';
import { TwoFactorPasswordFormComponent } from '@internal/identity-web-feature/lib/ui/forms/two-factor-password-form/two-factor-password-form.component';
import type { TwoFactorPasswordFormValues } from '@internal/identity-web-feature/lib/ui/forms/two-factor-password-form/models/two-factor-password-form-values.model';
import { toSecretGroups } from '@internal/identity-web-feature/lib/utils/secret-groups/secret-groups.utils';

/**
 * Component SecurityPageComponent
 * @class SecurityPageComponent
 *
 * @description
 * "Sécurité" administration page (D17, D36), laid out like a settings page in the project editor's
 * centred 920 px column: sections each with its title and description beside flat hairline rows
 * (stacked on a narrow column), for the optional one-time code (status and action), the trusted
 * devices and the connected MCP applications (D45, their own section component), and the dialogs
 * that enable it (password, then QR code or key, then a code) or disable it (password and code). The
 * pending secret lives only in this component while the enrollment dialog is open; closing the dialog
 * or leaving the page forgets it. Wrong passwords and codes are shown on their field, other failures
 * in a toast.
 */
@Component({
  selector: 'identity-security-page',
  imports: [
    AlertDirective,
    BadgeDirective,
    EMPTY_IMPORTS,
    ButtonDirective,
    ConnectedApplicationsSectionComponent,
    DialogDescriptionDirective,
    DialogHeaderDirective,
    DialogTitleDirective,
    NgIcon,
    PAGE_HEADER_IMPORTS,
    QrCodeComponent,
    SidebarTriggerComponent,
    SkeletonDirective,
    TooltipDirective,
    TwoFactorCodeFormComponent,
    TwoFactorDisableFormComponent,
    TwoFactorPasswordFormComponent,
  ],
  providers: [TwoFactorStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-w-0 flex-col' },
  templateUrl: './security-page.component.html',
})
export class SecurityPageComponent {
  // #region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped status and command states.
   *
   * @type {TwoFactorStoreType}
   */
  protected readonly store: TwoFactorStoreType = inject<TwoFactorStoreType>(TwoFactorStore);

  /**
   * Property dialogs
   * @readonly
   *
   * @description
   * Opens the enrollment and removal dialogs.
   *
   * @type {DialogService}
   */
  private readonly dialogs: DialogService = inject<DialogService>(DialogService);

  /**
   * Property toasts
   * @readonly
   *
   * @description
   * Administration toaster of the layout.
   *
   * @type {ToastService}
   */
  private readonly toasts: ToastService = inject<ToastService>(ToastService);

  /**
   * Property document
   * @readonly
   *
   * @description
   * Document whose window exposes the clipboard.
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property enrollContent
   * @readonly
   *
   * @description
   * Content of the enrollment dialog.
   */
  private readonly enrollContent: Signal<TemplateRef<unknown>> =
    viewChild.required<TemplateRef<unknown>>('enroll');

  /**
   * Property disableContent
   * @readonly
   *
   * @description
   * Content of the removal dialog.
   */
  private readonly disableContent: Signal<TemplateRef<unknown>> =
    viewChild.required<TemplateRef<unknown>>('remove');

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the code and trusted-device rows, the copy button and the load failure.
   */
  protected readonly icons: {
    readonly copy: typeof lucideCopy;
    readonly devices: typeof lucideMonitorSmartphone;
    readonly error: typeof lucideCircleAlert;
    readonly shield: typeof lucideShield;
  } = {
    copy: lucideCopy,
    devices: lucideMonitorSmartphone,
    error: lucideCircleAlert,
    shield: lucideShield,
  } as const;

  /**
   * Property material
   * @readonly
   *
   * @description
   * Pending secret and URI of the open enrollment, `null` on the password step and once the dialog
   * closes. Never copied to a store, web storage or the URL.
   *
   * @type {WritableSignal<TwoFactorMaterial | null>}
   */
  protected readonly material: WritableSignal<TwoFactorMaterial | null> =
    signal<TwoFactorMaterial | null>(null);

  /**
   * Property secretGroups
   * @readonly
   *
   * @description
   * Pending secret split by four characters for manual entry.
   *
   * @type {Signal<string>}
   */
  protected readonly secretGroups: Signal<string> = computed<string>(() =>
    toSecretGroups(this.material()?.secret ?? '').join(' '),
  );

  /**
   * Property passwordError
   * @readonly
   *
   * @description
   * Refusal of the password in the open dialog.
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly passwordError: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property codeError
   * @readonly
   *
   * @description
   * Refusal of the code in the open dialog.
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly codeError: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property ref
   *
   * @description
   * Open dialog, `null` while none is open; a second click never stacks another one.
   *
   * @type {DialogRef<unknown> | null}
   */
  private ref: DialogRef<unknown> | null = null;
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Reads the status and closes an open dialog, with its secret, when the page is left.
   */
  public constructor() {
    void this.store.load();
    inject<DestroyRef>(DestroyRef).onDestroy(() => this.ref?.close());
  }
  // #endregion

  // #region Methods
  /**
   * Method openEnable
   * @method openEnable
   *
   * @description
   * Opens the enrollment dialog on its password step.
   */
  protected openEnable(): void {
    this.open(
      this.enrollContent(),
      $localize`:@@admin.security.enable.dialogLabel:Activer la double authentification`,
      'md',
    );
  }

  /**
   * Method openDisable
   * @method openDisable
   *
   * @description
   * Opens the removal dialog.
   */
  protected openDisable(): void {
    this.open(
      this.disableContent(),
      $localize`:@@admin.security.disable.dialogLabel:Désactiver la double authentification`,
      'sm',
    );
  }

  /**
   * Method close
   * @method close
   *
   * @description
   * Closes the open dialog, which forgets its secret and errors.
   */
  protected close(): void {
    this.ref?.close();
  }

  /**
   * Method confirmPassword
   * @method confirmPassword
   *
   * @description
   * Enrollment step 1: a confirmed password moves to the QR code; an answer arriving after the dialog
   * closed is discarded with its secret.
   *
   * @param {TwoFactorPasswordFormValues} values - Valid password form values.
   *
   * @returns {Promise<void>} Resolves once the answer is handled.
   */
  protected async confirmPassword(values: TwoFactorPasswordFormValues): Promise<void> {
    const ref: DialogRef<unknown> | null = this.ref;
    this.passwordError.set(null);
    const material: TwoFactorMaterial | null = await this.store.setup(values.password);
    if (ref === null || ref !== this.ref) return;
    if (material) {
      this.material.set(material);
      return;
    }
    this.report(this.store.setupCallState().error);
  }

  /**
   * Method confirmCode
   * @method confirmCode
   *
   * @description
   * Enrollment step 2: a right code activates the second factor and closes the dialog.
   *
   * @param {TwoFactorCodeFormValues} values - Valid code form values.
   *
   * @returns {Promise<void>} Resolves once the answer is handled.
   */
  protected async confirmCode(values: TwoFactorCodeFormValues): Promise<void> {
    this.codeError.set(null);
    if (await this.store.enable(values.totp)) {
      this.close();
      this.toasts.success(TWO_FACTOR_TOASTS.enabled);
      return;
    }
    this.report(this.store.enableCallState().error);
  }

  /**
   * Method confirmDisable
   * @method confirmDisable
   *
   * @description
   * Removal: both factors right disable the second factor and close the dialog.
   *
   * @param {TwoFactorDisableFormValues} values - Valid removal form values.
   *
   * @returns {Promise<void>} Resolves once the answer is handled.
   */
  protected async confirmDisable(values: TwoFactorDisableFormValues): Promise<void> {
    this.passwordError.set(null);
    this.codeError.set(null);
    if (await this.store.disable({ password: values.password, totp: values.totp })) {
      this.close();
      this.toasts.success(TWO_FACTOR_TOASTS.disabled);
      return;
    }
    this.report(this.store.disableCallState().error);
  }

  /**
   * Method copySecret
   * @method copySecret
   *
   * @description
   * Copies the ungrouped secret to the clipboard and confirms it in a toast.
   *
   * @returns {Promise<void>} Resolves once the clipboard answered.
   */
  protected async copySecret(): Promise<void> {
    const secret: string | undefined = this.material()?.secret;
    const clipboard: Clipboard | undefined = this.document.defaultView?.navigator.clipboard;
    if (!secret) return;
    try {
      if (!clipboard) throw new Error('Clipboard unavailable.');
      await clipboard.writeText(secret);
      this.toasts.success(TWO_FACTOR_TOASTS.copied);
    } catch {
      this.toasts.error(TWO_FACTOR_TOASTS.copyFailed);
    }
  }

  /**
   * Method open
   * @method open
   *
   * @description
   * Opens a dialog unless one is open, with fresh command states and errors; its closing forgets the
   * secret.
   *
   * @param {TemplateRef<unknown>} content - Dialog template.
   * @param {string} ariaLabel - Accessible name of the dialog.
   * @param {DialogSize} size - Catalogue width: `md` for the enrollment (QR code beside the key),
   * `sm` for the two-field removal.
   */
  private open(content: TemplateRef<unknown>, ariaLabel: string, size: DialogSize): void {
    if (this.ref || this.store.writing()) {
      return;
    }
    this.store.resetCommands();
    this.material.set(null);
    this.passwordError.set(null);
    this.codeError.set(null);
    const ref: DialogRef<unknown> = this.dialogs.open(content, {
      ariaLabel,
      size,
      class: 'gap-5',
    });
    this.ref = ref;
    ref.closed.subscribe(() => {
      if (this.ref === ref) this.ref = null;
      this.material.set(null);
      this.passwordError.set(null);
      this.codeError.set(null);
    });
  }

  /**
   * Method report
   * @method report
   *
   * @description
   * Places a wrong password or code on its field; any other failure goes to a toast, and a state
   * conflict also closes the dialog since the store reloads the status.
   *
   * @param {TwoFactorFailure} failure - Failure of the last command, `null` when it was ignored.
   */
  private report(failure: TwoFactorFailure): void {
    if (failure === null) {
      return;
    }
    // TWO_FACTOR_ERROR_CODES: the browser imports no value from the contracts (D10).
    if (failure.code === 'identity.password-mismatch') {
      this.passwordError.set(failure.message);
    } else if (failure.code === 'identity.totp-invalid') {
      this.codeError.set(failure.message);
    } else {
      if (failure.code === 'identity.totp-state') this.close();
      this.toasts.error(failure.message);
    }
  }
  // #endregion
}
