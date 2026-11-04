import {
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { type FieldTree, FormField, form, pattern, required, submit } from '@angular/forms/signals';
import { NgIcon } from '@ng-icons/core';
import { lucideCircleAlert } from '@ng-icons/lucide';
import {
  AlertDirective,
  AlertTitleDirective,
  ButtonDirective,
  CheckboxComponent,
  InputOtpComponent,
  InputOtpGroupDirective,
  InputOtpSeparatorComponent,
  InputOtpSlotComponent,
} from '@vfortin/ui';
import type { LoginCodeFormValues } from '@internal/identity-web-feature/lib/ui/forms/login-code-form/models/login-code-form-values.model';

/**
 * Component LoginCodeFormComponent
 * @class LoginCodeFormComponent
 *
 * @description
 * Second login screen (D17, D36): the six-digit one-time code and "Faire confiance à cet appareil".
 * It takes the focus when it appears, submits itself as soon as the sixth digit is typed or pasted,
 * and emits the values while the page is not already waiting for an answer.
 */
@Component({
  selector: 'identity-login-code-form',
  imports: [
    AlertDirective,
    AlertTitleDirective,
    ButtonDirective,
    CheckboxComponent,
    FormField,
    InputOtpComponent,
    InputOtpGroupDirective,
    InputOtpSeparatorComponent,
    InputOtpSlotComponent,
    NgIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login-code-form.component.html',
})
export class LoginCodeFormComponent {
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
   * Property failure
   * @readonly
   *
   * @description
   * Localized rejection of the last code, or `null` when there is none.
   *
   * @type {InputSignal<string | null>}
   */
  public readonly failure: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the code and the trusted-device choice when a valid form is submitted.
   *
   * @type {OutputEmitterRef<LoginCodeFormValues>}
   */
  public readonly submitted: OutputEmitterRef<LoginCodeFormValues> = output<LoginCodeFormValues>();

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icon of the error notice.
   */
  protected readonly icons: { readonly alert: typeof lucideCircleAlert } = {
    alert: lucideCircleAlert,
  } as const;

  /**
   * Property otp
   * @readonly
   *
   * @description
   * Code field, focused when the form appears and after a wrong code.
   */
  private readonly otp: Signal<InputOtpComponent> =
    viewChild.required<InputOtpComponent>(InputOtpComponent);

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
   * Notice shown above the code: the validation message first, then the page's failure.
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
   * Writable value of the form.
   *
   * @type {WritableSignal<LoginCodeFormValues>}
   */
  private readonly model: WritableSignal<LoginCodeFormValues> = signal<LoginCodeFormValues>({
    totp: '',
    trustDevice: false,
  });

  /**
   * Property codeForm
   * @readonly
   *
   * @description
   * Signal Forms state: exactly six digits.
   */
  protected readonly codeForm: FieldTree<LoginCodeFormValues, string | number, 'writable'> = form(
    this.model,
    (path) => {
      required(path.totp);
      pattern(path.totp, /^\d{6}$/);
    },
  );
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Focuses the code field once the screen is rendered.
   */
  public constructor() {
    afterNextRender(() => this.otp().focus());
  }
  // #endregion

  // #region Methods
  /**
   * Method clear
   * @method clear
   *
   * @description
   * Empties the code after a rejection and gives it the focus back, keeping the trusted-device choice.
   */
  public clear(): void {
    this.model.update((value) => ({ ...value, totp: '' }));
    this.otp().focus();
  }

  /**
   * Method submit
   * @method submit
   *
   * @description
   * Sent by the button or as soon as the code field completes: validates the code and emits it, or
   * shows what to type.
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
        this.invalid.set(null);
        this.submitted.emit(this.model());
      },
      onInvalid: () =>
        this.invalid.set(
          $localize`:@@admin.identity.validation.code:Saisissez les six chiffres du code.`,
        ),
    });
  }
  // #endregion
}
