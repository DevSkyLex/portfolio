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
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import {
  ButtonDirective,
  DialogFooterDirective,
  FieldComponent,
  InputDirective,
  KbdHintComponent,
} from '@vfortin/ui';
import { ESCAPE_KEYS } from '@internal/identity-web-feature/lib/constants/dialog-keys.constants';
import type { TwoFactorPasswordFormValues } from '@internal/identity-web-feature/lib/ui/forms/two-factor-password-form/models/two-factor-password-form-values.model';

/**
 * Component TwoFactorPasswordFormComponent
 * @class TwoFactorPasswordFormComponent
 *
 * @description
 * First enrollment step (D17): the current password, asked again before a new secret is generated.
 * The page's refusal (`passwordError`) is attached to the field while it still holds the submitted
 * password, and retires as soon as the administrator edits it.
 */
@Component({
  selector: 'identity-two-factor-password-form',
  imports: [
    ButtonDirective,
    DialogFooterDirective,
    FieldComponent,
    FormField,
    InputDirective,
    KbdHintComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './two-factor-password-form.component.html',
})
export class TwoFactorPasswordFormComponent {
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
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the password when a valid form is submitted.
   *
   * @type {OutputEmitterRef<TwoFactorPasswordFormValues>}
   */
  public readonly submitted: OutputEmitterRef<TwoFactorPasswordFormValues> =
    output<TwoFactorPasswordFormValues>();

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
   * Last emitted password: the server refusal applies while the field still holds it.
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
   * @type {WritableSignal<TwoFactorPasswordFormValues>}
   */
  private readonly model: WritableSignal<TwoFactorPasswordFormValues> =
    signal<TwoFactorPasswordFormValues>({ password: '' });

  /**
   * Property passwordForm
   * @readonly
   *
   * @description
   * Signal Forms state: the contract's bounds plus the attached server refusal.
   */
  protected readonly passwordForm: FieldTree<
    TwoFactorPasswordFormValues,
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
      return message !== null && value() === this.sent() ? { kind: 'server', message } : null;
    });
  });

  /**
   * Property error
   * @readonly
   *
   * @description
   * Message of the password field once touched.
   *
   * @type {Signal<string | null>}
   */
  protected readonly error: Signal<string | null> = computed<string | null>(() =>
    this.passwordForm.password().touched()
      ? (this.passwordForm.password().errors()[0]?.message ?? null)
      : null,
  );
  // #endregion

  // #region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Validates the password and emits it unless the page is already waiting.
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
    await submit(this.passwordForm, {
      action: async () => {
        this.sent.set(this.model().password);
        this.submitted.emit(this.model());
      },
    });
  }
  // #endregion
}
