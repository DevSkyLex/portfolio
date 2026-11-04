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
import { DOCUMENT } from '@angular/common';
import {
  FormField,
  applyEach,
  form,
  validate,
  type FieldState,
  type FieldTree,
} from '@angular/forms/signals';
import { NgIcon } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucideCircleCheck,
  lucideGripVertical,
  lucideInfo,
  lucideLink,
  lucideTrash2,
} from '@ng-icons/lucide';
import type { ProfileLinkKind } from '@vfortin/content-web-data-access/admin';
import {
  AlertDirective,
  AlertTitleDirective,
  ButtonDirective,
  ConfirmDialogService,
  EMPTY_IMPORTS,
  FieldComponent,
  FieldErrorDirective,
  FieldSetDirective,
  InputDirective,
  KbdDirective,
  ModifierKeyService,
  SORTABLE_IMPORTS,
  SelectComponent,
  SelectOptionComponent,
  TooltipDirective,
  type SortableMove,
} from '@vfortin/ui';
import { PROFILE_LIMITS } from '@internal/content-web-feature-admin/lib/constants/profile-limits.constants';
import { PROFILE_LINK_KINDS } from '@internal/content-web-feature-admin/lib/constants/profile-link-kinds.constants';
import { PROFILE_TEXT_FIELDS } from '@internal/content-web-feature-admin/lib/constants/profile-text-fields.constants';
import type { ContentLocale } from '@internal/content-web-feature-admin/lib/models/content-locale/content-locale.type';
import type { LocaleFieldState } from '@internal/content-web-feature-admin/lib/models/locale-field-state/locale-field-state.type';
import type { ProfileLinkKindOption } from '@internal/content-web-feature-admin/lib/models/profile-link-kind-option/profile-link-kind-option.interface';
import type { ProfileTextField } from '@internal/content-web-feature-admin/lib/models/profile-text-field/profile-text-field.interface';
import { LocaleSwitchComponent } from '@internal/content-web-feature-admin/lib/ui/components/locale-switch/locale-switch.component';
import type { ProfileFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/profile-form/models/profile-form-values.model';

/**
 * Type FormError
 * @type FormError
 *
 * @description
 * Result of a field validator.
 */
type FormError = { kind: string; message: string } | null;

/**
 * Constant EMPTY_VALUES
 *
 * @description
 * Values before the first input arrives.
 */
const EMPTY_VALUES: ProfileFormValues = {
  heroIntro: { fr: '', en: '' },
  aboutStatement: { fr: '', en: '' },
  aboutLead: { fr: '', en: '' },
  facts: [],
  links: [],
};

/**
 * Component ProfileFormComponent
 * @class ProfileFormComponent
 *
 * @description
 * Profile form of the « Informations » page, laid out as settings sections (D36 settings page
 * revision): « Présentation » (the home introduction and the « À propos » texts), « Repères » (up to
 * 8 label/value facts) and « Liens » (up to 8 public links, for both languages), both reordered by
 * dragging a row's grip or with its arrow keys (`uiSortableList`), then the floating save bar. Each bilingual field shows one language, switched by the toggle joined to it
 * (`content-locale-switch`, as in the timeline editor: at the end of a one-line control, in a strip
 * under a textarea); an invalid submit or a refused save shows
 * each field in its language in error. Every text is required in French and
 * English, the profile being public at once; links need an `https://` address (an e-mail address
 * for an e-mail) and at most one link of each kind but « Site web ». Server field errors stay on
 * their field until its value changes; « Abandonner » asks before restoring the loaded values.
 */
@Component({
  selector: 'content-profile-form',
  imports: [
    AlertDirective,
    AlertTitleDirective,
    ButtonDirective,
    EMPTY_IMPORTS,
    FieldComponent,
    FieldErrorDirective,
    FieldSetDirective,
    FormField,
    InputDirective,
    KbdDirective,
    LocaleSwitchComponent,
    NgIcon,
    SORTABLE_IMPORTS,
    SelectComponent,
    SelectOptionComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col' },
  templateUrl: './profile-form.component.html',
})
export class ProfileFormComponent {
  // #region Properties
  /**
   * Property values
   * @readonly
   *
   * @description
   * Values loaded or last saved; a new value resets the form.
   *
   * @type {InputSignal<ProfileFormValues>}
   */
  public readonly values: InputSignal<ProfileFormValues> = input.required<ProfileFormValues>();

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether a save is running: the fields and the bar are disabled.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly pending: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property serverErrors
   * @readonly
   *
   * @description
   * Field errors of the last save, under the contract paths (`facts.0.label.en`, `links.1.url`).
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
   * Emits valid values to save.
   *
   * @type {OutputEmitterRef<ProfileFormValues>}
   */
  public readonly submitted: OutputEmitterRef<ProfileFormValues> = output<ProfileFormValues>();

  /**
   * Property shown
   * @readonly
   *
   * @description
   * Language each bilingual field shows, by contract path (`heroIntro`, `facts.0` for both texts of
   * a fact); a field absent from the map shows French.
   *
   * @type {WritableSignal<Readonly<Record<string, ContentLocale>>>}
   */
  protected readonly shown: WritableSignal<Readonly<Record<string, ContentLocale>>> = signal<
    Readonly<Record<string, ContentLocale>>
  >({});

  /**
   * Property texts
   * @readonly
   *
   * @description
   * Texts of the « Présentation » section.
   *
   * @type {readonly ProfileTextField[]}
   */
  protected readonly texts: readonly ProfileTextField[] = PROFILE_TEXT_FIELDS;

  /**
   * Property kinds
   * @readonly
   *
   * @description
   * Link kinds of the select.
   *
   * @type {readonly ProfileLinkKindOption[]}
   */
  protected readonly kinds: readonly ProfileLinkKindOption[] = PROFILE_LINK_KINDS;

  /**
   * Property limits
   * @readonly
   *
   * @description
   * Bounds shown beside the fields.
   *
   * @type {typeof PROFILE_LIMITS}
   */
  protected readonly limits: typeof PROFILE_LIMITS = PROFILE_LIMITS;

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the summary, the rows and the save bar.
   */
  protected readonly icons: {
    readonly alert: typeof lucideCircleAlert;
    readonly saved: typeof lucideCircleCheck;
    readonly grip: typeof lucideGripVertical;
    readonly facts: typeof lucideInfo;
    readonly links: typeof lucideLink;
    readonly remove: typeof lucideTrash2;
  } = {
    alert: lucideCircleAlert,
    saved: lucideCircleCheck,
    grip: lucideGripVertical,
    facts: lucideInfo,
    links: lucideLink,
    remove: lucideTrash2,
  } as const;

  /**
   * Property modifier
   * @readonly
   *
   * @description
   * Platform modifier shown in the save shortcut.
   *
   * @type {ModifierKeyService}
   */
  protected readonly modifier: ModifierKeyService = inject<ModifierKeyService>(ModifierKeyService);

  /**
   * Property confirmations
   * @readonly
   *
   * @description
   * Asks before discarding the changes.
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
   * Schedules the focus after a discard.
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject<Injector>(Injector);

  /**
   * Property status
   * @readonly
   *
   * @description
   * Save status of the bar, focused after a discard.
   *
   * @type {Signal<ElementRef<HTMLElement> | undefined>}
   */
  private readonly status: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('status');

  /**
   * Property document
   * @readonly
   *
   * @description
   * Document holding the fields to focus.
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property sentValues
   * @readonly
   *
   * @description
   * Values of the last submission, against which server errors are matched.
   *
   * @type {WritableSignal<ProfileFormValues | null>}
   */
  private readonly sentValues: WritableSignal<ProfileFormValues | null> =
    signal<ProfileFormValues | null>(null);

  /**
   * Property model
   * @readonly
   *
   * @description
   * Values edited by the form.
   *
   * @type {WritableSignal<ProfileFormValues>}
   */
  private readonly model: WritableSignal<ProfileFormValues> =
    signal<ProfileFormValues>(EMPTY_VALUES);

  /**
   * Property profileForm
   * @readonly
   *
   * @description
   * Signal Form of the profile; every validator also reports the server error of its path.
   *
   * @type {FieldTree<ProfileFormValues, string | number, 'writable'>}
   */
  protected readonly profileForm: FieldTree<ProfileFormValues, string | number, 'writable'> = form(
    this.model,
    (path): void => {
      for (const field of PROFILE_TEXT_FIELDS) {
        for (const locale of ['fr', 'en'] as const) {
          validate(path[field.key][locale], ({ value, pathKeys }): FormError =>
            this.textError(value(), locale, field.max, pathKeys().join('.')),
          );
        }
      }
      applyEach(path.facts, (fact): void => {
        for (const locale of ['fr', 'en'] as const) {
          validate(fact.label[locale], ({ value, pathKeys }): FormError =>
            this.textError(value(), locale, PROFILE_LIMITS.factLabel, pathKeys().join('.')),
          );
          validate(fact.value[locale], ({ value, pathKeys }): FormError =>
            this.textError(value(), locale, PROFILE_LIMITS.factValue, pathKeys().join('.')),
          );
        }
      });
      applyEach(path.links, (link): void => {
        validate(link.kind, ({ value, pathKeys }): FormError => {
          const index: number = Number(pathKeys()[1]);
          const kind: ProfileLinkKind = value();
          if (
            kind !== 'website' &&
            this.model()
              .links.slice(0, index)
              .some((other: { kind: ProfileLinkKind }): boolean => other.kind === kind)
          )
            return {
              kind: 'unique',
              message: $localize`:@@admin.profile.link.kindTaken:Un seul lien de ce type : retirez le doublon.`,
            };
          return this.serverError(pathKeys().join('.'), kind);
        });
        validate(link.url, ({ value, pathKeys, valueOf }): FormError => {
          const url: string = value().trim();
          const email: boolean = valueOf(link.kind) === 'email';
          if (url === '')
            return {
              kind: 'required',
              message: email
                ? $localize`:@@admin.profile.link.emailRequired:Indiquez l’adresse e-mail.`
                : $localize`:@@admin.profile.link.urlRequired:Indiquez l’adresse du lien.`,
            };
          if (url.length > PROFILE_LIMITS.linkUrl - (email ? 'mailto:'.length : 0))
            return this.tooLong(PROFILE_LIMITS.linkUrl);
          if (email ? !PROFILE_LIMITS.email.test(url) : !PROFILE_LIMITS.https.test(url))
            return {
              kind: 'pattern',
              message: email
                ? $localize`:@@admin.profile.link.emailInvalid:Indiquez une adresse e-mail valide, comme contact@exemple.fr.`
                : $localize`:@@admin.profile.link.urlInvalid:Indiquez une adresse complète commençant par https://.`,
            };
          const index: number = Number(pathKeys()[1]);
          if (
            this.model()
              .links.slice(0, index)
              .some((other: { url: string }): boolean => other.url.trim() === url)
          )
            return {
              kind: 'unique',
              message: $localize`:@@admin.profile.link.urlTaken:Cette adresse figure déjà dans la liste.`,
            };
          return this.serverError(pathKeys().join('.'), value());
        });
        validate(link.label, ({ value, pathKeys }): FormError =>
          value().trim().length > PROFILE_LIMITS.linkLabel
            ? this.tooLong(PROFILE_LIMITS.linkLabel)
            : this.serverError(pathKeys().join('.'), value()),
        );
      });
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
    this.profileForm().dirty(),
  );

  /**
   * Property canSave
   * @readonly
   *
   * @description
   * Whether the save button is enabled.
   *
   * @type {Signal<boolean>}
   */
  protected readonly canSave: Signal<boolean> = computed<boolean>(
    (): boolean => !this.pending() && this.dirty(),
  );

  /**
   * Property summary
   * @readonly
   *
   * @description
   * Message of the alert above the form once a submission failed validation.
   *
   * @type {Signal<string | null>}
   */
  protected readonly summary: Signal<string | null> = computed<string | null>((): string | null => {
    const state: FieldState<ProfileFormValues, string | number> = this.profileForm();
    if (!state.touched() || !state.invalid()) return null;
    const textsInvalid: boolean = this.textKeys().some(
      (key: string): boolean => this.invalidIn(key, 'fr') || this.invalidIn(key, 'en'),
    );
    return textsInvalid
      ? $localize`:@@admin.profile.summary.texts:Corrigez les champs signalés, en français et en anglais, avant d’enregistrer.`
      : $localize`:@@admin.profile.summary.links:Corrigez les liens signalés avant d’enregistrer.`;
  });
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Resets the form to every new input value; shows the fields refused by the API in the language in
   * error.
   */
  public constructor() {
    effect((): void => {
      const values: ProfileFormValues = this.values();
      untracked((): void => {
        this.profileForm().reset(structuredClone(values));
        this.sentValues.set(null);
      });
    });
    // A refused save shows each field in the language its error is in.
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
   * Emits the values when valid; otherwise shows every error, each field in its language in error.
   */
  public submit(): void {
    if (this.pending()) return;
    const state: FieldState<ProfileFormValues, string | number> = this.profileForm();
    if (state.invalid()) {
      state.markAsTouched();
      this.revealErrors();
      return;
    }
    this.sentValues.set(structuredClone(this.model()));
    this.submitted.emit(structuredClone(this.model()));
  }

  /**
   * Method onSubmit
   * @method onSubmit
   *
   * @description
   * Submits on Enter or the save button, without the browser's navigation.
   *
   * @param {Event} event - Submit event.
   */
  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.submit();
  }

  /**
   * Method addFact
   * @method addFact
   *
   * @description
   * Appends an empty fact (both languages) and focuses its French label.
   */
  protected addFact(): void {
    if (this.model().facts.length >= PROFILE_LIMITS.facts) return;
    this.model.update((values: ProfileFormValues): ProfileFormValues => ({
      ...values,
      facts: [...values.facts, { label: { fr: '', en: '' }, value: { fr: '', en: '' } }],
    }));
    this.profileForm().markAsDirty();
    this.focusLater(`edit-profile-fact-${this.model().facts.length - 1}-label-fr`);
  }

  /**
   * Method addLink
   * @method addLink
   *
   * @description
   * Appends a website link and focuses its address.
   */
  protected addLink(): void {
    if (this.model().links.length >= PROFILE_LIMITS.links) return;
    this.model.update((values: ProfileFormValues): ProfileFormValues => ({
      ...values,
      links: [...values.links, { kind: 'website', url: '', label: '' }],
    }));
    this.profileForm().markAsDirty();
    this.focusLater(`edit-profile-link-${this.model().links.length - 1}-url`);
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Removes a fact or a link; the save bar keeps the change until saved or discarded.
   *
   * @param {'facts' | 'links'} list - List holding the item.
   * @param {number} index - Item position.
   */
  protected remove(list: 'facts' | 'links', index: number): void {
    const keep: (_item: unknown, at: number) => boolean = (_item: unknown, at: number): boolean =>
      at !== index;
    this.model.update((values: ProfileFormValues): ProfileFormValues =>
      list === 'facts'
        ? { ...values, facts: values.facts.filter(keep) }
        : { ...values, links: values.links.filter(keep) },
    );
    if (list === 'facts') this.forgetFactLanguages();
    this.profileForm().markAsDirty();
  }

  /**
   * Method reorder
   * @method reorder
   *
   * @description
   * Applies a move of a sortable row (dragged by its grip, or moved with its arrow keys) to the list;
   * a keyboard move keeps the focus on the moved row's grip.
   *
   * @param {'facts' | 'links'} list - List holding the item.
   * @param {SortableMove} move - Positions before and after the move.
   */
  protected reorder(list: 'facts' | 'links', move: SortableMove): void {
    const { previousIndex, currentIndex } = move;
    const moved = <T>(items: readonly T[]): T[] => {
      const next: T[] = [...items];
      const [item] = next.splice(previousIndex, 1);
      if (item !== undefined) next.splice(currentIndex, 0, item);
      return next;
    };
    this.model.update((values: ProfileFormValues): ProfileFormValues =>
      list === 'facts'
        ? { ...values, facts: moved(values.facts) }
        : { ...values, links: moved(values.links) },
    );
    if (list === 'facts') this.forgetFactLanguages();
    this.profileForm().markAsDirty();
    if (move.keyboard)
      this.focusLater(`edit-profile-${list === 'facts' ? 'fact' : 'link'}-${currentIndex}-handle`);
  }

  /**
   * Method language
   * @method language
   *
   * @description
   * Language a bilingual field shows.
   *
   * @param {string} key - Contract path of the field.
   *
   * @returns {ContentLocale} Shown language.
   */
  protected language(key: string): ContentLocale {
    return this.shown()[key] ?? 'fr';
  }

  /**
   * Method show
   * @method show
   *
   * @description
   * Shows a bilingual field in a language.
   *
   * @param {string} key - Contract path of the field.
   * @param {ContentLocale} locale - Language.
   */
  protected show(key: string, locale: ContentLocale): void {
    this.shown.update(
      (
        shown: Readonly<Record<string, ContentLocale>>,
      ): Readonly<Record<string, ContentLocale>> => ({
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
   * State of each language of a field (both texts of a fact) for its switch: a shown error, else an
   * empty text, else filled.
   *
   * @param {string} key - Contract path of the field.
   *
   * @returns {Readonly<Record<ContentLocale, LocaleFieldState>>} States.
   */
  protected localeStates(key: string): Readonly<Record<ContentLocale, LocaleFieldState>> {
    const state: (locale: ContentLocale) => LocaleFieldState = (
      locale: ContentLocale,
    ): LocaleFieldState => {
      const fields: FieldState<string, string | number>[] = this.textStates(key, locale);
      if (fields.some((field: FieldState<string, string | number>): boolean => !!this.error(field)))
        return 'error';
      return fields.some(
        (field: FieldState<string, string | number>): boolean => field.value().trim() === '',
      )
        ? 'empty'
        : 'filled';
    };
    return { fr: state('fr'), en: state('en') };
  }

  /**
   * Method discard
   * @method discard
   *
   * @description
   * Restores the loaded values once confirmed, then focuses the save status.
   *
   * @returns {Promise<void>} Completion after the dialog.
   */
  protected async discard(): Promise<void> {
    if (this.pending() || !this.dirty()) return;
    const accepted: boolean = await this.confirmations.confirm({
      title: $localize`:@@admin.profile.discard.title:Abandonner les modifications ?`,
      description: $localize`:@@admin.profile.discard.description:Les modifications des informations seront perdues.`,
      confirmLabel: $localize`:@@admin.profile.form.discard:Abandonner`,
      cancelLabel: $localize`:@@admin.profile.keepEditing:Continuer la modification`,
      tone: 'danger',
    });
    if (!accepted || this.pending()) return;
    this.profileForm().reset(structuredClone(this.values()));
    afterNextRender(
      { read: (): void => this.status()?.nativeElement.focus() },
      { injector: this.injector },
    );
  }

  /**
   * Method error
   * @method error
   *
   * @description
   * Message to show under a field: once touched, or once the server answered errors.
   *
   * @param {FieldState<unknown, string | number>} state - Field state.
   *
   * @returns {string | null} Message, or `null`.
   */
  protected error(state: FieldState<unknown, string | number>): string | null {
    return state.touched() || this.serverErrors().length > 0
      ? (state.errors()[0]?.message ?? null)
      : null;
  }

  /**
   * Method length
   * @method length
   *
   * @description
   * Trimmed length of a text, for its counter.
   *
   * @param {string} value - Text.
   *
   * @returns {number} Length.
   */
  protected length(value: string): number {
    return value.trim().length;
  }

  /**
   * Method describedBy
   * @method describedBy
   *
   * @description
   * Ids of the error, hint and counter describing a control.
   *
   * @param {string} id - Control id.
   * @param {string | null} error - Visible error.
   * @param {readonly string[]} extra - Other describing ids.
   *
   * @returns {string | null} `aria-describedby` value.
   */
  protected describedBy(
    id: string,
    error: string | null,
    extra: readonly string[] = [],
  ): string | null {
    const ids: string[] = [...(error ? [`${id}-error`] : []), ...extra];
    return ids.length > 0 ? ids.join(' ') : null;
  }

  /**
   * Method kindOption
   * @method kindOption
   *
   * @description
   * Option of a link kind, for its example address.
   *
   * @param {ProfileLinkKind} kind - Link kind.
   *
   * @returns {ProfileLinkKindOption} Option.
   */
  protected kindOption(kind: ProfileLinkKind): ProfileLinkKindOption {
    return (
      this.kinds.find((option: ProfileLinkKindOption): boolean => option.value === kind) ??
      (this.kinds[this.kinds.length - 1] as ProfileLinkKindOption)
    );
  }

  /**
   * Method inLanguage
   * @method inLanguage
   *
   * @description
   * Accessible name of a bilingual control: its field and the language it shows.
   *
   * @param {string} name - Field label.
   * @param {ContentLocale} locale - Shown language.
   *
   * @returns {string} Accessible name.
   */
  protected inLanguage(name: string, locale: ContentLocale): string {
    return locale === 'fr'
      ? $localize`:@@admin.profile.inFrench:${name}:field: en français`
      : $localize`:@@admin.profile.inEnglish:${name}:field: en anglais`;
  }

  /**
   * Method rowLabel
   * @method rowLabel
   *
   * @description
   * Accessible name of a fact or link row, or of its grip and remove buttons, numbered from 1.
   *
   * @param {'fact' | 'moveFact' | 'removeFact' | 'link' | 'moveLink' | 'removeLink'} label - Element named.
   * @param {number} index - Row position.
   *
   * @returns {string} Accessible name.
   */
  protected rowLabel(
    label: 'fact' | 'moveFact' | 'removeFact' | 'link' | 'moveLink' | 'removeLink',
    index: number,
  ): string {
    const number: number = index + 1;
    switch (label) {
      case 'fact':
        return $localize`:@@admin.profile.fact.name:Repère ${number}:number:`;
      case 'moveFact':
        return $localize`:@@admin.profile.fact.move:Déplacer le repère ${number}:number:`;
      case 'removeFact':
        return $localize`:@@admin.profile.fact.remove:Retirer le repère ${number}:number:`;
      case 'link':
        return $localize`:@@admin.profile.link.name:Lien ${number}:number:`;
      case 'moveLink':
        return $localize`:@@admin.profile.link.move:Déplacer le lien ${number}:number:`;
      case 'removeLink':
        return $localize`:@@admin.profile.link.remove:Retirer le lien ${number}:number:`;
    }
  }

  /**
   * Method factFieldLabel
   * @method factFieldLabel
   *
   * @description
   * Accessible name of a fact's label or value control in the language it shows.
   *
   * @param {'label' | 'value'} field - Text of the fact.
   * @param {number} index - Fact position.
   * @param {ContentLocale} locale - Shown language.
   *
   * @returns {string} Accessible name.
   */
  protected factFieldLabel(field: 'label' | 'value', index: number, locale: ContentLocale): string {
    const number: number = index + 1;
    if (field === 'label')
      return locale === 'fr'
        ? $localize`:@@admin.profile.fact.labelAria.fr:Libellé du repère ${number}:number: en français`
        : $localize`:@@admin.profile.fact.labelAria.en:Libellé du repère ${number}:number: en anglais`;
    return locale === 'fr'
      ? $localize`:@@admin.profile.fact.valueAria.fr:Valeur du repère ${number}:number: en français`
      : $localize`:@@admin.profile.fact.valueAria.en:Valeur du repère ${number}:number: en anglais`;
  }

  /**
   * Method urlLabel
   * @method urlLabel
   *
   * @description
   * Label of a link's address field, an e-mail address for the e-mail kind.
   *
   * @param {ProfileLinkKind} kind - Link kind.
   *
   * @returns {string} Label.
   */
  protected urlLabel(kind: ProfileLinkKind): string {
    return kind === 'email'
      ? $localize`:@@admin.profile.link.email:Adresse e-mail`
      : $localize`:@@admin.profile.link.url:Adresse`;
  }

  /**
   * Method labelPlaceholder
   * @method labelPlaceholder
   *
   * @description
   * Placeholder of a link's label: the service name it falls back to, or an optional hint for an
   * e-mail or a website, which fall back to their address or domain.
   *
   * @param {ProfileLinkKindOption} option - Option of the link kind.
   *
   * @returns {string} Placeholder.
   */
  protected labelPlaceholder(option: ProfileLinkKindOption): string {
    return option.value === 'email' || option.value === 'website'
      ? $localize`:@@admin.profile.link.optional:Facultatif`
      : option.label;
  }

  /**
   * Method tooLong
   * @method tooLong
   *
   * @description
   * Error of a text longer than its contract bound.
   *
   * @param {number} max - Longest trimmed text.
   *
   * @returns {FormError} The error.
   */
  private tooLong(max: number): FormError {
    return {
      kind: 'maxLength',
      message: $localize`:@@admin.profile.maxLength:${max}:max: caractères maximum.`,
    };
  }

  /**
   * Method textError
   * @method textError
   *
   * @description
   * Validates a text: required in both languages (the profile is public at once), within its bound,
   * then the server error of its path.
   *
   * @param {string} value - Text.
   * @param {ContentLocale} locale - Its language.
   * @param {number} max - Longest trimmed text.
   * @param {string} path - Contract path.
   *
   * @returns {FormError} Error, or `null`.
   */
  private textError(value: string, locale: ContentLocale, max: number, path: string): FormError {
    const text: string = value.trim();
    if (text === '')
      return {
        kind: 'required',
        message:
          locale === 'fr'
            ? $localize`:@@admin.profile.text.required.fr:Le texte français est obligatoire.`
            : $localize`:@@admin.profile.text.required.en:Le texte anglais est obligatoire : le profil est publié dès son enregistrement.`,
      };
    if (text.length > max) return this.tooLong(max);
    return this.serverError(path, value);
  }

  /**
   * Method serverError
   * @method serverError
   *
   * @description
   * Server error of a path, kept while the field still holds the value submitted.
   *
   * @param {string} path - Contract path (`links.1.url`).
   * @param {unknown} value - Current value.
   *
   * @returns {FormError} Error, or `null`.
   */
  private serverError(path: string, value: unknown): FormError {
    const sent: ProfileFormValues | null = this.sentValues();
    if (!sent) return null;
    const before: unknown = path
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
        (candidate: { readonly field: string }): boolean => candidate.field === path,
      );
    return error ? { kind: 'server', message: error.message } : null;
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
    const shown: Record<string, ContentLocale> = { ...this.shown() };
    for (const key of this.textKeys()) {
      const current: ContentLocale = shown[key] ?? 'fr';
      const other: ContentLocale = current === 'fr' ? 'en' : 'fr';
      if (!this.invalidIn(key, current) && this.invalidIn(key, other)) shown[key] = other;
    }
    this.shown.set(shown);
  }

  /**
   * Method textKeys
   * @method textKeys
   *
   * @description
   * Contract paths of every bilingual field, one per fact.
   *
   * @returns {string[]} Paths.
   */
  private textKeys(): string[] {
    return [
      ...this.texts.map((field: ProfileTextField): string => field.key),
      ...this.model().facts.map((_fact: unknown, index: number): string => `facts.${index}`),
    ];
  }

  /**
   * Method invalidIn
   * @method invalidIn
   *
   * @description
   * Whether a field (either text of a fact) is invalid in a language.
   *
   * @param {string} key - Contract path of the field.
   * @param {ContentLocale} locale - Language.
   *
   * @returns {boolean} Whether a text is invalid.
   */
  private invalidIn(key: string, locale: ContentLocale): boolean {
    return this.textStates(key, locale).some(
      (field: FieldState<string, string | number>): boolean => field.invalid(),
    );
  }

  /**
   * Method textStates
   * @method textStates
   *
   * @description
   * States of the texts of a bilingual field in a language: one text, or a fact's label and value.
   *
   * @param {string} key - Contract path of the field.
   * @param {ContentLocale} locale - Language.
   *
   * @returns {FieldState<string, string | number>[]} States, none for an unknown path.
   */
  private textStates(key: string, locale: ContentLocale): FieldState<string, string | number>[] {
    const fact: RegExpExecArray | null = /^facts\.(\d+)$/.exec(key);
    if (fact) {
      const item: FieldTree<ProfileFormValues['facts'][number], number> | undefined =
        this.profileForm.facts[Number(fact[1])];
      return item ? [item.label[locale](), item.value[locale]()] : [];
    }
    const text: ProfileTextField | undefined = this.texts.find(
      (field: ProfileTextField): boolean => field.key === key,
    );
    return text ? [this.profileForm[text.key][locale]()] : [];
  }

  /**
   * Method forgetFactLanguages
   * @method forgetFactLanguages
   *
   * @description
   * Shows every fact in French again after a move or a removal, which renumbers their paths.
   */
  private forgetFactLanguages(): void {
    this.shown.update(
      (shown: Readonly<Record<string, ContentLocale>>): Readonly<Record<string, ContentLocale>> =>
        Object.fromEntries(
          Object.entries(shown).filter(
            ([key]: [string, ContentLocale]): boolean => !key.startsWith('facts.'),
          ),
        ),
    );
  }

  /**
   * Method focusLater
   * @method focusLater
   *
   * @description
   * Focuses an element of the form once rendered (the admin renders in the browser only, D18).
   *
   * @param {string} id - Element id.
   */
  private focusLater(id: string): void {
    afterNextRender(
      { read: (): void => this.document.getElementById(id)?.focus() },
      { injector: this.injector },
    );
  }
  // #endregion
}
