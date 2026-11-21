import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
  type ElementRef,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { FormField, form, validate, type FieldState, type FieldTree } from '@angular/forms/signals';
import { NgIcon } from '@ng-icons/core';
import { lucideCircleAlert, lucideCircleCheck } from '@ng-icons/lucide';
import {
  AlertDirective,
  AlertTitleDirective,
  ButtonDirective,
  ConfirmDialogService,
  FieldComponent,
  FieldSetDirective,
  InputDirective,
  KbdDirective,
  ModifierKeyService,
} from '@vfortin/ui';
import { FAQ_ENTRY_LIMITS } from '@internal/content-web-feature-admin/lib/constants/faq-entry-limits.constants';
import type { ContentLocale } from '@internal/content-web-feature-admin/lib/models/content-locale/content-locale.type';
import type { LocaleFieldState } from '@internal/content-web-feature-admin/lib/models/locale-field-state/locale-field-state.type';
import { LocaleSwitchComponent } from '@internal/content-web-feature-admin/lib/ui/components/locale-switch/locale-switch.component';
import type { FaqEntryFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/faq-entry-form/models/faq-entry-form-values.model';

/**
 * Type TextKey
 *
 * @description
 * Localized fields of the form.
 */
type TextKey = 'question' | 'answer';

/**
 * Type FormError
 *
 * @description
 * Validation error returned by the form rules.
 */
type FormError = { kind: string; message: string } | null;

/**
 * Component FaqEntryFormComponent
 * @class FaqEntryFormComponent
 *
 * @description
 * Bilingual FAQ entry editor, built like the timeline entry form: the question (one line) and its
 * plain-text answer (a textarea whose line breaks are kept), counters within the contract bounds,
 * each field switching between its French and English text with the language selector joined to it
 * (its menu marks a language still empty or in error), and a sticky save bar (« Abandonner » after a
 * confirmation, « Enregistrer » with Ctrl/Cmd+S from the page). A question is public at once, so both
 * languages are required. Server field errors stay on their fields until the value sent changes. Copy
 * is French source with English targets.
 */
@Component({
  selector: 'content-faq-entry-form',
  imports: [
    AlertDirective,
    AlertTitleDirective,
    ButtonDirective,
    FieldComponent,
    FieldSetDirective,
    FormField,
    InputDirective,
    KbdDirective,
    LocaleSwitchComponent,
    NgIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './faq-entry-form.component.html',
})
export class FaqEntryFormComponent {
  // #region Properties
  /**
   * Property values
   * @readonly
   *
   * @description
   * Values to edit; each new object resets the form.
   *
   * @type {InputSignal<FaqEntryFormValues>}
   */
  public readonly values: InputSignal<FaqEntryFormValues> = input.required<FaqEntryFormValues>();

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether a write is running: the fields are disabled.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly pending: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property creating
   * @readonly
   *
   * @description
   * Whether the values are a new question: a clean form may still be saved once valid.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly creating: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property serverErrors
   * @readonly
   *
   * @description
   * Field errors of the last refused write, with the API's paths (`question.en`, `answer.fr`).
   *
   * @type {InputSignal<readonly { readonly field: string; readonly message: string }[]>}
   */
  public readonly serverErrors: InputSignal<
    readonly { readonly field: string; readonly message: string }[]
  > = input<readonly { readonly field: string; readonly message: string }[]>([]);

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the valid values to save.
   *
   * @type {OutputEmitterRef<FaqEntryFormValues>}
   */
  public readonly submitted: OutputEmitterRef<FaqEntryFormValues> = output<FaqEntryFormValues>();

  /**
   * Property shown
   * @readonly
   *
   * @description
   * Language each localized field shows; a submit with errors switches a field to its language in
   * error.
   *
   * @type {WritableSignal<Readonly<Record<TextKey, ContentLocale>>>}
   */
  protected readonly shown: WritableSignal<Readonly<Record<TextKey, ContentLocale>>> = signal<
    Readonly<Record<TextKey, ContentLocale>>
  >({ question: 'fr', answer: 'fr' });

  /**
   * Property fields
   * @readonly
   *
   * @description
   * Localized fields with their label, bound and control.
   */
  protected readonly fields: readonly {
    readonly key: TextKey;
    readonly label: string;
    readonly max: number;
    readonly multiline: boolean;
  }[] = [
    {
      key: 'question',
      label: $localize`:@@admin.faq.form.question:Question`,
      max: FAQ_ENTRY_LIMITS.question,
      multiline: false,
    },
    {
      key: 'answer',
      label: $localize`:@@admin.faq.form.answer:Réponse`,
      max: FAQ_ENTRY_LIMITS.answer,
      multiline: true,
    },
  ];

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the alert and the save bar.
   */
  protected readonly icons: {
    readonly alert: typeof lucideCircleAlert;
    readonly saved: typeof lucideCircleCheck;
  } = { alert: lucideCircleAlert, saved: lucideCircleCheck } as const;

  /**
   * Property modifier
   * @readonly
   *
   * @description
   * Platform modifier shown on the save shortcut.
   *
   * @type {ModifierKeyService}
   */
  protected readonly modifier: ModifierKeyService = inject<ModifierKeyService>(ModifierKeyService);

  /**
   * Property confirmations
   * @readonly
   *
   * @description
   * Asks before discarding changes.
   *
   * @type {ConfirmDialogService}
   */
  private readonly confirmations: ConfirmDialogService =
    inject<ConfirmDialogService>(ConfirmDialogService);

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Injector of the focus moves after a discard.
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject<Injector>(Injector);

  /**
   * Property status
   * @readonly
   *
   * @description
   * Save status of the save bar, focused after a discard.
   *
   * @type {Signal<ElementRef<HTMLElement> | undefined>}
   */
  private readonly status: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('status');

  /**
   * Property sentValues
   * @readonly
   *
   * @description
   * Values of the last submission, to keep a server error on its field until that value changes.
   *
   * @type {WritableSignal<FaqEntryFormValues | null>}
   */
  private readonly sentValues: WritableSignal<FaqEntryFormValues | null> =
    signal<FaqEntryFormValues | null>(null);

  /**
   * Property model
   * @readonly
   *
   * @description
   * Form model.
   *
   * @type {WritableSignal<FaqEntryFormValues>}
   */
  private readonly model: WritableSignal<FaqEntryFormValues> = signal<FaqEntryFormValues>({
    question: { fr: '', en: '' },
    answer: { fr: '', en: '' },
  });

  /**
   * Property entryForm
   * @readonly
   *
   * @description
   * Signal Form over the model with the contract's rules (D10 browser copy).
   *
   * @type {FieldTree<FaqEntryFormValues, string | number, 'writable'>}
   */
  protected readonly entryForm: FieldTree<FaqEntryFormValues, string | number, 'writable'> = form(
    this.model,
    (path): void => {
      for (const field of this.fields) {
        for (const locale of ['fr', 'en'] as const) {
          validate(path[field.key][locale], ({ value }): FormError => {
            const text: string = value().trim();
            if (text === '')
              return {
                kind: 'required',
                message:
                  locale === 'fr'
                    ? $localize`:@@admin.faq.form.error.frRequired:Le texte français est obligatoire.`
                    : $localize`:@@admin.faq.form.error.enRequired:Le texte anglais est obligatoire : la question est publiée dès son enregistrement.`,
              };
            if (text.length > field.max)
              return {
                kind: 'maxLength',
                message: $localize`:@@admin.faq.form.error.maxLength:${field.max}:max: caractères maximum.`,
              };
            return this.serverError(field.key, locale, value());
          });
        }
      }
    },
  );

  /**
   * Property dirty
   * @readonly
   *
   * @description
   * Whether the form holds unsaved changes.
   *
   * @type {Signal<boolean>}
   */
  public readonly dirty: Signal<boolean> = computed<boolean>((): boolean =>
    this.entryForm().dirty(),
  );

  /**
   * Property canSave
   * @readonly
   *
   * @description
   * Whether « Enregistrer » is offered: changes to save, or a new question.
   *
   * @type {Signal<boolean>}
   */
  protected readonly canSave: Signal<boolean> = computed<boolean>(
    (): boolean => !this.pending() && (this.dirty() || this.creating()),
  );

  /**
   * Property summary
   * @readonly
   *
   * @description
   * Message above the form once a submission found errors.
   *
   * @type {Signal<string | null>}
   */
  protected readonly summary: Signal<string | null> = computed<string | null>((): string | null => {
    const state: FieldState<FaqEntryFormValues, string | number> = this.entryForm();
    return state.touched() && state.invalid()
      ? $localize`:@@admin.faq.form.summary:Corrigez les champs signalés, en français et en anglais, avant d’enregistrer.`
      : null;
  });
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Resets the form, and forgets the last submission, whenever new values arrive; shows the fields
   * refused by the API in the language in error.
   */
  public constructor() {
    effect((): void => {
      const values: FaqEntryFormValues = this.values();
      untracked((): void => {
        this.entryForm().reset(structuredClone(values));
        this.sentValues.set(null);
      });
    });
    effect((): void => {
      if (this.serverErrors().length > 0) untracked((): void => this.revealErrors());
    });
  }
  // #endregion

  // #region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Emits the values when valid; otherwise shows every error and opens a language in error.
   */
  public submit(): void {
    if (this.pending()) return;
    const state: FieldState<FaqEntryFormValues, string | number> = this.entryForm();
    if (state.invalid()) {
      state.markAsTouched();
      this.revealErrors();
      return;
    }
    const values: FaqEntryFormValues = structuredClone(this.model());
    this.sentValues.set(values);
    this.submitted.emit(structuredClone(values));
  }

  /**
   * Method onSubmit
   * @method onSubmit
   *
   * @description
   * Native submission (Enter in the question, « Enregistrer »).
   *
   * @param {Event} event - Submit event.
   */
  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.submit();
  }

  /**
   * Method discard
   * @method discard
   *
   * @description
   * Restores the loaded values once confirmed, then focuses the save status.
   *
   * @returns {Promise<void>} Completion after the decision.
   */
  protected async discard(): Promise<void> {
    if (this.pending() || !this.dirty()) return;
    const accepted: boolean = await this.confirmations.confirm({
      title: $localize`:@@admin.faq.confirm.discard.title:Abandonner les modifications ?`,
      description: $localize`:@@admin.faq.confirm.changesLost:Les modifications de cette question seront perdues.`,
      confirmLabel: $localize`:@@admin.faq.confirm.discard.confirm:Abandonner`,
      cancelLabel: $localize`:@@admin.faq.confirm.keepEditing:Continuer la modification`,
      tone: 'danger',
    });
    if (!accepted || this.pending()) return;
    this.entryForm().reset(structuredClone(this.values()));
    afterNextRender(
      { read: (): void => this.status()?.nativeElement.focus() },
      { injector: this.injector },
    );
  }

  /**
   * Method textError
   * @method textError
   *
   * @description
   * Visible error of a localized field, once touched or after a refused write.
   *
   * @param {TextKey} key - Field.
   * @param {ContentLocale} locale - Language.
   *
   * @returns {string | null} Message, or `null`.
   */
  protected textError(key: TextKey, locale: ContentLocale): string | null {
    const state: FieldState<string, string | number> = this.entryForm[key][locale]();
    return state.touched() || this.serverErrors().length > 0
      ? (state.errors()[0]?.message ?? null)
      : null;
  }

  /**
   * Method fieldName
   * @method fieldName
   *
   * @description
   * Accessible name of a localized control: its label and the language it shows.
   *
   * @param {string} label - Field label.
   * @param {ContentLocale} locale - Language shown.
   *
   * @returns {string} Name, « Question en français ».
   */
  protected fieldName(label: string, locale: ContentLocale): string {
    return locale === 'fr'
      ? $localize`:@@admin.faq.form.inFrench:${label}:label: en français`
      : $localize`:@@admin.faq.form.inEnglish:${label}:label: en anglais`;
  }

  /**
   * Method textLength
   * @method textLength
   *
   * @description
   * Trimmed length of a localized field, for its counter.
   *
   * @param {TextKey} key - Field.
   * @param {ContentLocale} locale - Language.
   *
   * @returns {number} Length.
   */
  protected textLength(key: TextKey, locale: ContentLocale): number {
    return this.entryForm[key][locale]().value().trim().length;
  }

  /**
   * Method show
   * @method show
   *
   * @description
   * Shows a field in a language.
   *
   * @param {TextKey} key - Field.
   * @param {ContentLocale} locale - Language.
   */
  protected show(key: TextKey, locale: ContentLocale): void {
    this.shown.update(
      (
        shown: Readonly<Record<TextKey, ContentLocale>>,
      ): Readonly<Record<TextKey, ContentLocale>> => ({ ...shown, [key]: locale }),
    );
  }

  /**
   * Method localeStates
   * @method localeStates
   *
   * @description
   * State of each language of a field for its switch: a shown error, else an empty text, else filled.
   *
   * @param {TextKey} key - Field.
   *
   * @returns {Readonly<Record<ContentLocale, LocaleFieldState>>} States.
   */
  protected localeStates(key: TextKey): Readonly<Record<ContentLocale, LocaleFieldState>> {
    const state = (locale: ContentLocale): LocaleFieldState =>
      this.textError(key, locale)
        ? 'error'
        : this.textLength(key, locale) === 0
          ? 'empty'
          : 'filled';
    return { fr: state('fr'), en: state('en') };
  }

  /**
   * Method describedBy
   * @method describedBy
   *
   * @description
   * `aria-describedby` of a control: its error, then its counter.
   *
   * @param {string} id - Control identifier.
   * @param {string | null} error - Visible error.
   *
   * @returns {string} Identifiers.
   */
  protected describedBy(id: string, error: string | null): string {
    return error ? `${id}-error ${id}-count` : `${id}-count`;
  }

  /**
   * Method revealErrors
   * @method revealErrors
   *
   * @description
   * Switches each field whose shown language is valid to its other language when that one holds an
   * error.
   */
  private revealErrors(): void {
    const shown: Record<TextKey, ContentLocale> = { ...this.shown() };
    for (const field of this.fields) {
      const current: ContentLocale = shown[field.key];
      const other: ContentLocale = current === 'fr' ? 'en' : 'fr';
      if (
        !this.entryForm[field.key][current]().invalid() &&
        this.entryForm[field.key][other]().invalid()
      )
        shown[field.key] = other;
    }
    this.shown.set(shown);
  }

  /**
   * Method serverError
   * @method serverError
   *
   * @description
   * Server error of a field while its value is still the one sent.
   *
   * @param {TextKey} key - Field.
   * @param {ContentLocale} locale - Language.
   * @param {string} value - Current value.
   *
   * @returns {FormError} Error, or `null`.
   */
  private serverError(key: TextKey, locale: ContentLocale, value: string): FormError {
    const sent: FaqEntryFormValues | null = this.sentValues();
    if (!sent || sent[key][locale] !== value) return null;
    const error: { readonly field: string; readonly message: string } | undefined =
      this.serverErrors().find(
        (candidate: { readonly field: string }): boolean => candidate.field === `${key}.${locale}`,
      );
    return error ? { kind: 'server', message: error.message } : null;
  }
  // #endregion
}
