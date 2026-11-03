import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  type InputSignal,
  type InputSignalWithTransform,
  type WritableSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import {
  FormField,
  form,
  required,
  validate,
  type FieldTree,
  type FieldState,
  type ValidationError,
} from '@angular/forms/signals';
import { NgIcon } from '@ng-icons/core';
import { lucideCircleAlert, lucideCircleCheck } from '@ng-icons/lucide';
import {
  ARTICLE_SECTIONS,
  type ArticleSection,
} from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/article-section.model';
import {
  AlertDirective,
  AlertTitleDirective,
  BadgeDirective,
  ButtonDirective,
  CheckboxComponent,
  FieldComponent,
  FieldDescriptionDirective,
  FieldLegendDirective,
  FieldSetDirective,
  InputDirective,
  KbdDirective,
  TabsContentDirective,
  TabsDirective,
  TabsListDirective,
  TabsTriggerDirective,
} from '@vfortin/ui';
import { ARTICLE_SECTION_LABELS } from '@internal/content-web-feature-admin/lib/constants/article-section-labels.constants';
import { CONTENT_LOCALE_LABELS } from '@internal/content-web-feature-admin/lib/constants/content-locale-labels.constants';
import { EMPTY_PROJECT_DRAFT } from '@internal/content-web-feature-admin/lib/constants/empty-project-draft.constants';
import { PROJECT_SHORT_FIELDS } from '@internal/content-web-feature-admin/lib/constants/project-short-fields.constants';
import type { ContentLocale } from '@internal/content-web-feature-admin/lib/models/content-locale/content-locale.type';
import type { ProjectShortFieldKey } from '@internal/content-web-feature-admin/lib/models/project-short-field/project-short-field-key.type';
import type { ProjectFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/project-form-values.model';
import { incompleteFields } from '@internal/content-web-feature-admin/lib/utils/incomplete-fields/incomplete-fields.utils';
import { INCOMPLETE_ERROR } from '@internal/content-web-feature-admin/lib/constants/incomplete-error.constants';

/**
 * Component ProjectFormComponent
 * @class ProjectFormComponent
 *
 * @description
 * Bilingual project editor: one tab per language holds that language's presentation fields and
 * case-study sections, each trigger counting the fields still to complete; the shared settings (site,
 * technologies, home-page feature) sit outside the tabs, above a sticky save bar. It owns its Signal
 * Form: French short fields are required, translated article sections must keep the French
 * paragraph count and, for a published project (`complete`), both languages must stay complete as the
 * API requires; valid values leave through `submitted`, the page saves them.
 */
@Component({
  selector: 'content-project-form',
  imports: [
    AlertDirective,
    AlertTitleDirective,
    BadgeDirective,
    ButtonDirective,
    CheckboxComponent,
    FieldComponent,
    FieldDescriptionDirective,
    FieldLegendDirective,
    FieldSetDirective,
    FormField,
    InputDirective,
    KbdDirective,
    NgIcon,
    TabsContentDirective,
    TabsDirective,
    TabsListDirective,
    TabsTriggerDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './project-form.component.html',
})
export class ProjectFormComponent {
  // #region Properties
  /**
   * Property values
   * @readonly
   *
   * @description
   * Saved values the form starts from; every new value resets the form, its dirty and touched state.
   *
   * @type {InputSignal<ProjectFormValues>}
   */
  public readonly values: InputSignal<ProjectFormValues> = input.required<ProjectFormValues>();

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether a write is running: the fieldsets are disabled and submissions ignored, so the answer can
   * replace the values without losing a keystroke.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly pending: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    {
      transform: booleanAttribute,
    },
  );

  /**
   * Property complete
   * @readonly
   *
   * @description
   * Whether the project is published: the API then refuses a save that leaves a language incomplete
   * (`content.project-incomplete`), so the form flags those fields before sending.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly complete: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property serverErrors
   *
   * @description
   * Field violations from the last submitted revision; edited fields stop displaying stale violations.
   */
  public readonly serverErrors: InputSignal<
    readonly { readonly field: string; readonly message: string }[]
  > = input<readonly { readonly field: string; readonly message: string }[]>([]);
  /**
   * Property sentValues
   *
   * @description
   * Immutable snapshot of the last emitted revision, used to retire field errors after user edits.
   */
  private readonly sentValues: WritableSignal<ProjectFormValues | null> =
    signal<ProjectFormValues | null>(null);

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the form values when a submission passes validation.
   *
   * @type {OutputEmitterRef<ProjectFormValues>}
   */
  public readonly submitted: OutputEmitterRef<ProjectFormValues> = output<ProjectFormValues>();

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * Emits when the user discards the unsaved changes; the page reloads the project.
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();

  /**
   * Property shortFields
   * @readonly
   *
   * @description
   * Bilingual presentation fields, in display order.
   */
  protected readonly shortFields: typeof PROJECT_SHORT_FIELDS = PROJECT_SHORT_FIELDS;

  /**
   * Property sections
   * @readonly
   *
   * @description
   * Article section keys paired with their French labels, in serialization order.
   */
  protected readonly sections: { key: ArticleSection; label: string }[] = ARTICLE_SECTIONS.map(
    (key: ArticleSection): { key: ArticleSection; label: string } => ({
      key,
      label: ARTICLE_SECTION_LABELS[key],
    }),
  );

  /**
   * Property locales
   * @readonly
   *
   * @description
   * Languages of the tab panels, French source first.
   */
  protected readonly locales: readonly ContentLocale[] = ['fr', 'en'];

  /**
   * Property localeLabels
   * @readonly
   *
   * @description
   * Tab names of the languages.
   */
  protected readonly localeLabels: Readonly<Record<ContentLocale, string>> = CONTENT_LOCALE_LABELS;

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Language tab on display; it survives saves, so a translator stays on the English tab.
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly locale: WritableSignal<string | null> = signal<string | null>('fr');

  /**
   * Property untranslated
   * @readonly
   *
   * @description
   * Marker written for an English paragraph that has no translation yet.
   */
  protected readonly untranslated: string = '[à traduire]';

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the validation summary and the save bar.
   */
  protected readonly icons: {
    readonly alert: typeof lucideCircleAlert;
    readonly saved: typeof lucideCircleCheck;
  } = { alert: lucideCircleAlert, saved: lucideCircleCheck } as const;

  /**
   * Property model
   * @readonly
   *
   * @description
   * Form model, blank until the first `values` arrive.
   *
   * @type {WritableSignal<ProjectFormValues>}
   */
  private readonly model: WritableSignal<ProjectFormValues> =
    signal<ProjectFormValues>(EMPTY_PROJECT_DRAFT);

  /**
   * Property gaps
   * @readonly
   *
   * @description
   * Paths the API would report as incomplete for a published project, empty for a draft.
   *
   * @type {Signal<ReadonlySet<string>>}
   */
  private readonly gaps: Signal<ReadonlySet<string>> = computed<ReadonlySet<string>>(
    (): ReadonlySet<string> =>
      this.complete()
        ? new Set<string>([
            ...incompleteFields(this.model(), 'fr'),
            ...incompleteFields(this.model(), 'en'),
          ])
        : new Set<string>(),
  );

  /**
   * Property projectForm
   * @readonly
   *
   * @description
   * Signal Form with contract text and collection bounds, HTTPS and technology rules, paragraph
   * alignment and server errors attached to their corresponding editable fields.
   *
   * @type {FieldTree<ProjectFormValues>}
   */
  protected readonly projectForm: FieldTree<ProjectFormValues, string | number, 'writable'> = form(
    this.model,
    (path): void => {
      for (const field of PROJECT_SHORT_FIELDS) {
        required(path[field.key].fr, { message: 'Le texte français est obligatoire.' });
        for (const locale of ['fr', 'en'] as const) {
          validate(
            path[field.key][locale],
            ({ value }): { kind: string; message: string } | null => {
              if (value().trim().length > 4000)
                return { kind: 'maxLength', message: '4000 caractères maximum.' };
              if (locale === 'fr' && value().trim() === '')
                return { kind: 'required', message: 'Le texte français est obligatoire.' };
              if (this.gaps().has(`${field.key}.${locale}`)) return INCOMPLETE_ERROR;
              return this.serverError(`${field.key}.${locale}`, value());
            },
          );
        }
      }
      for (const section of ARTICLE_SECTIONS) {
        for (const locale of ['fr', 'en'] as const) {
          validate(
            path.article[section][locale],
            ({ value }): { kind: string; message: string } | null => {
              const paragraphs: string[] = value()
                .split(/\n\s*\n/)
                .map((p: string): string => p.trim())
                .filter(Boolean);
              if (paragraphs.length > 30)
                return { kind: 'paragraphCount', message: '30 paragraphes maximum.' };
              if (paragraphs.some((p: string): boolean => p.length > 4000))
                return {
                  kind: 'paragraphLength',
                  message: '4000 caractères maximum par paragraphe.',
                };
              if (locale === 'en') {
                const french: string[] = this.model()
                  .article[section].fr.split(/\n\s*\n/)
                  .map((p: string): string => p.trim())
                  .filter(Boolean);
                if (paragraphs.length > 0 && paragraphs.length !== french.length)
                  return {
                    kind: 'misaligned',
                    message: `Même nombre de paragraphes attendu en anglais : ${ARTICLE_SECTION_LABELS[section]}.`,
                  };
              }
              if (this.gaps().has(`article.${section}.${locale}`)) return INCOMPLETE_ERROR;
              return this.serverError(`article.${section}.${locale}`, value());
            },
          );
        }
      }
      validate(path.siteUrl, ({ value }): { kind: string; message: string } | null => {
        if (value().trim()) {
          try {
            if (new URL(value().trim()).protocol !== 'https:')
              return { kind: 'https', message: 'Utilisez une URL HTTPS valide.' };
          } catch {
            return { kind: 'https', message: 'Utilisez une URL HTTPS valide.' };
          }
        }
        return this.serverError('siteUrl', value());
      });
      validate(path.techs, ({ value }): { kind: string; message: string } | null => {
        const keys: string[] = value()
          .split(',')
          .map((key: string): string => key.trim())
          .filter(Boolean);
        if (
          keys.length > 12 ||
          keys.some((key: string): boolean => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key))
        )
          return {
            kind: 'techs',
            message: '12 clés maximum, en minuscules et séparées par des virgules.',
          };
        return this.serverError('techs', value());
      });
    },
  );

  /**
   * Property dirty
   * @readonly
   *
   * @description
   * Whether the values differ from the last `values` received; read by the page for the publication
   * button and the Ctrl/Cmd+S shortcut.
   *
   * @type {Signal<boolean>}
   */
  public readonly dirty: Signal<boolean> = computed<boolean>((): boolean =>
    this.projectForm().dirty(),
  );

  /**
   * Property summary
   * @readonly
   *
   * @description
   * Validation message above the fields once the form is touched: missing French texts first, then the
   * completeness of a published project, then the paragraph alignment; `null` while valid or untouched.
   *
   * @type {Signal<string | null>}
   */
  protected readonly summary: Signal<string | null> = computed<string | null>((): string | null => {
    const state: FieldState<ProjectFormValues, string | number> = this.projectForm();
    if (!state.touched()) {
      return null;
    }
    const frenchErrors: ValidationError.WithFieldTree[] = PROJECT_SHORT_FIELDS.flatMap(
      (field): ValidationError.WithFieldTree[] => this.projectForm[field.key].fr().errors(),
    );
    if (
      frenchErrors.some(
        (error: ValidationError.WithFieldTree): boolean => error.kind === 'required',
      )
    ) {
      return 'Les textes français marqués d’une erreur sont obligatoires.';
    }
    const articleError: ValidationError.WithFieldTree | undefined = ARTICLE_SECTIONS.flatMap(
      (
        section: 'choices' | 'result' | 'work' | 'context' | 'workList' | 'lessons' | 'captions',
      ): ValidationError.WithFieldTree[] => this.projectForm.article[section].en().errors(),
    ).find((error: ValidationError.WithFieldTree): boolean => error.kind === 'misaligned');
    if (this.gaps().size > 0) {
      return 'Un projet publié doit rester complet en français et en anglais : complétez les champs signalés ou dépubliez-le.';
    }
    return (
      frenchErrors[0]?.message ??
      articleError?.message ??
      (state.invalid() ? 'Corrigez les champs signalés avant d’enregistrer.' : null)
    );
  });

  /**
   * Property missing
   * @readonly
   *
   * @description
   * Number of localized fields still to complete or in error, per language, shown on the tab triggers:
   * the API's completeness rule applied to the current values (`incompleteFields`), plus every field of
   * that language whose validation fails, each field counted once.
   *
   * @type {Signal<Readonly<Record<ContentLocale, number>>>}
   */
  protected readonly missing: Signal<Readonly<Record<ContentLocale, number>>> = computed<
    Readonly<Record<ContentLocale, number>>
  >((): Readonly<Record<ContentLocale, number>> => ({
    fr: this.missingPaths('fr').size,
    en: this.missingPaths('en').size,
  }));
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Resets the form to every new `values`, which clears its dirty and touched state.
   */
  public constructor() {
    effect((): void => {
      const values: ProjectFormValues = this.values();
      untracked((): void => {
        this.projectForm().reset(values);
        this.sentValues.set(null);
      });
    });
  }
  // #endregion

  // #region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Emits the values when no write is running and the form is valid; otherwise marks every field
   * touched so the errors show. Also called by the page's Ctrl/Cmd+S shortcut.
   */
  public submit(): void {
    if (this.pending()) {
      return;
    }
    const state: FieldState<ProjectFormValues, string | number> = this.projectForm();
    if (state.invalid()) {
      state.markAsTouched();
      this.revealErrors();
      return;
    }
    this.sentValues.set(structuredClone(this.model()));
    this.submitted.emit(this.model());
  }

  /**
   * Method cancel
   *
   * @description
   * Discards an editable draft only while no accepted write is pending.
   */
  protected cancel(): void {
    if (!this.pending()) this.cancelled.emit();
  }

  /**
   * Method onSubmit
   * @method onSubmit
   *
   * @description
   * Handles the native submission (button or Enter) without reloading the page.
   *
   * @param {Event} event - Submit event of the form element.
   */
  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.submit();
  }

  /**
   * Method fieldError
   * @method fieldError
   *
   * @description
   * First validation message of a short field in one language, once that field is touched or the
   * last submission returned field errors.
   *
   * @param {ProjectShortFieldKey} key - Short field inspected.
   * @param {ContentLocale} [locale] - Language inspected, French by default.
   *
   * @returns {string | null} The message, or `null` before touch or when valid.
   */
  protected fieldError(key: ProjectShortFieldKey, locale: ContentLocale = 'fr'): string | null {
    const state: FieldState<string, string> = this.projectForm[key][locale]();
    return state.touched() || this.serverErrors().length > 0
      ? (state.errors()[0]?.message ?? null)
      : null;
  }
  /**
   * Method simpleError
   *
   * @description
   * Exposes the first visible URL or technology validation message.
   */
  protected simpleError(key: 'siteUrl' | 'techs'): string | null {
    const state: FieldState<string, string> = this.projectForm[key]();
    return state.touched() || this.serverErrors().length > 0
      ? (state.errors()[0]?.message ?? null)
      : null;
  }

  /**
   * Method articleError
   *
   * @description
   * Exposes paragraph validation and mapped server violations for a flattened article field.
   */
  protected articleError(section: ArticleSection, locale: ContentLocale): string | null {
    const state: FieldState<string, string> = this.projectForm.article[section][locale]();
    return state.touched() || this.serverErrors().length > 0
      ? (state.errors()[0]?.message ?? null)
      : null;
  }

  /**
   * Method describedBy
   *
   * @description
   * Links a control to the error or hint that its `ui-field` renders (`<id>-error`, `<id>-hint`).
   *
   * @param {string} id - Control id given to the field.
   * @param {string | null} error - Visible error, if any.
   * @param {boolean} [hint] - Whether the field shows a hint while valid.
   *
   * @returns {string | null} The `aria-describedby` value, or `null` when nothing is shown.
   */
  protected describedBy(id: string, error: string | null, hint: boolean = false): string | null {
    if (error) return `${id}-error`;
    return hint ? `${id}-hint` : null;
  }

  /**
   * Method missingPaths
   *
   * @description
   * Paths of one language's localized fields that are incomplete or invalid.
   *
   * @param {ContentLocale} locale - Language inspected.
   *
   * @returns {Set<string>} Field paths such as `title.en` or `article.context.en`.
   */
  private missingPaths(locale: ContentLocale): Set<string> {
    const paths: Set<string> = new Set<string>(incompleteFields(this.model(), locale));
    for (const field of PROJECT_SHORT_FIELDS) {
      if (this.projectForm[field.key][locale]().invalid()) paths.add(`${field.key}.${locale}`);
    }
    for (const section of ARTICLE_SECTIONS) {
      if (this.projectForm.article[section][locale]().invalid())
        paths.add(`article.${section}.${locale}`);
    }
    return paths;
  }

  /**
   * Method revealErrors
   *
   * @description
   * After a refused submission, shows the language tab holding an invalid field when the tab on display
   * has none, French first, so that no error stays hidden in the other tab.
   */
  private revealErrors(): void {
    const invalid: (locale: ContentLocale) => boolean = (locale: ContentLocale): boolean =>
      PROJECT_SHORT_FIELDS.some((field): boolean =>
        this.projectForm[field.key][locale]().invalid(),
      ) ||
      ARTICLE_SECTIONS.some((section: ArticleSection): boolean =>
        this.projectForm.article[section][locale]().invalid(),
      );
    const current: string | null = this.locale();
    if ((current === 'fr' || current === 'en') && invalid(current)) return;
    const target: ContentLocale | undefined = (['fr', 'en'] as const).find(invalid);
    if (target) this.locale.set(target);
  }

  /**
   * Method serverError
   *
   * @description
   * Maps indexed API paragraph paths to the flat editor field while its submitted value is unchanged.
   */
  private serverError(field: string, value: string): { kind: string; message: string } | null {
    const sent: ProjectFormValues | null = this.sentValues();
    if (!sent) return null;
    const read: (model: ProjectFormValues) => unknown = (model: ProjectFormValues): unknown =>
      field
        .split('.')
        .reduce<unknown>(
          (current: unknown, key: string): unknown =>
            current && typeof current === 'object'
              ? (current as Record<string, unknown>)[key]
              : undefined,
          model,
        );
    if (read(sent) !== value) return null;
    const error: { readonly field: string; readonly message: string } | undefined =
      this.serverErrors().find(
        (error: { readonly field: string; readonly message: string }): boolean => {
          const path: string = error.field.replace(/\.\d+(?=\.|$)/g, '');
          return path === field || (field.endsWith('.fr') && path === field.slice(0, -3));
        },
      );
    return error ? { kind: 'server', message: error.message } : null;
  }
  // #endregion
}
