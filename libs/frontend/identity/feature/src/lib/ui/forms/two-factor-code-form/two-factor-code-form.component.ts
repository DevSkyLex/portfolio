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
  pattern,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import {
  ButtonDirective,
  DialogFooterDirective,
  FieldComponent,
  InputOtpComponent,
  InputOtpGroupDirective,
  InputOtpSeparatorComponent,
  InputOtpSlotComponent,
  KbdHintComponent,
} from '@vfortin/ui';
import { ESCAPE_KEYS } from '@internal/identity-web-feature/lib/constants/dialog-keys.constants';
import type { TwoFactorCodeFormValues } from '@internal/identity-web-feature/lib/ui/forms/two-factor-code-form/models/two-factor-code-form-values.model';

/**
 * Component TwoFactorCodeFormComponent
 * @class TwoFactorCodeFormComponent
 *
 * @description
 * Last enrollment step (D17): the six-digit code generated from the pending secret, which activates
 * it. The page's refusal (`codeError`) stays on the field until the code is edited.
 */
@Component({
  selector: 'identity-two-factor-code-form',
  imports: [
    ButtonDirective,
    DialogFooterDirective,
    FieldComponent,
    FormField,
    InputOtpComponent,
    InputOtpGroupDirective,
    InputOtpSeparatorComponent,
    InputOtpSlotComponent,
    KbdHintComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './two-factor-code-form.component.html',
})
export class TwoFactorCodeFormComponent {
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
   * Emits the code when a valid form is submitted.
   *
   * @type {OutputEmitterRef<TwoFactorCodeFormValues>}
   */
  public readonly submitted: OutputEmitterRef<TwoFactorCodeFormValues> =
    output<TwoFactorCodeFormValues>();

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * Emits when the administrator gives up the enrollment.
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
   * Last emitted code: the server refusal applies while the field still holds it.
   *
   * @type {WritableSignal<string | null>}
   */
  private readonly sent: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property model
   * @readonly
   *
   * @description
   * Writable value of the form.
   *
   * @type {WritableSignal<TwoFactorCodeFormValues>}
   */
  private readonly model: WritableSignal<TwoFactorCodeFormValues> = signal<TwoFactorCodeFormValues>(
    { totp: '' },
  );

  /**
   * Property codeForm
   * @readonly
   *
   * @description
   * Signal Forms state: exactly six digits, plus the attached server refusal.
   */
  protected readonly codeForm: FieldTree<TwoFactorCodeFormValues, string | number, 'writable'> =
    form(this.model, (path) => {
      required(path.totp, {
        message: $localize`:@@admin.identity.validation.code:Saisissez les six chiffres du code.`,
      });
      pattern(path.totp, /^\d{6}$/, {
        message: $localize`:@@admin.identity.validation.code:Saisissez les six chiffres du code.`,
      });
      validate(path.totp, ({ value }) => {
        const message: string | null = this.codeError();
        return message !== null && value() === this.sent() ? { kind: 'server', message } : null;
      });
    });

  /**
   * Property error
   * @readonly
   *
   * @description
   * Message of the code field once touched.
   *
   * @type {Signal<string | null>}
   */
  protected readonly error: Signal<string | null> = computed<string | null>(() =>
    this.codeForm.totp().touched() ? (this.codeForm.totp().errors()[0]?.message ?? null) : null,
  );
  // #endregion

  // #region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Sent by the button or as soon as the sixth digit is in: validates the code and emits it unless
   * the page is already waiting.
   *
   * @param {Event} event - Native submit event, absent when the code field completes.
   *
   * @returns {Promise<void>} Resolves once the submission is handled.
   */
  protected async submit(event?: Event): Promise<void> {
    event?.preventDefault();
    if (this.pending()) {
      return;
    }
    await submit(this.codeForm, {
      action: async () => {
        this.sent.set(this.model().totp);
        this.submitted.emit(this.model());
      },
    });
  }
  // #endregion
}
