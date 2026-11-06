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
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import {
  FormField,
  form,
  REQUIRED,
  metadata,
  required,
  validate,
  type FieldState,
  type FieldTree,
} from '@angular/forms/signals';
import { NgIcon } from '@ng-icons/core';
import { lucideCircleAlert, lucideCircleCheck } from '@ng-icons/lucide';
import {
  AlertDirective,
  AlertTitleDirective,
  AutocompleteComponent,
  ButtonDirective,
  ConfirmDialogService,
  FieldComponent,
  FieldErrorDirective,
  FieldSetDirective,
  InputDirective,
  KbdDirective,
  ModifierKeyService,
  PeriodPickerComponent,
  TagsInputComponent,
  type PeriodBound,
} from '@vfortin/ui';
import { techKey } from '@vfortin/content-web-ui';
import { TIMELINE_ENTRY_LIMITS } from '@internal/content-web-feature-admin/lib/constants/timeline-entry-limits.constants';
import type { ContentLocale } from '@internal/content-web-feature-admin/lib/models/content-locale/content-locale.type';
import type { LocaleFieldState } from '@internal/content-web-feature-admin/lib/models/locale-field-state/locale-field-state.type';
import type { TimelineKindTexts } from '@internal/content-web-feature-admin/lib/models/timeline-kind-texts/timeline-kind-texts.interface';
import { LocaleSwitchComponent } from '@internal/content-web-feature-admin/lib/ui/components/locale-switch/locale-switch.component';
import type { TimelineEntryFormModel } from '@internal/content-web-feature-admin/lib/ui/forms/timeline-entry-form/models/timeline-entry-form-model.model';
import type { TimelineEntryFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/timeline-entry-form/models/timeline-entry-form-values.model';
import {
  toTimelineFormModel,
  toTimelineFormValues,
} from '@internal/content-web-feature-admin/lib/utils/timeline-form-period/timeline-form-period.utils';
import { timelineServerPath } from '@internal/content-web-feature-admin/lib/utils/timeline-server-path/timeline-server-path.utils';

/**
 * Type TextKey
 *
 * @description
 * Localized fields of the form.
 */
type TextKey = 'title' | 'place' | 'description';

/**
 * Type FormError
 *
 * @description
 * Validation error returned by the form rules.
 */
type FormError = { kind: string; message: string } | null;

/**
 * Component TimelineEntryFormComponent
 * @class TimelineEntryFormComponent
 *
 * @description
 * Bilingual timeline entry editor: the title, place and description (counters within the contract
 * bounds), each field switching between its French and English text with the language selector
 * joined to its end (its menu marks a language still empty or in error), and a sticky save bar (« Abandonner » after a confirmation, « Enregistrer » with
 * Ctrl/Cmd+S from the page). The period and technologies, shared by both languages, are the `settings`
 * template that the page renders in its properties panel, still fields of this Signal Form. An entry is
 * public at once, so both languages are required; the period is one `ui-period-picker` of months,
 * « En cours » leaving the end empty. Server field errors stay on their fields until the value sent
 * changes. Copy is French source with English targets.
 */
@Component({
  selector: 'content-timeline-entry-form',
  imports: [
    AlertDirective,
    AlertTitleDirective,
    AutocompleteComponent,
    ButtonDirective,
    FieldComponent,
    FieldErrorDirective,
    FieldSetDirective,
    FormField,
    InputDirective,
    KbdDirective,
    LocaleSwitchComponent,
    NgIcon,
    PeriodPickerComponent,
    TagsInputComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timeline-entry-form.component.html',
})
export class TimelineEntryFormComponent {
  // #region Properties
  /**
   * Property values
   * @readonly
   *
   * @description
   * Values to edit; each new object resets the form.
   *
   * @type {InputSignal<TimelineEntryFormValues>}
   */
  public readonly values: InputSignal<TimelineEntryFormValues> =
    input.required<TimelineEntryFormValues>();

  /**
   * Property texts
   * @readonly
   *
   * @description
   * Copy of the kind (placeholders).
   *
   * @type {InputSignal<TimelineKindTexts>}
   */
  public readonly texts: InputSignal<TimelineKindTexts> = input.required<TimelineKindTexts>();

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
   * Whether the values are a new entry: a clean form may still be saved once valid.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly creating: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property placeSuggestions
   * @readonly
   *
   * @description
   * Places offered by the « Lieu » field per language; the field still accepts any text.
   *
   * @type {InputSignal<Readonly<Record<ContentLocale, readonly string[]>>>}
   */
  public readonly placeSuggestions: InputSignal<
    Readonly<Record<ContentLocale, readonly string[]>>
  > = input<Readonly<Record<ContentLocale, readonly string[]>>>({ fr: [], en: [] });

  /**
   * Property serverErrors
   * @readonly
   *
   * @description
   * Field errors of the last refused write, with the API's paths.
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
   * @type {OutputEmitterRef<TimelineEntryFormValues>}
   */
  public readonly submitted: OutputEmitterRef<TimelineEntryFormValues> =
    output<TimelineEntryFormValues>();

  /**
   * Property settings
   * @readonly
   *
   * @description
   * Period and technologies, rendered by the page in its properties panel.
   *
   * @type {Signal<TemplateRef<unknown>>}
   */
  public readonly settings: Signal<TemplateRef<unknown>> =
    viewChild.required<TemplateRef<unknown>>('settings');

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
  >({ title: 'fr', place: 'fr', description: 'fr' });

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
      key: 'title',
      label: $localize`:@@admin.timeline.form.title:Intitulé`,
      max: TIMELINE_ENTRY_LIMITS.title,
      multiline: false,
    },
    {
      key: 'place',
      label: $localize`:@@admin.timeline.form.place:Lieu`,
      max: TIMELINE_ENTRY_LIMITS.place,
      multiline: false,
    },
    {
      key: 'description',
      label: $localize`:@@admin.timeline.form.description:Description`,
      max: TIMELINE_ENTRY_LIMITS.description,
      multiline: true,
    },
  ];

  /**
   * Property periodMin
   * @readonly
   *
   * @description
   * Earliest month of the period picker, the contract's first year.
   *
   * @type {PeriodBound}
   */
  protected readonly periodMin: PeriodBound = { year: TIMELINE_ENTRY_LIMITS.yearMin, month: 1 };

  /**
   * Property periodMax
   * @readonly
   *
   * @description
   * Latest month of the period picker: December five years ahead, within the contract.
   *
   * @type {PeriodBound}
   */
  protected readonly periodMax: PeriodBound = {
    year: Math.min(new Date().getFullYear() + 5, TIMELINE_ENTRY_LIMITS.yearMax),
    month: 12,
  };

  /**
   * Property techLimit
   * @readonly
   *
   * @description
   * Largest technology list.
   *
   * @type {number}
   */
  protected readonly techLimit: number = TIMELINE_ENTRY_LIMITS.techs;

  /**
   * Property normalizeTech
   * @readonly
   *
   * @description
   * Stores a typed technology as a catalogue key (`techKey`: trimmed, lowercase, an alias such as
   * `postgres` replaced by `postgresql`).
   *
   * @type {(raw: string) => string}
   */
  protected readonly normalizeTech: (raw: string) => string = techKey;

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
   * @type {WritableSignal<TimelineEntryFormModel | null>}
   */
  private readonly sentValues: WritableSignal<TimelineEntryFormModel | null> =
    signal<TimelineEntryFormModel | null>(null);

  /**
   * Property model
   * @readonly
   *
   * @description
   * Form model, the values with one period (`toTimelineFormModel`).
   *
   * @type {WritableSignal<TimelineEntryFormModel>}
   */
  private readonly model: WritableSignal<TimelineEntryFormModel> = signal<TimelineEntryFormModel>({
    title: { fr: '', en: '' },
    place: { fr: '', en: '' },
    description: { fr: '', en: '' },
    period: null,
    techs: [],
  });

  /**
   * Property entryForm
   * @readonly
   *
   * @description
   * Signal Form over the model with the contract's rules (D10 browser copy).
   *
   * @type {FieldTree<TimelineEntryFormModel, string | number, 'writable'>}
   */
  protected readonly entryForm: FieldTree<TimelineEntryFormModel, string | number, 'writable'> =
    form(this.model, (path): void => {
      for (const field of this.fields) {
        for (const locale of ['fr', 'en'] as const) {
          validate(path[field.key][locale], ({ value }): FormError => {
            const text: string = value().trim();
            if (text === '')
              return {
                kind: 'required',
                message:
                  locale === 'fr'
                    ? $localize`:@@admin.timeline.form.error.frRequired:Le texte français est obligatoire.`
                    : $localize`:@@admin.timeline.form.error.enRequired:Le texte anglais est obligatoire : l’entrée est publiée dès son enregistrement.`,
              };
            if (text.length > field.max)
              return {
                kind: 'maxLength',
                message: $localize`:@@admin.timeline.form.error.maxLength:${field.max}:max: caractères maximum.`,
              };
            return this.serverError(`${field.key}.${locale}`, value());
          });
        }
      }
      // The place's autocomplete takes `aria-required` from the field state, not from an attribute;
      // the emptiness error stays the trimmed check above.
      metadata(path.place.fr, REQUIRED, (): boolean => true);
      metadata(path.place.en, REQUIRED, (): boolean => true);
      required(path.period, {
        message: $localize`:@@admin.timeline.form.error.period:Choisissez le début, puis la fin ou « En cours ».`,
      });
      // The picker keeps the end after the start; the API's start and end errors land here.
      validate(path.period, ({ value }): FormError => this.serverError('period', value()));
      validate(path.techs, ({ value }): FormError => {
        const keys: string[] = value();
        if (
          keys.length > TIMELINE_ENTRY_LIMITS.techs ||
          keys.some((key: string): boolean => !TIMELINE_ENTRY_LIMITS.key.test(key))
        )
          return {
            kind: 'techs',
            message: $localize`:@@admin.timeline.form.error.techs:${TIMELINE_ENTRY_LIMITS.techs}:max: clés maximum, en minuscules et tirets (vue, ci-cd).`,
          };
        return this.serverError('techs', value());
      });
    });

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
   * Whether « Enregistrer » is offered: changes to save, or a new entry.
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
   * Message above the form once a submission found errors; it names the properties panel when only
   * the period or the technologies are wrong.
   *
   * @type {Signal<string | null>}
   */
  protected readonly summary: Signal<string | null> = computed<string | null>((): string | null => {
    const state: FieldState<TimelineEntryFormModel, string | number> = this.entryForm();
    if (!state.touched() || !state.invalid()) return null;
    const textsInvalid: boolean = this.fields.some(
      (field): boolean =>
        this.entryForm[field.key].fr().invalid() || this.entryForm[field.key].en().invalid(),
    );
    return textsInvalid
      ? $localize`:@@admin.timeline.form.summary.texts:Corrigez les champs signalés, en français et en anglais, avant d’enregistrer.`
      : $localize`:@@admin.timeline.form.summary.settings:Corrigez la période ou les technos dans le panneau Propriétés.`;
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
      const values: TimelineEntryFormValues = this.values();
      untracked((): void => {
        this.entryForm().reset(toTimelineFormModel(values));
        this.sentValues.set(null);
      });
    });
    // A refused write shows each field in the language its error is in.
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
    const state: FieldState<TimelineEntryFormModel, string | number> = this.entryForm();
    if (state.invalid()) {
      state.markAsTouched();
      this.revealErrors();
      return;
    }
    this.sentValues.set(structuredClone(this.model()));
    this.submitted.emit(toTimelineFormValues(this.model()));
  }

  /**
   * Method onSubmit
   * @method onSubmit
   *
   * @description
   * Native submission (Enter, « Enregistrer »).
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
      title: $localize`:@@admin.timeline.confirm.discard.title:Abandonner les modifications ?`,
      description: $localize`:@@admin.timeline.confirm.changesLost:Les modifications de cette entrée seront perdues.`,
      confirmLabel: $localize`:@@admin.timeline.confirm.discard.confirm:Abandonner`,
      cancelLabel: $localize`:@@admin.timeline.confirm.keepEditing:Continuer la modification`,
      tone: 'danger',
    });
    if (!accepted || this.pending()) return;
    this.entryForm().reset(toTimelineFormModel(this.values()));
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
   * Visible error of a localized field.
   *
   * @param {TextKey} key - Field.
   * @param {ContentLocale} locale - Language.
   *
   * @returns {string | null} Message, or `null`.
   */
  protected textError(key: TextKey, locale: ContentLocale): string | null {
    return this.visibleError(this.entryForm[key][locale]());
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
   * @returns {string} Name, « Intitulé en français ».
   */
  protected fieldName(label: string, locale: ContentLocale): string {
    return locale === 'fr'
      ? $localize`:@@admin.timeline.form.inFrench:${label}:label: en français`
      : $localize`:@@admin.timeline.form.inEnglish:${label}:label: en anglais`;
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
   *
   * @returns {void}
   */
  protected show(key: TextKey, locale: ContentLocale): void {
    this.shown.update(
      (
        shown: Readonly<Record<TextKey, ContentLocale>>,
      ): Readonly<Record<TextKey, ContentLocale>> => ({
        ...shown,
        [key]: locale,
      }),
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
   * Method settingError
   * @method settingError
   *
   * @description
   * Visible error of a shared setting.
   *
   * @param {'period' | 'techs'} key - Field.
   *
   * @returns {string | null} Message, or `null`.
   */
  protected settingError(key: 'period' | 'techs'): string | null {
    return this.visibleError(this.entryForm[key]());
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
   * @param {boolean} counter - Whether the control has a counter.
   *
   * @returns {string | null} Identifiers, or `null`.
   */
  protected describedBy(id: string, error: string | null, counter: boolean = false): string | null {
    const ids: string[] = [...(error ? [`${id}-error`] : []), ...(counter ? [`${id}-count`] : [])];
    return ids.length > 0 ? ids.join(' ') : null;
  }

  /**
   * Method visibleError
   * @method visibleError
   *
   * @description
   * First error of a field once touched or after a refused write.
   *
   * @param {FieldState<unknown, string | number>} state - Field state.
   *
   * @returns {string | null} Message, or `null`.
   */
  private visibleError(state: FieldState<unknown, string | number>): string | null {
    return state.touched() || this.serverErrors().length > 0
      ? (state.errors()[0]?.message ?? null)
      : null;
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
   * @param {string} field - Form path (`title.en`, `period`, `techs`).
   * @param {unknown} value - Current value.
   *
   * @returns {FormError} Error, or `null`.
   */
  private serverError(field: string, value: unknown): FormError {
    const sent: TimelineEntryFormModel | null = this.sentValues();
    if (!sent) return null;
    const before: unknown = field
      .split('.')
      .reduce<unknown>(
        (current: unknown, key: string): unknown =>
          current && typeof current === 'object'
            ? (current as Record<string, unknown>)[key]
            : undefined,
        sent,
      );
    if (JSON.stringify(before) !== JSON.stringify(value)) return null;
    const error: { readonly field: string; readonly message: string } | undefined =
      this.serverErrors().find(
        (candidate: { readonly field: string }): boolean =>
          timelineServerPath(candidate.field) === field,
      );
    return error ? { kind: 'server', message: error.message } : null;
  }
  // #endregion
}
