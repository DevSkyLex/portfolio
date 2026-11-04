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
  type ArticleDocumentDraft,
  type LegalDocumentKind,
  emptyArticleDocument,
  isArticleEmpty,
} from '@vfortin/content-web-data-access/admin';
import {
  ButtonDirective,
  ConfirmDialogService,
  FieldErrorDirective,
  KbdDirective,
  ModifierKeyService,
} from '@vfortin/ui';
import type { ContentLocale } from '@internal/content-web-feature-admin/lib/models/content-locale/content-locale.type';
import type { LocaleFieldState } from '@internal/content-web-feature-admin/lib/models/locale-field-state/locale-field-state.type';
import type { LegalDocumentTexts } from '@internal/content-web-feature-admin/lib/models/legal-document-texts/legal-document-texts.interface';
import { ArticleEditorComponent } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/article-editor.component';
import { LocaleSwitchComponent } from '@internal/content-web-feature-admin/lib/ui/components/locale-switch/locale-switch.component';
import type { LegalDocumentFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/legal-document-form/models/legal-document-form-values.model';
import { exceedsArticleLimits } from '@internal/content-web-feature-admin/lib/utils/article-limits/article-limits.utils';

/**
 * Type FormError
 * @type FormError
 *
 * @description
 * Result of a field validator.
 */
type FormError = { kind: string; message: string } | null;

/**
 * Component LegalDocumentFormComponent
 * @class LegalDocumentFormComponent
 *
 * @description
 * Form of one legal document on the « Légal » page: the document in the article editor (D40, without
 * image: legal documents hold no figure, so the editor gets no upload), one language shown at a time
 * (both editors stay alive, as in the project editor) with the language toggle
 * (`content-locale-switch`) at the far end of each toolbar, then the floating save bar. An invalid submit or a refused save shows the language in error. Both languages are required, the page
 * being public at once; server field errors (`body.fr`, `body.en`) stay until the document changes;
 * « Abandonner » asks before restoring the loaded documents.
 */
@Component({
  selector: 'content-legal-document-form',
  imports: [
    ArticleEditorComponent,
    ButtonDirective,
    FieldErrorDirective,
    FormField,
    KbdDirective,
    LocaleSwitchComponent,
    NgIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col' },
  templateUrl: './legal-document-form.component.html',
})
export class LegalDocumentFormComponent {
  // #region Properties
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Document edited, which names the ids of the form.
   *
   * @type {InputSignal<LegalDocumentKind>}
   */
  public readonly kind: InputSignal<LegalDocumentKind> = input.required<LegalDocumentKind>();

  /**
   * Property texts
   * @readonly
   *
   * @description
   * Copy of the document.
   *
   * @type {InputSignal<LegalDocumentTexts>}
   */
  public readonly texts: InputSignal<LegalDocumentTexts> = input.required<LegalDocumentTexts>();

  /**
   * Property values
   * @readonly
   *
   * @description
   * Documents loaded or last saved; a new value resets the form.
   *
   * @type {InputSignal<LegalDocumentFormValues>}
   */
  public readonly values: InputSignal<LegalDocumentFormValues> =
    input.required<LegalDocumentFormValues>();

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether a save is running.
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
   * Field errors of the last save of this document (`body.fr`, `body.en`).
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
   * Emits valid documents to save.
   *
   * @type {OutputEmitterRef<LegalDocumentFormValues>}
   */
  public readonly submitted: OutputEmitterRef<LegalDocumentFormValues> =
    output<LegalDocumentFormValues>();

  /**
   * Property locales
   * @readonly
   *
   * @description
   * Languages, one editor each.
   *
   * @type {readonly ContentLocale[]}
   */
  protected readonly locales: readonly ContentLocale[] = ['fr', 'en'];

  /**
   * Property shown
   * @readonly
   *
   * @description
   * Language the editor shows.
   *
   * @type {WritableSignal<ContentLocale>}
   */
  protected readonly shown: WritableSignal<ContentLocale> = signal<ContentLocale>('fr');

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the errors and the save bar.
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
   * Property sentValues
   * @readonly
   *
   * @description
   * Documents of the last submission, against which server errors are matched.
   *
   * @type {WritableSignal<LegalDocumentFormValues | null>}
   */
  private readonly sentValues: WritableSignal<LegalDocumentFormValues | null> =
    signal<LegalDocumentFormValues | null>(null);

  /**
   * Property model
   * @readonly
   *
   * @description
   * Documents edited by the form.
   *
   * @type {WritableSignal<LegalDocumentFormValues>}
   */
  private readonly model: WritableSignal<LegalDocumentFormValues> = signal<LegalDocumentFormValues>(
    { fr: emptyArticleDocument(), en: emptyArticleDocument() },
  );

  /**
   * Property legalForm
   * @readonly
   *
   * @description
   * Signal Form of both documents.
   *
   * @type {FieldTree<LegalDocumentFormValues, string | number, 'writable'>}
   */
  protected readonly legalForm: FieldTree<LegalDocumentFormValues, string | number, 'writable'> =
    form(this.model, (path): void => {
      for (const locale of ['fr', 'en'] as const) {
        validate(path[locale], ({ value }): FormError => {
          const document: ArticleDocumentDraft = value();
          if (isArticleEmpty(document))
            return {
              kind: 'required',
              message:
                locale === 'fr'
                  ? $localize`:@@admin.legal.form.required.fr:Le document français est obligatoire.`
                  : $localize`:@@admin.legal.form.required.en:Le document anglais est obligatoire : la page est publiée dès son enregistrement.`,
            };
          if (exceedsArticleLimits(document))
            return {
              kind: 'limits',
              message: $localize`:@@admin.legal.form.limits:Le document dépasse 100 000 caractères ou 5 000 blocs.`,
            };
          return this.serverError(`body.${locale}`, locale, document);
        });
      }
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
    this.legalForm().dirty(),
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
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Resets the form to every new input value; shows a language refused by the API.
   */
  public constructor() {
    effect((): void => {
      const values: LegalDocumentFormValues = this.values();
      untracked((): void => {
        this.legalForm().reset(structuredClone(values));
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
   * Emits the documents when valid; otherwise shows the errors, in the language holding one.
   */
  public submit(): void {
    if (this.pending()) return;
    const state: FieldState<LegalDocumentFormValues, string | number> = this.legalForm();
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
   * Submits on the save button, without the browser's navigation.
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
   * Restores the loaded documents once confirmed, then focuses the save status.
   *
   * @returns {Promise<void>} Completion after the dialog.
   */
  protected async discard(): Promise<void> {
    if (this.pending() || !this.dirty()) return;
    const name: string = this.texts().tab;
    const accepted: boolean = await this.confirmations.confirm({
      title: $localize`:@@admin.legal.discard.title:Abandonner les modifications ?`,
      description: $localize`:@@admin.legal.discard.description:Les modifications de « ${name}:document: » seront perdues.`,
      confirmLabel: $localize`:@@admin.legal.form.discard:Abandonner`,
      cancelLabel: $localize`:@@admin.legal.keepEditing:Continuer la modification`,
      tone: 'danger',
    });
    if (!accepted || this.pending()) return;
    this.legalForm().reset(structuredClone(this.values()));
    afterNextRender(
      { read: (): void => this.status()?.nativeElement.focus() },
      { injector: this.injector },
    );
  }

  /**
   * Method editorLabel
   * @method editorLabel
   *
   * @description
   * Accessible name of the editor of one language: the document and its language.
   *
   * @param {ContentLocale} locale - Language of the editor.
   *
   * @returns {string} Accessible name.
   */
  protected editorLabel(locale: ContentLocale): string {
    const name: string = this.texts().tab;
    return locale === 'fr'
      ? $localize`:@@admin.legal.form.editorLabel.fr:${name}:document: en français`
      : $localize`:@@admin.legal.form.editorLabel.en:${name}:document: en anglais`;
  }

  /**
   * Method error
   * @method error
   *
   * @description
   * Message under a document: once touched, or once the server answered errors.
   *
   * @param {ContentLocale} locale - Language.
   *
   * @returns {string | null} Message, or `null`.
   */
  protected error(locale: ContentLocale): string | null {
    const state: FieldState<ArticleDocumentDraft, string | number> = this.legalForm[locale]();
    return state.touched() || this.serverErrors().length > 0
      ? (state.errors()[0]?.message ?? null)
      : null;
  }

  /**
   * Method localeStates
   * @method localeStates
   *
   * @description
   * State of each language for the switch: a shown error, else an empty document, else filled.
   *
   * @returns {Readonly<Record<ContentLocale, LocaleFieldState>>} States.
   */
  protected localeStates(): Readonly<Record<ContentLocale, LocaleFieldState>> {
    const state: (locale: ContentLocale) => LocaleFieldState = (
      locale: ContentLocale,
    ): LocaleFieldState =>
      this.error(locale)
        ? 'error'
        : isArticleEmpty(this.legalForm[locale]().value())
          ? 'empty'
          : 'filled';
    return { fr: state('fr'), en: state('en') };
  }

  /**
   * Method revealErrors
   * @method revealErrors
   *
   * @description
   * Shows the other language when the shown one is valid and the other holds an error.
   */
  private revealErrors(): void {
    const current: ContentLocale = this.shown();
    const other: ContentLocale = current === 'fr' ? 'en' : 'fr';
    if (!this.legalForm[current]().invalid() && this.legalForm[other]().invalid()) {
      this.shown.set(other);
    }
  }

  /**
   * Method serverError
   * @method serverError
   *
   * @description
   * Server error of a document, kept while it still holds the document submitted.
   *
   * @param {string} path - Contract path (`body.en`).
   * @param {ContentLocale} locale - Language.
   * @param {ArticleDocumentDraft} value - Current document.
   *
   * @returns {FormError} Error, or `null`.
   */
  private serverError(path: string, locale: ContentLocale, value: ArticleDocumentDraft): FormError {
    const sent: LegalDocumentFormValues | null = this.sentValues();
    if (!sent || JSON.stringify(sent[locale]) !== JSON.stringify(value)) return null;
    const error: { readonly field: string; readonly message: string } | undefined =
      this.serverErrors().find(
        (candidate: { readonly field: string }): boolean => candidate.field === path,
      );
    return error ? { kind: 'server', message: error.message } : null;
  }
  // #endregion
}
