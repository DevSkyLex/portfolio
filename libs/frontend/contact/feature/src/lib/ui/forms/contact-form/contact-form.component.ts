import {
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  type FieldState,
  type FieldTree,
  FormField,
  email,
  form,
  maxLength,
  minLength,
  required,
  submit,
  validate,
  type ValidationError,
} from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { lucideCircleAlert, lucideSend } from '@ng-icons/lucide';
import { CONTACT_FORM_LIMITS } from '@internal/contact-web-feature/lib/ui/forms/contact-form/constants/contact-form-limits.constants';
import type { ContactFormServerError } from '@internal/contact-web-feature/lib/ui/forms/contact-form/models/contact-form-server-error.interface';
import {
  AlertDescriptionDirective,
  AlertDirective,
  AlertTitleDirective,
  ButtonDirective,
  FieldComponent,
  InputDirective,
  SelectComponent,
  SelectOptionComponent,
  TextareaDirective,
} from '@vfortin/ui';
import { CONTACT_FORM_FIELDS } from '@internal/contact-web-feature/lib/ui/forms/contact-form/constants/contact-form-fields.constants';
import { CONTACT_FORM_MESSAGES } from '@internal/contact-web-feature/lib/ui/forms/contact-form/constants/contact-form-messages.constants';
import { EMPTY_CONTACT_FORM } from '@internal/contact-web-feature/lib/ui/forms/contact-form/constants/empty-contact-form.constants';
import type { ContactFormFieldName } from '@internal/contact-web-feature/lib/ui/forms/contact-form/models/contact-form-field-name.type';
import type { ContactFormValues } from '@internal/contact-web-feature/lib/ui/forms/contact-form/models/contact-form-values.model';
import { CONTACT_SUBJECT_OPTIONS } from '@internal/contact-web-feature/lib/ui/forms/contact-form/options/contact-subject-options.constants';

/**
 * Component ContactFormComponent
 * @class ContactFormComponent
 *
 * @description
 * Public contact form: owns its Signal Form, the error summary and the invisible honeypot (D15).
 * Valid values leave through `submitted`; the section sends them and returns the server field errors,
 * which stay on their fields until the value changes.
 */
@Component({
  selector: 'contact-form',
  imports: [
    AlertDescriptionDirective,
    AlertDirective,
    AlertTitleDirective,
    ButtonDirective,
    FieldComponent,
    FormField,
    InputDirective,
    NgIcon,
    RouterLink,
    SelectComponent,
    SelectOptionComponent,
    TextareaDirective,
  ],
  templateUrl: './contact-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactFormComponent {
  // #region Properties
  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether the message is being sent; the submit button shows the progress and is disabled.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly pending: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property failure
   * @readonly
   *
   * @description
   * Message of a whole-request failure (rate limit, network), shown in the error summary when no
   * field is to be corrected.
   *
   * @type {InputSignal<string | null>}
   */
  public readonly failure: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property serverErrors
   * @readonly
   *
   * @description
   * Field errors returned by the API for the last submitted values.
   *
   * @type {InputSignal<readonly ContactFormServerError[]>}
   */
  public readonly serverErrors: InputSignal<readonly ContactFormServerError[]> = input<
    readonly ContactFormServerError[]
  >([]);

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Valid form values, emitted on submission.
   *
   * @type {OutputEmitterRef<ContactFormValues>}
   */
  public readonly submitted: OutputEmitterRef<ContactFormValues> = output<ContactFormValues>();

  /**
   * Property host
   * @readonly
   *
   * @description
   * Form host element used to focus the first invalid control.
   *
   * @type {ElementRef<HTMLElement>}
   */
  private readonly host: ElementRef<HTMLElement> = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Current injector passed to `afterNextRender` for safe focus scheduling.
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject<Injector>(Injector);

  /**
   * Property limits
   * @readonly
   *
   * @description
   * Contract-aligned field lengths used by validation and message length display.
   *
   * @type {typeof CONTACT_FORM_LIMITS}
   */
  protected readonly limits: typeof CONTACT_FORM_LIMITS = CONTACT_FORM_LIMITS;

  /**
   * Property subjects
   * @readonly
   *
   * @description
   * Localized subject choices offered in the select.
   *
   * @type {typeof CONTACT_SUBJECT_OPTIONS}
   */
  protected readonly subjects: typeof CONTACT_SUBJECT_OPTIONS = CONTACT_SUBJECT_OPTIONS;

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Icons of the error summary and the submit button.
   */
  protected readonly icons: {
    readonly alert: typeof lucideCircleAlert;
    readonly send: typeof lucideSend;
  } = { alert: lucideCircleAlert, send: lucideSend } as const;

  /**
   * Property sentValues
   * @readonly
   *
   * @description
   * Values of the last submission, against which server field errors are matched.
   *
   * @type {WritableSignal<ContactFormValues | null>}
   */
  private readonly sentValues: WritableSignal<ContactFormValues | null> =
    signal<ContactFormValues | null>(null);

  /**
   * Property model
   * @readonly
   *
   * @description
   * Form values, blank at creation; the section recreates the form for a new message.
   *
   * @type {WritableSignal<ContactFormValues>}
   */
  private readonly model: WritableSignal<ContactFormValues> = signal<ContactFormValues>({
    ...EMPTY_CONTACT_FORM,
  });

  /**
   * Property contactForm
   * @readonly
   *
   * @description
   * Signal Forms tree with the contact contract's required fields and text length constraints, plus
   * the server field errors of the last submission.
   *
   * @type {FieldTree<ContactFormValues>}
   */
  protected readonly contactForm: FieldTree<ContactFormValues> = form(this.model, (path) => {
    required(path.name, { message: CONTACT_FORM_MESSAGES.name });
    maxLength(path.name, CONTACT_FORM_LIMITS.name, { message: CONTACT_FORM_MESSAGES.name });
    maxLength(path.company, CONTACT_FORM_LIMITS.company, {
      message: CONTACT_FORM_MESSAGES.company,
    });
    required(path.email, { message: CONTACT_FORM_MESSAGES.email });
    email(path.email, { message: CONTACT_FORM_MESSAGES.email });
    maxLength(path.email, CONTACT_FORM_LIMITS.email, { message: CONTACT_FORM_MESSAGES.email });
    required(path.message, { message: CONTACT_FORM_MESSAGES.message });
    minLength(path.message, CONTACT_FORM_LIMITS.messageMin, {
      message: CONTACT_FORM_MESSAGES.message,
    });
    maxLength(path.message, CONTACT_FORM_LIMITS.messageMax, {
      message: CONTACT_FORM_MESSAGES.message,
    });
    for (const name of CONTACT_FORM_FIELDS) {
      validate(path[name], ({ value }) => this.serverError(name, value()));
    }
  });

  /**
   * Property attempted
   * @readonly
   *
   * @description
   * Whether submission has been attempted; when true, validation errors show on untouched fields.
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly attempted: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property invalidCount
   * @readonly
   *
   * @description
   * Number of contact fields currently returning a visible validation error.
   *
   * @type {Signal<number>}
   */
  protected readonly invalidCount: Signal<number> = computed<number>(
    () => CONTACT_FORM_FIELDS.filter((name) => this.error(name) !== null).length,
  );

  /**
   * Property length
   * @readonly
   *
   * @description
   * Current message character count displayed next to the message field.
   *
   * @type {Signal<number>}
   */
  protected readonly length: Signal<number> = computed<number>(() => this.model().message.length);
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Moves the focus to the first flagged control whenever the server returns field errors.
   */
  public constructor() {
    effect(() => {
      if (this.serverErrors().some((error) => this.isField(error.field))) {
        this.focusFirstError();
      }
    });
  }
  // #endregion

  // #region Methods
  /**
   * Method error
   * @method error
   *
   * @description
   * Returns the first validation message only after a submission attempt or field interaction.
   *
   * @param {ContactFormFieldName} name - Contact form field whose validation state is queried.
   *
   * @returns {string | null} Visible first error, or `null` while the field should remain quiet.
   */
  protected error(name: ContactFormFieldName): string | null {
    const state: FieldState<string, string> = this.contactForm[name]();
    if (!this.attempted() && !state.touched()) {
      return null;
    }
    return state.errors()[0]?.message ?? null;
  }

  /**
   * Method describedBy
   * @method describedBy
   *
   * @description
   * Selects the field's error id when invalid, otherwise its hint id when a hint exists.
   *
   * @param {ContactFormFieldName} name - Contact form field whose accessible description is requested.
   * @param {boolean} [hint] - Whether the caller has a hint to reference when there is no error.
   *
   * @returns {string | null} Id referenced by `aria-describedby`, or `null` when none applies.
   */
  protected describedBy(name: ContactFormFieldName, hint: boolean = false): string | null {
    if (this.error(name)) {
      return `contact-${name}-error`;
    }
    return hint ? `contact-${name}-hint` : null;
  }

  /**
   * Method send
   * @method send
   *
   * @description
   * Validates the form and emits its values, or focuses the first invalid control.
   *
   * @param {Event} event - Native submit event to prevent from performing browser navigation.
   *
   * @returns {Promise<void>} Resolves once the values are emitted or the focus is scheduled.
   */
  protected async send(event: Event): Promise<void> {
    event.preventDefault();
    this.attempted.set(true);
    await submit(this.contactForm, {
      action: async () => {
        const values: ContactFormValues = this.model();
        this.sentValues.set(values);
        this.submitted.emit(values);
      },
      onInvalid: () => this.focusFirstError(),
    });
  }

  /**
   * Method serverError
   * @method serverError
   *
   * @description
   * Server error of a field while it still holds the submitted value, with the localized message of
   * that field rather than the API wording.
   *
   * @param {ContactFormFieldName} name - Field validated.
   * @param {unknown} value - Current value of the field.
   *
   * @returns {ValidationError.WithoutFieldTree | null} The error, or `null` once the value changed.
   */
  private serverError(
    name: ContactFormFieldName,
    value: unknown,
  ): ValidationError.WithoutFieldTree | null {
    const sent: ContactFormValues | null = this.sentValues();
    if (!sent || sent[name] !== value || !this.serverErrors().some((e) => e.field === name)) {
      return null;
    }
    return { kind: 'server', message: CONTACT_FORM_MESSAGES[name] };
  }

  /**
   * Method isField
   * @method isField
   *
   * @description
   * Whether a server error names one of the form's fields.
   *
   * @param {string} field - Field named by the API.
   *
   * @returns {boolean} `true` for a known contact field.
   */
  private isField(field: string): boolean {
    return (CONTACT_FORM_FIELDS as readonly string[]).includes(field);
  }

  /**
   * Method focusFirstError
   * @method focusFirstError
   *
   * @description
   * Moves focus to the first control marked invalid, after the next render.
   */
  private focusFirstError(): void {
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      { injector: this.injector },
    );
  }
  // #endregion
}
