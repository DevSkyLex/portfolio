import {
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import {
  type FieldTree,
  FormField,
  form,
  maxLength,
  pattern,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import {
  ButtonDirective,
  DialogFooterDirective,
  FieldComponent,
  InputDirective,
  InputOtpComponent,
  InputOtpGroupDirective,
  InputOtpSeparatorComponent,
  InputOtpSlotComponent,
  KbdHintComponent,
} from '@vfortin/ui';
import { ESCAPE_KEYS } from '@internal/identity-web-feature/lib/constants/dialog-keys.constants';
import type { TwoFactorDisableFormValues } from '@internal/identity-web-feature/lib/ui/forms/two-factor-disable-form/models/two-factor-disable-form-values.model';

/**
 * Component TwoFactorDisableFormComponent
 * @class TwoFactorDisableFormComponent
 *
 * @description
 * Removal of the second factor (D17): the password and a current code, confirmed by a danger
 * button. Each server refusal stays on its own field until that field is edited.
 */
@Component({
  selector: 'identity-two-factor-disable-form',
  imports: [
    ButtonDirective,
    DialogFooterDirective,
    FieldComponent,
    FormField,
    InputDirective,
    InputOtpComponent,
    InputOtpGroupDirective,
    InputOtpSeparatorComponent,
    InputOtpSlotComponent,
    KbdHintComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './two-factor-disable-form.component.html',
})
export class TwoFactorDisableFormComponent {
  // #region Properties
  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether the page is waiting for the identity service; a submission meanwhile emits nothing.
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property passwordError
   * @readonly
   *
   * @description
   * Server refusal of the last submitted password, or `null`.
   *
   * @type {InputSignal<string | null>}
   */
  public readonly passwordError: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property codeError
   * @readonly
   *
   * @description
   * Server refusal of the last submitted code, or `null`.
   *
   * @type {InputSignal<string | null>}
   */
  public readonly codeError: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits both factors when a valid form is submitted.
   *
   * @type {OutputEmitterRef<TwoFactorDisableFormValues>}
   */
  public readonly submitted: OutputEmitterRef<TwoFactorDisableFormValues> =
    output<TwoFactorDisableFormValues>();

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * Emits when the administrator keeps the second factor.
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();

  /**
   * Property escapeKeys
   * @readonly
   *
   * @description
   * Key cap of the footer's cancel hint.
   *
   * @type {readonly string[]}
   */
  protected readonly escapeKeys: readonly string[] = ESCAPE_KEYS;

  /**
   * Property sent
   * @readonly
   *
   * @description
   * Last emitted values: each server refusal applies while its field still holds them.
   *
   * @type {WritableSignal<TwoFactorDisableFormValues | null>}
   */
  private readonly sent: WritableSignal<TwoFactorDisableFormValues | null> =
    signal<TwoFactorDisableFormValues | null>(null);

  /**
   * Property model
   * @readonly
   *
   * @description
   * Writable value of the form.
   *
   * @type {WritableSignal<TwoFactorDisableFormValues>}
   */
  private readonly model: WritableSignal<TwoFactorDisableFormValues> =
    signal<TwoFactorDisableFormValues>({ password: '', totp: '' });

  /**
   * Property disableForm
   * @readonly
   *
   * @description
   * Signal Forms state: the contract's bounds plus the attached server refusals.
   */
  protected readonly disableForm: FieldTree<
    TwoFactorDisableFormValues,
    string | number,
    'writable'
  > = form(this.model, (path) => {
    required(path.password, {
      message: $localize`:@@admin.security.validation.passwordRequired:Saisissez votre mot de passe.`,
    });
    maxLength(path.password, 200, {
      message: $localize`:@@admin.security.validation.passwordMaxLength:Le mot de passe compte au plus 200 caractères.`,
    });
    validate(path.password, ({ value }) => {
      const message: string | null = this.passwordError();
      return message !== null && value() === this.sent()?.password
        ? { kind: 'server', message }
        : null;
    });
    required(path.totp, {
      message: $localize`:@@admin.identity.validation.code:Saisissez les six chiffres du code.`,
    });
    pattern(path.totp, /^\d{6}$/, {
      message: $localize`:@@admin.identity.validation.code:Saisissez les six chiffres du code.`,
    });
    validate(path.totp, ({ value }) => {
      const message: string | null = this.codeError();
      return message !== null && value() === this.sent()?.totp ? { kind: 'server', message } : null;
    });
  });

  /**
   * Property passwordMessage
   * @readonly
   *
   * @description
   * Message of the password field once touched.
   *
   * @type {Signal<string | null>}
   */
  protected readonly passwordMessage: Signal<string | null> = computed<string | null>(() =>
    this.disableForm.password().touched()
      ? (this.disableForm.password().errors()[0]?.message ?? null)
      : null,
  );

  /**
   * Property codeMessage
   * @readonly
   *
   * @description
   * Message of the code field once touched.
   *
   * @type {Signal<string | null>}
   */
  protected readonly codeMessage: Signal<string | null> = computed<string | null>(() =>
    this.disableForm.totp().touched()
      ? (this.disableForm.totp().errors()[0]?.message ?? null)
      : null,
  );
  // #endregion

  // #region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Validates both factors and emits them unless the page is already waiting.
   *
   * @param {Event} event - Native submit event.
   *
   * @returns {Promise<void>} Resolves once the submission is handled.
   */
  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.pending()) {
      return;
    }
    await submit(this.disableForm, {
      action: async () => {
        this.sent.set({ ...this.model() });
        this.submitted.emit(this.model());
      },
    });
  }
  // #endregion
}
