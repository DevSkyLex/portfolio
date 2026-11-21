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
import { lucideCircleCheck } from '@ng-icons/lucide';
import {
  ButtonDirective,
  ConfirmDialogService,
  FieldComponent,
  FieldSetDirective,
  InputDirective,
  KbdDirective,
  ModifierKeyService,
  SwitchDirective,
} from '@vfortin/ui';
import { MAINTENANCE_LIMITS } from '@internal/content-web-feature-admin/lib/constants/maintenance-limits.constants';
import type { ContentLocale } from '@internal/content-web-feature-admin/lib/models/content-locale/content-locale.type';
import type { LocaleFieldState } from '@internal/content-web-feature-admin/lib/models/locale-field-state/locale-field-state.type';
import { LocaleSwitchComponent } from '@internal/content-web-feature-admin/lib/ui/components/locale-switch/locale-switch.component';
import type { MaintenanceFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/maintenance-form/models/maintenance-form-values.model';

/**
 * Type FormError
 * @type FormError
 *
 * @description
 * Validation error of a message, or none.
 */
type FormError = { kind: string; message: string } | null;

/**
 * Component MaintenanceFormComponent
 * @class MaintenanceFormComponent
 *
 * @description
 * « Maintenance » form: the switch and the optional message per language, with the per-field locale
 * toggle and the floating save bar of the other admin editors. It emits the values; the page saves
 * them with `If-Match` and attaches the server field errors (`message.fr`, `message.en`).
 */
@Component({
  selector: 'content-maintenance-form',
  imports: [
    ButtonDirective,
    FieldComponent,
    FieldSetDirective,
    FormField,
    InputDirective,
    KbdDirective,
    LocaleSwitchComponent,
    NgIcon,
    SwitchDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './maintenance-form.component.html',
})
export class MaintenanceFormComponent {
  // #region Properties
  /**
   * Property values
   * @readonly
   *
   * @description
   * Stored values; a new object resets the form.
   *
   * @type {InputSignal<MaintenanceFormValues>}
   */
  public readonly values: InputSignal<MaintenanceFormValues> =
    input.required<MaintenanceFormValues>();

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether a save is running; the fields and the save button are disabled meanwhile.
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
   * Field errors of the last save, by contract path.
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
   * Valid values to save.
   *
   * @type {OutputEmitterRef<MaintenanceFormValues>}
   */
  public readonly submitted: OutputEmitterRef<MaintenanceFormValues> =
    output<MaintenanceFormValues>();

  /**
   * Property shown
   * @readonly
   *
   * @description
   * Language the message field shows.
   *
   * @type {WritableSignal<ContentLocale>}
   */
  protected readonly shown: WritableSignal<ContentLocale> = signal<ContentLocale>('fr');

  /**
   * Property max
   * @readonly
   *
   * @description
   * Longest message per language.
   *
   * @type {number}
   */
  protected readonly max: number = MAINTENANCE_LIMITS.message;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Label of the message field, also naming its language toggle.
   *
   * @type {string}
   */
  protected readonly label: string = $localize`:@@admin.maintenance.form.message:Message`;

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Icon of the saved status.
   *
   * @type {{ readonly saved: typeof lucideCircleCheck }}
   */
  protected readonly icons: { readonly saved: typeof lucideCircleCheck } = {
    saved: lucideCircleCheck,
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
   * Confirmation dialog of « Abandonner ».
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
   * Injector of the focus moved after a discard.
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
   * Property sentValues
   * @readonly
   *
   * @description
   * Values of the last submission, to attach server errors while the field still holds them.
   *
   * @type {WritableSignal<MaintenanceFormValues | null>}
   */
  private readonly sentValues: WritableSignal<MaintenanceFormValues | null> =
    signal<MaintenanceFormValues | null>(null);

  /**
   * Property model
   * @readonly
   *
   * @description
   * Edited values.
   *
   * @type {WritableSignal<MaintenanceFormValues>}
   */
  private readonly model: WritableSignal<MaintenanceFormValues> = signal<MaintenanceFormValues>({
    enabled: false,
    message: { fr: '', en: '' },
  });

  /**
   * Property maintenanceForm
   * @readonly
   *
   * @description
   * Signal form of the values: each message within the limit, both optional.
   *
   * @type {FieldTree<MaintenanceFormValues, string | number, 'writable'>}
   */
  protected readonly maintenanceForm: FieldTree<
    MaintenanceFormValues,
    string | number,
    'writable'
  > = form(this.model, (path): void => {
    for (const locale of ['fr', 'en'] as const) {
      validate(path.message[locale], ({ value }): FormError => {
        if (value().trim().length > MAINTENANCE_LIMITS.message)
          return {
            kind: 'maxLength',
            message: $localize`:@@admin.maintenance.form.error.maxLength:${MAINTENANCE_LIMITS.message}:max: caractères maximum.`,
          };
        return this.serverError(locale, value());
      });
    }
  });

  /**
   * Property dirty
   * @readonly
   *
   * @description
   * Whether the values differ from the last stored ones.
   *
   * @type {Signal<boolean>}
   */
  public readonly dirty: Signal<boolean> = computed<boolean>((): boolean =>
    this.maintenanceForm().dirty(),
  );

  /**
   * Property canSave
   * @readonly
   *
   * @description
   * Whether « Enregistrer » is enabled.
   *
   * @type {Signal<boolean>}
   */
  protected readonly canSave: Signal<boolean> = computed<boolean>(
    (): boolean => !this.pending() && this.dirty(),
  );
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Resets the form on new stored values and shows the language of a server error.
   */
  public constructor() {
    effect((): void => {
      const values: MaintenanceFormValues = this.values();
      untracked((): void => {
        this.maintenanceForm().reset(structuredClone(values));
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
   * Emits the values when valid; otherwise marks the fields touched and shows the invalid language.
   *
   * @returns {void} Completes after emitting or revealing the errors.
   */
  public submit(): void {
    if (this.pending()) return;
    const state: FieldState<MaintenanceFormValues, string | number> = this.maintenanceForm();
    if (state.invalid()) {
      state.markAsTouched();
      this.revealErrors();
      return;
    }
    const values: MaintenanceFormValues = structuredClone(this.model());
    this.sentValues.set(values);
    this.submitted.emit(structuredClone(values));
  }

  /**
   * Method onSubmit
   * @method onSubmit
   *
   * @description
   * Native form submission.
   *
   * @param {Event} event - Submit event.
   * @returns {void} Completes after submitting.
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
   * Restores the stored values after confirmation and moves the focus to the save status.
   *
   * @returns {Promise<void>} Completion.
   */
  protected async discard(): Promise<void> {
    if (this.pending() || !this.dirty()) return;
    const accepted: boolean = await this.confirmations.confirm({
      title: $localize`:@@admin.maintenance.confirm.discard.title:Abandonner les modifications ?`,
      description: $localize`:@@admin.maintenance.confirm.changesLost:Les modifications de la maintenance seront perdues.`,
      confirmLabel: $localize`:@@admin.maintenance.confirm.discard.confirm:Abandonner`,
      cancelLabel: $localize`:@@admin.maintenance.confirm.keepEditing:Continuer la modification`,
      tone: 'danger',
    });
    if (!accepted || this.pending()) return;
    this.maintenanceForm().reset(structuredClone(this.values()));
    afterNextRender(
      { read: (): void => this.status()?.nativeElement.focus() },
      { injector: this.injector },
    );
  }

  /**
   * Method messageError
   * @method messageError
   *
   * @description
   * Error shown under the message in a language, once touched or after a refused save.
   *
   * @param {ContentLocale} locale - Language.
   * @returns {string | null} Message, or none.
   */
  protected messageError(locale: ContentLocale): string | null {
    const state: FieldState<string, string | number> = this.maintenanceForm.message[locale]();
    return state.touched() || this.serverErrors().length > 0
      ? (state.errors()[0]?.message ?? null)
      : null;
  }

  /**
   * Method fieldName
   * @method fieldName
   *
   * @description
   * Accessible name of the message in a language.
   *
   * @param {ContentLocale} locale - Language.
   * @returns {string} Name.
   */
  protected fieldName(locale: ContentLocale): string {
    return locale === 'fr'
      ? $localize`:@@admin.maintenance.form.inFrench:Message en français`
      : $localize`:@@admin.maintenance.form.inEnglish:Message en anglais`;
  }

  /**
   * Method messageLength
   * @method messageLength
   *
   * @description
   * Trimmed length of the message in a language.
   *
   * @param {ContentLocale} locale - Language.
   * @returns {number} Characters.
   */
  protected messageLength(locale: ContentLocale): number {
    return this.maintenanceForm.message[locale]().value().trim().length;
  }

  /**
   * Method localeStates
   * @method localeStates
   *
   * @description
   * State of each language on the toggle: in error, empty or written.
   *
   * @returns {Readonly<Record<ContentLocale, LocaleFieldState>>} States.
   */
  protected localeStates(): Readonly<Record<ContentLocale, LocaleFieldState>> {
    const state = (locale: ContentLocale): LocaleFieldState =>
      this.messageError(locale) ? 'error' : this.messageLength(locale) === 0 ? 'empty' : 'filled';
    return { fr: state('fr'), en: state('en') };
  }

  /**
   * Method describedBy
   * @method describedBy
   *
   * @description
   * Descriptions of the message control: its error, then its count.
   *
   * @param {string} id - Control id.
   * @param {string | null} error - Shown error.
   * @returns {string} Space-separated ids.
   */
  protected describedBy(id: string, error: string | null): string {
    return error ? `${id}-error ${id}-count` : `${id}-count`;
  }

  /**
   * Method revealErrors
   * @method revealErrors
   *
   * @description
   * Shows the other language when only it is invalid.
   *
   * @returns {void} Completes after switching the language if needed.
   */
  private revealErrors(): void {
    const current: ContentLocale = this.shown();
    const other: ContentLocale = current === 'fr' ? 'en' : 'fr';
    if (
      !this.maintenanceForm.message[current]().invalid() &&
      this.maintenanceForm.message[other]().invalid()
    )
      this.shown.set(other);
  }

  /**
   * Method serverError
   * @method serverError
   *
   * @description
   * Server error of a message while the field still holds the value sent.
   *
   * @param {ContentLocale} locale - Language.
   * @param {string} value - Current value.
   * @returns {FormError} Error, or none.
   */
  private serverError(locale: ContentLocale, value: string): FormError {
    const sent: MaintenanceFormValues | null = this.sentValues();
    if (!sent || sent.message[locale] !== value) return null;
    const error: { readonly field: string; readonly message: string } | undefined =
      this.serverErrors().find(
        (candidate: { readonly field: string }): boolean => candidate.field === `message.${locale}`,
      );
    return error ? { kind: 'server', message: error.message } : null;
  }
  // #endregion
}
