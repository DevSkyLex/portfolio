import {
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { type FieldTree, FormField, form, required, email, submit } from '@angular/forms/signals';
import { NgIcon } from '@ng-icons/core';
import { lucideCircleAlert, lucideEye, lucideEyeOff } from '@ng-icons/lucide';
import {
  AlertDirective,
  AlertTitleDirective,
  ButtonDirective,
  CheckboxComponent,
  FieldComponent,
  InputDirective,
} from '@vfortin/ui';
import type { CredentialsFormValues } from '@internal/identity-web-feature/lib/ui/forms/credentials-form/models/credentials-form-values.model';

/**
 * Component CredentialsFormComponent
 * @class CredentialsFormComponent
 *
 * @description
 * First login screen (D17, D36): e-mail, password with a reveal toggle and "Se souvenir de moi". It
 * owns its Signal Form, emits the values once they are valid, and shows the page's failure or its own
 * validation message above the fields.
 */
@Component({
  selector: 'identity-credentials-form',
  imports: [
    AlertDirective,
    AlertTitleDirective,
    ButtonDirective,
    CheckboxComponent,
    FieldComponent,
    FormField,
    InputDirective,
    NgIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './credentials-form.component.html',
})
export class CredentialsFormComponent {
  // #region Properties
  /**
   * Property initialValues
   * @readonly
   *
   * @description
   * Values the form starts from, such as the e-mail kept when the administrator comes back from the
   * code screen; `null` starts empty.
   *
   * @type {InputSignal<CredentialsFormValues | null>}
   */
  public readonly initialValues: InputSignal<CredentialsFormValues | null> =
    input<CredentialsFormValues | null>(null);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether the page is waiting for the identity service; disables the submit button.
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property failure
   * @readonly
   *
   * @description
   * French rejection of the last attempt, or `null` when there is none.
   *
   * @type {InputSignal<string | null>}
   */
  public readonly failure: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the credentials when a valid form is submitted.
   *
   * @type {OutputEmitterRef<CredentialsFormValues>}
   */
  public readonly submitted: OutputEmitterRef<CredentialsFormValues> =
    output<CredentialsFormValues>();

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the error notice and the password toggle.
   */
  protected readonly icons: {
    readonly alert: typeof lucideCircleAlert;
    readonly hide: typeof lucideEyeOff;
    readonly show: typeof lucideEye;
  } = {
    alert: lucideCircleAlert,
    hide: lucideEyeOff,
    show: lucideEye,
  } as const;

  /**
   * Property revealed
   * @readonly
   *
   * @description
   * Whether the password field shows its characters; the toggle never submits the form.
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly revealed: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property invalid
   * @readonly
   *
   * @description
   * Message of the last submission refused by the schema; cleared by a valid submission.
   *
   * @type {WritableSignal<string | null>}
   */
  private readonly invalid: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property message
   * @readonly
   *
   * @description
   * Notice shown above the fields: the validation message first, then the page's failure.
   *
   * @type {Signal<string | null>}
   */
  protected readonly message: Signal<string | null> = computed<string | null>(
    () => this.invalid() ?? this.failure(),
  );

  /**
   * Property model
   * @readonly
   *
   * @description
   * Writable value of the form, reset whenever the initial values change.
   *
   * @type {WritableSignal<CredentialsFormValues>}
   */
  private readonly model: WritableSignal<CredentialsFormValues> =
    linkedSignal<CredentialsFormValues>(
      () => this.initialValues() ?? { email: '', password: '', remember: false },
    );

  /**
   * Property credentialsForm
   * @readonly
   *
   * @description
   * Signal Forms state: both fields are required.
   */
  protected readonly credentialsForm: FieldTree<
    CredentialsFormValues,
    string | number,
    'writable'
  > = form(this.model, (path) => {
    required(path.email, { message: 'Renseignez votre adresse e-mail.' });
    email(path.email, { message: 'Saisissez une adresse e-mail valide.' });
    required(path.password);
  });

  /** Email schema errors are attached to the control once it has been touched or submitted. */
  protected readonly emailError: Signal<string | null> = computed<string | null>(() =>
    this.credentialsForm.email().touched()
      ? (this.credentialsForm.email().errors()[0]?.message ?? null)
      : null,
  );
  // #endregion

  // #region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Validates the form and emits its values, or shows what to fill in.
   *
   * @param {Event} event - Native submit event of the form.
   *
   * @returns {Promise<void>} Resolves once the submission is handled.
   */
  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.credentialsForm, {
      action: async () => {
        this.invalid.set(null);
        this.submitted.emit(this.model());
      },
      onInvalid: () => this.invalid.set('Renseignez l’adresse e-mail et le mot de passe.'),
    });
  }
  // #endregion
}
