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
  viewChildren,
  type ElementRef,
  type InputSignal,
  type TemplateRef,
  type InputSignalWithTransform,
  type WritableSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import {
  FormField,
  disabled,
  form,
  required,
  validate,
  type FieldTree,
  type FieldState,
  type ValidationError,
} from '@angular/forms/signals';
import { NgIcon } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucideCircleCheck,
  lucideCopy,
  lucideImage,
  lucideImageOff,
  lucideImagePlus,
  lucideTrash2,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
import {
  ADMIN_MEDIA_LIMITS,
  type AdminMedia,
  type ArticleDocumentDraft,
  type PageSeo,
  type ProjectPageSeoSource,
  SITE_ORIGIN,
  figuresMissingAlt,
  isArticleEmpty,
  projectPageSeo,
} from '@vfortin/content-web-data-access/admin';
import {
  AlertDirective,
  AlertTitleDirective,
  ButtonDirective,
  CheckboxComponent,
  ConfirmDialogService,
  EMPTY_IMPORTS,
  FieldComponent,
  FieldErrorDirective,
  FieldSetDirective,
  InputDirective,
  KbdDirective,
  ModifierKeyService,
  PeriodPickerComponent,
  TagsInputComponent,
  ToastService,
  type PeriodBound,
} from '@vfortin/ui';
import { techKey } from '@vfortin/content-web-ui';
import { EMPTY_PROJECT_DRAFT } from '@internal/content-web-feature-admin/lib/constants/empty-project-draft.constants';
import { INCOMPLETE_ERROR } from '@internal/content-web-feature-admin/lib/constants/incomplete-error.constants';
import { PROJECT_FORM_MESSAGES } from '@internal/content-web-feature-admin/lib/constants/project-form-messages.constants';
import { PROJECT_SEO_LIMITS } from '@internal/content-web-feature-admin/lib/constants/project-seo-limits.constants';
import { PROJECT_PERIOD_LIMITS } from '@internal/content-web-feature-admin/lib/constants/project-period-limits.constants';
import { PROJECT_TECH_LIMITS } from '@internal/content-web-feature-admin/lib/constants/project-tech-limits.constants';
import { PROJECT_SHORT_FIELDS } from '@internal/content-web-feature-admin/lib/constants/project-short-fields.constants';
import { PROJECT_TEXT_SECTIONS } from '@internal/content-web-feature-admin/lib/constants/project-text-sections.constants';
import { SEO_PREVIEW_SITE } from '@internal/content-web-feature-admin/lib/constants/seo-preview-site.constants';
import type { ContentLocale } from '@internal/content-web-feature-admin/lib/models/content-locale/content-locale.type';
import type { LocaleFieldState } from '@internal/content-web-feature-admin/lib/models/locale-field-state/locale-field-state.type';
import type { ProjectShortFieldKey } from '@internal/content-web-feature-admin/lib/models/project-short-field/project-short-field-key.type';
import type { ProjectTextSection } from '@internal/content-web-feature-admin/lib/models/project-text-section/project-text-section.interface';
import type { SeoGeneratedTag } from '@internal/content-web-feature-admin/lib/models/seo-generated-tag/seo-generated-tag.interface';
import type { SeoPreview } from '@internal/content-web-feature-admin/lib/models/seo-preview/seo-preview.interface';
import type { SocialPreview } from '@internal/content-web-feature-admin/lib/models/social-preview/social-preview.interface';
import { ArticleEditorComponent } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/article-editor.component';
import type { ArticleImageUpload } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/models/article-image-upload.type';
import { LocaleSwitchComponent } from '@internal/content-web-feature-admin/lib/ui/components/locale-switch/locale-switch.component';
import { SeoGeneratedTagsComponent } from '@internal/content-web-feature-admin/lib/ui/components/seo-generated-tags/seo-generated-tags.component';
import { SocialPreviewComponent } from '@internal/content-web-feature-admin/lib/ui/components/social-preview/social-preview.component';
import type { ProjectFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/project-form-values.model';
import { exceedsArticleLimits } from '@internal/content-web-feature-admin/lib/utils/article-limits/article-limits.utils';
import { imageFileError } from '@internal/content-web-feature-admin/lib/utils/image-file/image-file.utils';
import { incompleteFields } from '@internal/content-web-feature-admin/lib/utils/incomplete-fields/incomplete-fields.utils';
import { projectSeoSource } from '@internal/content-web-feature-admin/lib/utils/project-seo-source/project-seo-source.utils';
import { seoGeneratedTags } from '@internal/content-web-feature-admin/lib/utils/seo-generated-tags/seo-generated-tags.utils';
import {
  keywordsError,
  mergeKeywords,
} from '@internal/content-web-feature-admin/lib/utils/seo-keywords/seo-keywords.utils';
import { seoPreview } from '@internal/content-web-feature-admin/lib/utils/seo-preview/seo-preview.utils';
import { serverPath } from '@internal/content-web-feature-admin/lib/utils/server-path/server-path.utils';
import { socialPreview } from '@internal/content-web-feature-admin/lib/utils/social-preview/social-preview.utils';

/**
 * Type LocalizedField
 *
 * @description
 * Bilingual fields of the form by path, each showing one language at a time: the short fields, the
 * article, the search texts and keywords, and the cover's alternative text.
 */
type LocalizedField =
  ProjectShortFieldKey | 'article' | 'seo.title' | 'seo.description' | 'seo.keywords' | 'cover.alt';

/**
 * Constant LOCALIZED_FIELDS
 *
 * @description
 * Every bilingual field, in form order, for the error reveal after a refused submission.
 *
 * @type {readonly LocalizedField[]}
 */
const LOCALIZED_FIELDS: readonly LocalizedField[] = [
  ...PROJECT_SHORT_FIELDS.map((field): ProjectShortFieldKey => field.key),
  'article',
  'seo.title',
  'seo.description',
  'seo.keywords',
  'cover.alt',
];

/**
 * Component ProjectFormComponent
 * @class ProjectFormComponent
 *
 * @description
 * Bilingual project editor: the presentation and information sections, the case-study article
 * edited in the WYSIWYG editor (D40), and the search texts and keywords with their counters, search
 * result and link card previews and the list of the tags the public page will emit (D42); a sticky
 * save bar closes the form. Each bilingual field shows one language at a time, switched by its
 * language toggle, which marks a language still to complete or in error (the owner's choice over
 * page-level language tabs): joined to the end of a one-line control, in a strip under a textarea,
 * at the end of each article editor's toolbar (both editors stay alive, one shown); the previews
 * follow their own toggle. The settings shared by both languages (cover, period, site,
 * technologies, home-page feature) are the `settings` template, which the page renders in its
 * properties panel: they stay fields of this Signal Form, so the save bar and Ctrl/Cmd+S submit
 * them. The period (D46), French short fields and the French article are required, a figure needs
 * its alternative text once the article is touched and, for a published project (`complete`), both
 * languages must stay complete as the API requires; valid values leave through `submitted`, the
 * page saves them.
 */
@Component({
  selector: 'content-project-form',
  imports: [
    AlertDirective,
    AlertTitleDirective,
    ArticleEditorComponent,
    ButtonDirective,
    CheckboxComponent,
    EMPTY_IMPORTS,
    FieldComponent,
    FieldErrorDirective,
    FieldSetDirective,
    FormField,
    InputDirective,
    KbdDirective,
    LocaleSwitchComponent,
    NgIcon,
    PeriodPickerComponent,
    SeoGeneratedTagsComponent,
    SocialPreviewComponent,
    TagsInputComponent,
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
   * Whether a write is running: the fieldsets and the editors are disabled and submissions ignored,
   * so the answer can replace the values without losing a keystroke.
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
   * Property upload
   * @readonly
   *
   * @description
   * Image upload supplied by the page, used by the article editors and the cover.
   *
   * @type {InputSignal<ArticleImageUpload | null>}
   */
  public readonly upload: InputSignal<ArticleImageUpload | null> = input<ArticleImageUpload | null>(
    null,
  );

  /**
   * Property media
   * @readonly
   *
   * @description
   * Media known to the page (referenced by the project or uploaded since), by id, to display the cover.
   *
   * @type {InputSignal<ReadonlyMap<string, AdminMedia>>}
   */
  public readonly media: InputSignal<ReadonlyMap<string, AdminMedia>> = input<
    ReadonlyMap<string, AdminMedia>
  >(new Map<string, AdminMedia>());

  /**
   * Property slug
   * @readonly
   *
   * @description
   * Public slug of the project, for the URL of the search result preview.
   *
   * @type {InputSignal<string>}
   */
  public readonly slug: InputSignal<string> = input<string>('');

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
   * Property textSections
   * @readonly
   *
   * @description
   * Sections of short fields at the top of the form.
   *
   * @type {readonly ProjectTextSection[]}
   */
  protected readonly textSections: readonly ProjectTextSection[] = PROJECT_TEXT_SECTIONS;

  /**
   * Property seoLimits
   * @readonly
   *
   * @description
   * Search text bounds and warning lengths of the counters, and the keyword bounds.
   */
  protected readonly seoLimits: typeof PROJECT_SEO_LIMITS = PROJECT_SEO_LIMITS;

  /**
   * Property normalizeKeyword
   * @readonly
   *
   * @description
   * Stores a typed keyword trimmed, its inner whitespace collapsed; case is kept, duplicates are
   * compared regardless of it.
   *
   * @type {(raw: string) => string}
   */
  protected readonly normalizeKeyword: (raw: string) => string = (raw: string): string =>
    raw.trim().replace(/\s+/g, ' ');

  /**
   * Property siteName
   * @readonly
   *
   * @description
   * Site name heading the search result preview.
   *
   * @type {string}
   */
  protected readonly siteName: string = SEO_PREVIEW_SITE.name;

  /**
   * Property labels
   * @readonly
   *
   * @description
   * Labels of the search and cover fields, shared by each field, its language toggle and the
   * accessible name of its control.
   */
  protected readonly labels: {
    readonly seoTitle: string;
    readonly seoDescription: string;
    readonly keywords: string;
    readonly coverAlt: string;
  } = {
    seoTitle: $localize`:@@admin.project.form.seoTitle:Titre de recherche`,
    seoDescription: $localize`:@@admin.project.form.seoDescription:Description de recherche`,
    keywords: $localize`:@@admin.project.form.keywords:Mots clés`,
    coverAlt: $localize`:@@admin.project.form.coverAlt:Texte alternatif`,
  } as const;

  /**
   * Property settings
   * @readonly
   *
   * @description
   * Fields shared by both languages (cover, period, site, technologies, home-page feature), rendered
   * by the page in its properties panel or sheet while bound to this form.
   *
   * @type {Signal<TemplateRef<unknown>>}
   */
  public readonly settings: Signal<TemplateRef<unknown>> =
    viewChild.required<TemplateRef<unknown>>('settings');

  /**
   * Property locales
   * @readonly
   *
   * @description
   * Languages of the two article editors, French source first.
   */
  protected readonly locales: readonly ContentLocale[] = ['fr', 'en'];

  /**
   * Property shown
   * @readonly
   *
   * @description
   * Language each bilingual field shows. It survives saves, so a translator stays on the English
   * texts; a refused submission switches a field to its other language when only that one is in
   * error.
   *
   * @type {WritableSignal<Readonly<Record<LocalizedField, ContentLocale>>>}
   */
  protected readonly shown: WritableSignal<Readonly<Record<LocalizedField, ContentLocale>>> =
    signal<Readonly<Record<LocalizedField, ContentLocale>>>({
      title: 'fr',
      summary: 'fr',
      lead: 'fr',
      client: 'fr',
      role: 'fr',
      place: 'fr',
      article: 'fr',
      'seo.title': 'fr',
      'seo.description': 'fr',
      'seo.keywords': 'fr',
      'cover.alt': 'fr',
    });

  /**
   * Property previewLocale
   * @readonly
   *
   * @description
   * Language of the search result and link card previews and of the generated tags, French first.
   *
   * @type {WritableSignal<ContentLocale>}
   */
  protected readonly previewLocale: WritableSignal<ContentLocale> = signal<ContentLocale>('fr');

  /**
   * Property accept
   * @readonly
   *
   * @description
   * Types offered by the cover picker, from the upload limits.
   *
   * @type {string}
   */
  protected readonly accept: string = ADMIN_MEDIA_LIMITS.types.join(',');

  /**
   * Property coverUploading
   * @readonly
   *
   * @description
   * Whether a cover image is being uploaded.
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly coverUploading: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the validation summary, the cover and its empty or unavailable box, the English
   * copy, the search text counters and the save bar.
   */
  protected readonly icons: {
    readonly alert: typeof lucideCircleAlert;
    readonly copy: typeof lucideCopy;
    readonly cover: typeof lucideImage;
    readonly coverMissing: typeof lucideImageOff;
    readonly image: typeof lucideImagePlus;
    readonly remove: typeof lucideTrash2;
    readonly saved: typeof lucideCircleCheck;
    readonly warning: typeof lucideTriangleAlert;
  } = {
    alert: lucideCircleAlert,
    copy: lucideCopy,
    cover: lucideImage,
    coverMissing: lucideImageOff,
    image: lucideImagePlus,
    remove: lucideTrash2,
    saved: lucideCircleCheck,
    warning: lucideTriangleAlert,
  } as const;

  /**
   * Property confirmations
   * @readonly
   *
   * @description
   * Asks before replacing a written English article with the French one.
   *
   * @type {ConfirmDialogService}
   */
  private readonly confirmations: ConfirmDialogService =
    inject<ConfirmDialogService>(ConfirmDialogService);

  /**
   * Property toasts
   * @readonly
   *
   * @description
   * Reports a refused or failed cover upload.
   *
   * @type {ToastService}
   */
  private readonly toasts: ToastService = inject<ToastService>(ToastService);

  /**
   * Property origin
   * @readonly
   *
   * @description
   * Public site origin the generated tags are built from, as on the public pages (D42).
   *
   * @type {string}
   */
  private readonly origin: string = inject<string>(SITE_ORIGIN);

  /**
   * Property modifier
   * @readonly
   *
   * @description
   * Platform modifier of the save shortcut cap, « Ctrl S » or « ⌘ S » (D36).
   *
   * @type {ModifierKeyService}
   */
  protected readonly modifier: ModifierKeyService = inject<ModifierKeyService>(ModifierKeyService);

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Injector of the render hook that moves the focus after a discard.
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
   * Property articlePanes
   * @readonly
   *
   * @description
   * French then English article editor with its error, one of them hidden.
   *
   * @type {Signal<readonly ElementRef<HTMLElement>[]>}
   */
  private readonly articlePanes: Signal<readonly ElementRef<HTMLElement>[]> =
    viewChildren<ElementRef<HTMLElement>>('articlePane');

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
   * Signal Form with contract text, document and image-text bounds, HTTPS and technology rules, the
   * completeness of a published project and server errors attached to their corresponding fields.
   *
   * @type {FieldTree<ProjectFormValues>}
   */
  protected readonly projectForm: FieldTree<ProjectFormValues, string | number, 'writable'> = form(
    this.model,
    (path): void => {
      for (const field of PROJECT_SHORT_FIELDS) {
        required(path[field.key].fr, { message: PROJECT_FORM_MESSAGES.frenchRequired });
        for (const locale of ['fr', 'en'] as const) {
          validate(
            path[field.key][locale],
            ({ value }): { kind: string; message: string } | null => {
              if (value().trim().length > 4000)
                return { kind: 'maxLength', message: PROJECT_FORM_MESSAGES.maxChars(4000) };
              if (locale === 'fr' && value().trim() === '')
                return { kind: 'required', message: PROJECT_FORM_MESSAGES.frenchRequired };
              if (this.gaps().has(`${field.key}.${locale}`)) return INCOMPLETE_ERROR;
              return this.serverError(`${field.key}.${locale}`, value());
            },
          );
        }
      }
      for (const locale of ['fr', 'en'] as const) {
        disabled(path.article[locale], (): boolean => this.pending());
        validate(
          path.article[locale],
          ({ value, state }): { kind: string; message: string } | null => {
            const document: ArticleDocumentDraft = value();
            if (locale === 'fr' && isArticleEmpty(document))
              return {
                kind: 'required',
                message: $localize`:@@admin.project.form.frenchArticleRequired:L’article français est obligatoire.`,
              };
            if (exceedsArticleLimits(document))
              return {
                kind: 'maxLength',
                message: $localize`:@@admin.project.form.articleTooLong:L’article dépasse 100 000 caractères, 5 000 blocs ou 40 images.`,
              };
            if ((state.touched() || this.complete()) && figuresMissingAlt(document) > 0)
              return {
                kind: 'figureAlt',
                message: $localize`:@@admin.project.form.figureAlt:Chaque image de l’article doit avoir un texte alternatif.`,
              };
            if (this.gaps().has(`article.${locale}`)) return INCOMPLETE_ERROR;
            return this.serverError(`article.${locale}`, document);
          },
        );
        for (const kind of ['title', 'description'] as const) {
          validate(
            path.seo[kind][locale],
            ({ value }): { kind: string; message: string } | null => {
              if (value().trim().length > PROJECT_SEO_LIMITS[kind])
                return {
                  kind: 'maxLength',
                  message: PROJECT_FORM_MESSAGES.maxChars(PROJECT_SEO_LIMITS[kind]),
                };
              return this.serverError(`seo.${kind}.${locale}`, value());
            },
          );
        }
        validate(
          path.seo.keywords[locale],
          ({ value }): { kind: string; message: string } | null =>
            keywordsError(value()) ?? this.serverError(`seo.keywords.${locale}`, value()),
        );
        validate(path.cover.alt[locale], ({ value }): { kind: string; message: string } | null => {
          if (value().trim().length > 300)
            return { kind: 'maxLength', message: PROJECT_FORM_MESSAGES.maxChars(300) };
          if (this.gaps().has(`cover.alt.${locale}`)) return INCOMPLETE_ERROR;
          return this.serverError(`cover.alt.${locale}`, value());
        });
      }
      validate(path.cover.media, ({ value }): { kind: string; message: string } | null =>
        this.serverError('cover.media', value()),
      );
      required(path.period, {
        message: $localize`:@@admin.project.form.periodRequired:Choisissez le début, puis la fin ou « En cours ».`,
      });
      // The picker keeps the end after the start; the API's start and end errors land here.
      validate(path.period, ({ value }): { kind: string; message: string } | null =>
        this.serverError('period', value()),
      );
      validate(path.siteUrl, ({ value }): { kind: string; message: string } | null => {
        if (value().trim()) {
          try {
            if (new URL(value().trim()).protocol !== 'https:')
              return { kind: 'https', message: PROJECT_FORM_MESSAGES.httpsRequired };
          } catch {
            return { kind: 'https', message: PROJECT_FORM_MESSAGES.httpsRequired };
          }
        }
        return this.serverError('siteUrl', value());
      });
      validate(path.techs, ({ value }): { kind: string; message: string } | null => {
        const keys: string[] = value();
        if (
          keys.length > PROJECT_TECH_LIMITS.count ||
          keys.some((key: string): boolean => !PROJECT_TECH_LIMITS.key.test(key))
        )
          return {
            kind: 'techs',
            message: $localize`:@@admin.project.form.techsInvalid:12 clés maximum, en minuscules et séparées par des virgules.`,
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
   * Property coverMedia
   * @readonly
   *
   * @description
   * Media of the cover, empty without cover.
   *
   * @type {Signal<string>}
   */
  protected readonly coverMedia: Signal<string> = computed<string>((): string =>
    this.projectForm.cover.media().value(),
  );

  /**
   * Property techLimit
   * @readonly
   *
   * @description
   * Largest number of technology tags, from the contract copy.
   *
   * @type {number}
   */
  protected readonly techLimit: number = PROJECT_TECH_LIMITS.count;

  /**
   * Property periodMin
   * @readonly
   *
   * @description
   * Earliest month of the period picker, the contract's first year.
   *
   * @type {PeriodBound}
   */
  protected readonly periodMin: PeriodBound = { year: PROJECT_PERIOD_LIMITS.yearMin, month: 1 };

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
    year: Math.min(new Date().getFullYear() + 5, PROJECT_PERIOD_LIMITS.yearMax),
    month: 12,
  };

  /**
   * Property normalizeTech
   * @readonly
   *
   * @description
   * Stores a typed technology as a catalogue key (`techKey`: trimmed, lowercase, an alias such as
   * `postgres` replaced by `postgresql`); the validator then checks the kebab-case form.
   *
   * @type {(raw: string) => string}
   */
  protected readonly normalizeTech: (raw: string) => string = techKey;

  /**
   * Property coverSrc
   * @readonly
   *
   * @description
   * URL of the cover image, `null` without cover or when its media is unknown to the page.
   *
   * @type {Signal<string | null>}
   */
  protected readonly coverSrc: Signal<string | null> = computed<string | null>(
    (): string | null => this.media().get(this.coverMedia())?.src ?? null,
  );

  /**
   * Property summary
   * @readonly
   *
   * @description
   * Validation message above the fields once the form is touched: missing French texts first, then the
   * completeness of a published project, then the first article error, then a pointer to the
   * properties panel when a shared setting is wrong, then a generic message; `null` while valid or
   * untouched.
   *
   * @type {Signal<string | null>}
   */
  protected readonly summary: Signal<string | null> = computed<string | null>((): string | null => {
    const state: FieldState<ProjectFormValues, string | number> = this.projectForm();
    if (!state.touched()) {
      return null;
    }
    const frenchErrors: ValidationError.WithFieldTree[] = [
      ...PROJECT_SHORT_FIELDS.flatMap((field): ValidationError.WithFieldTree[] =>
        this.projectForm[field.key].fr().errors(),
      ),
      ...this.projectForm.article.fr().errors(),
    ];
    if (
      frenchErrors.some(
        (error: ValidationError.WithFieldTree): boolean => error.kind === 'required',
      )
    ) {
      return $localize`:@@admin.project.form.summary.frenchRequired:Les textes français marqués d’une erreur sont obligatoires.`;
    }
    if (this.gaps().size > 0) {
      return $localize`:@@admin.project.form.summary.incomplete:Un projet publié doit rester complet en français et en anglais : complétez les champs signalés ou dépubliez-le.`;
    }
    const first: string | undefined =
      frenchErrors[0]?.message ?? this.projectForm.article.en().errors()[0]?.message;
    if (first) return first;
    // The shared settings sit in the properties panel, possibly a closed sheet: name where to look.
    if (
      this.projectForm.siteUrl().invalid() ||
      this.projectForm.techs().invalid() ||
      this.projectForm.period().invalid() ||
      this.projectForm.cover.media().invalid() ||
      this.projectForm.cover.alt.fr().invalid() ||
      this.projectForm.cover.alt.en().invalid()
    )
      return $localize`:@@admin.project.form.summary.properties:Corrigez les champs signalés dans le panneau Propriétés.`;
    return state.invalid()
      ? $localize`:@@admin.project.form.summary.invalid:Corrigez les champs signalés avant d’enregistrer.`
      : null;
  });

  /**
   * Property previews
   * @readonly
   *
   * @description
   * Search result of each language's public page, following the edits.
   *
   * @type {Signal<Readonly<Record<ContentLocale, SeoPreview>>>}
   */
  protected readonly previews: Signal<Readonly<Record<ContentLocale, SeoPreview>>> = computed<
    Readonly<Record<ContentLocale, SeoPreview>>
  >((): Readonly<Record<ContentLocale, SeoPreview>> => ({
    fr: seoPreview(this.model(), 'fr', this.slug()),
    en: seoPreview(this.model(), 'en', this.slug()),
  }));

  /**
   * Property seoPages
   * @readonly
   *
   * @description
   * Metadata of each language's public page resolved from the current values by the public
   * `projectPageSeo` (D42), with the source they were resolved from.
   *
   * @type {Signal<Readonly<Record<ContentLocale, { source: ProjectPageSeoSource; page: PageSeo }>>>}
   */
  private readonly seoPages: Signal<
    Readonly<
      Record<ContentLocale, { readonly source: ProjectPageSeoSource; readonly page: PageSeo }>
    >
  > = computed<
    Readonly<
      Record<ContentLocale, { readonly source: ProjectPageSeoSource; readonly page: PageSeo }>
    >
  >(() => {
    const resolve = (
      locale: ContentLocale,
    ): { readonly source: ProjectPageSeoSource; readonly page: PageSeo } => {
      const source: ProjectPageSeoSource = projectSeoSource(
        this.model(),
        locale,
        this.slug(),
        this.media(),
      );
      return { source, page: projectPageSeo(source, locale, this.origin) };
    };
    return { fr: resolve('fr'), en: resolve('en') };
  });

  /**
   * Property generatedTags
   * @readonly
   *
   * @description
   * « Balises générées » of each language: the head elements its public page will emit.
   *
   * @type {Signal<Readonly<Record<ContentLocale, readonly SeoGeneratedTag[]>>>}
   */
  protected readonly generatedTags: Signal<
    Readonly<Record<ContentLocale, readonly SeoGeneratedTag[]>>
  > = computed<Readonly<Record<ContentLocale, readonly SeoGeneratedTag[]>>>(() => ({
    fr: seoGeneratedTags(this.seoPages().fr.page),
    en: seoGeneratedTags(this.seoPages().en.page),
  }));

  /**
   * Property socialPreviews
   * @readonly
   *
   * @description
   * Link card of each language's public page, from its Open Graph values.
   *
   * @type {Signal<Readonly<Record<ContentLocale, SocialPreview>>>}
   */
  protected readonly socialPreviews: Signal<Readonly<Record<ContentLocale, SocialPreview>>> =
    computed<Readonly<Record<ContentLocale, SocialPreview>>>(() => {
      const { fr, en } = this.seoPages();
      return {
        fr: socialPreview(fr.page, fr.source, this.origin),
        en: socialPreview(en.page, en.source, this.origin),
      };
    });

  /**
   * Property techsHint
   * @readonly
   *
   * @description
   * Placeholder of the empty keyword fields: the technologies the page then writes, or a neutral hint
   * without any.
   *
   * @type {Signal<string>}
   */
  protected readonly techsHint: Signal<string> = computed<string>((): string =>
    this.model().techs.length > 0
      ? this.model().techs.join(', ')
      : $localize`:@@admin.project.form.keywordsPlaceholder:Ajoutez des mots clés`,
  );

  /**
   * Property missing
   * @readonly
   *
   * @description
   * Paths of the localized fields still to complete or in error, per language, behind the « À
   * compléter » state of the language selectors: the API's completeness rule applied to the current
   * values (`incompleteFields`, a draft's English included), plus every field of that language whose
   * validation fails.
   *
   * @type {Signal<Readonly<Record<ContentLocale, ReadonlySet<string>>>>}
   */
  private readonly missing: Signal<Readonly<Record<ContentLocale, ReadonlySet<string>>>> = computed<
    Readonly<Record<ContentLocale, ReadonlySet<string>>>
  >((): Readonly<Record<ContentLocale, ReadonlySet<string>>> => ({
    fr: this.missingPaths('fr'),
    en: this.missingPaths('en'),
  }));
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Resets the form to every new `values`, which clears its dirty and touched state; shows the
   * fields refused by the API in the language in error.
   */
  public constructor() {
    effect((): void => {
      const values: ProjectFormValues = this.values();
      untracked((): void => {
        this.projectForm().reset(values);
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
   * Emits the values when no write is running and the form is valid; otherwise marks every field
   * touched so the errors show, each field in a language in error. Also called by the page's
   * Ctrl/Cmd+S shortcut.
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
   * Method discard
   *
   * @description
   * Discards the unsaved changes once confirmed in the leave guard's words, while no accepted write is
   * pending: the form returns to its last `values` at once, `cancelled` lets the page reload the
   * project, and the focus moves to the save status, since the discard button is then disabled.
   *
   * @returns {Promise<void>} Completion after the confirmation.
   */
  protected async discard(): Promise<void> {
    if (this.pending() || !this.dirty()) return;
    const accepted: boolean = await this.confirmations.confirm({
      title: $localize`:@@admin.project.form.discard.confirmTitle:Abandonner les modifications ?`,
      description: $localize`:@@admin.project.unsaved.lost:Les modifications de ce projet seront perdues.`,
      confirmLabel: $localize`:@@admin.project.form.discard:Abandonner`,
      cancelLabel: $localize`:@@admin.project.unsaved.keepEditing:Continuer la modification`,
      tone: 'danger',
    });
    if (!accepted || this.pending()) return;
    this.projectForm().reset(this.values());
    this.cancelled.emit();
    afterNextRender(
      { read: (): void => this.status()?.nativeElement.focus() },
      {
        injector: this.injector,
      },
    );
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
   * Method copyFrench
   *
   * @description
   * Starts the English article from a copy of the French one ("Partir du français"); a written English
   * article is replaced only once confirmed.
   *
   * @returns {Promise<void>} Completion after the optional confirmation.
   */
  protected async copyFrench(): Promise<void> {
    if (this.pending()) return;
    const english: FieldState<ArticleDocumentDraft, string | number> =
      this.projectForm.article.en();
    if (
      !isArticleEmpty(english.value()) &&
      !(await this.confirmations.confirm({
        title: $localize`:@@admin.project.form.copyFrench.confirmTitle:Remplacer l’article anglais ?`,
        description: $localize`:@@admin.project.form.copyFrench.confirmDescription:Il sera remplacé par une copie de l’article français, à traduire ensuite.`,
        confirmLabel: $localize`:@@admin.project.form.replace:Remplacer`,
        tone: 'danger',
      }))
    ) {
      return;
    }
    english.value.set(structuredClone(this.projectForm.article.fr().value()));
    english.markAsDirty();
  }

  /**
   * Method pickCover
   *
   * @description
   * Uploads the image chosen as cover, then makes it the cover; a refused file or a failed upload is
   * toasted and the cover is kept.
   *
   * @param {HTMLInputElement} picker - File input of the cover button.
   *
   * @returns {Promise<void>} Completion after the upload.
   */
  protected async pickCover(picker: HTMLInputElement): Promise<void> {
    const file: File | undefined = picker.files?.[0];
    picker.value = '';
    const upload: ArticleImageUpload | null = this.upload();
    if (!file || !upload || this.pending()) return;
    const refusal: string | null = imageFileError(file);
    if (refusal) {
      this.toasts.error(refusal);
      return;
    }
    this.coverUploading.set(true);
    try {
      const media: AdminMedia = await upload(file);
      const cover: FieldState<string, string | number> = this.projectForm.cover.media();
      cover.value.set(media.id);
      cover.markAsDirty();
    } catch (error) {
      this.toasts.error(
        $localize`:@@admin.project.form.coverUploadFailed:L’image n’a pas été envoyée.`,
        error instanceof Error && error.message ? { description: error.message } : {},
      );
    } finally {
      this.coverUploading.set(false);
    }
  }

  /**
   * Method removeCover
   *
   * @description
   * Removes the cover and its alternative texts; the project shows its tinted placeholder again.
   */
  protected removeCover(): void {
    const cover: FieldState<ProjectFormValues['cover'], string | number> = this.projectForm.cover();
    cover.value.set({ media: '', alt: { fr: '', en: '' } });
    cover.markAsDirty();
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
    return this.visibleError(this.projectForm[key][locale]());
  }

  /**
   * Method simpleError
   *
   * @description
   * Exposes the first visible URL, technology or period validation message.
   */
  protected simpleError(key: 'siteUrl' | 'techs' | 'period'): string | null {
    return this.visibleError(this.projectForm[key]());
  }

  /**
   * Method coverError
   *
   * @description
   * First visible message of a cover alternative text, or of the cover media for `media`.
   *
   * @param {ContentLocale | 'media'} key - Cover field inspected.
   *
   * @returns {string | null} The message, or `null`.
   */
  protected coverError(key: ContentLocale | 'media'): string | null {
    return this.visibleError(
      key === 'media' ? this.projectForm.cover.media() : this.projectForm.cover.alt[key](),
    );
  }

  /**
   * Method seoError
   *
   * @description
   * First visible message of one language's search title, description or keywords.
   *
   * @param {'title' | 'description' | 'keywords'} kind - Search value inspected.
   * @param {ContentLocale} locale - Language inspected.
   *
   * @returns {string | null} The message, or `null`.
   */
  protected seoError(
    kind: 'title' | 'description' | 'keywords',
    locale: ContentLocale,
  ): string | null {
    return this.visibleError(this.projectForm.seo[kind][locale]());
  }

  /**
   * Method keywordCount
   *
   * @description
   * Number of keywords of one language, for its counter.
   *
   * @param {ContentLocale} locale - Language inspected.
   *
   * @returns {number} The number of keywords.
   */
  protected keywordCount(locale: ContentLocale): number {
    return this.projectForm.seo.keywords[locale]().value().length;
  }

  /**
   * Method useTechs
   *
   * @description
   * « Reprendre les technos »: adds the project's technology keys to one language's keywords, after the
   * written ones and within the keyword limit (`mergeKeywords`).
   *
   * @param {ContentLocale} locale - Language whose keywords are completed.
   */
  protected useTechs(locale: ContentLocale): void {
    if (this.pending()) return;
    const keywords: FieldState<string[], string | number> = this.projectForm.seo.keywords[locale]();
    const merged: string[] = mergeKeywords(keywords.value(), this.model().techs);
    if (merged.length === keywords.value().length) return;
    keywords.value.set(merged);
    keywords.markAsDirty();
  }

  /**
   * Method seoLength
   *
   * @description
   * Length of one language's search title or description as the API counts it, trimmed.
   *
   * @param {'title' | 'description'} kind - Search text inspected.
   * @param {ContentLocale} locale - Language inspected.
   *
   * @returns {number} The number of characters.
   */
  protected seoLength(kind: 'title' | 'description', locale: ContentLocale): number {
    return this.projectForm.seo[kind][locale]().value().trim().length;
  }

  /**
   * Method articleError
   *
   * @description
   * Exposes the document validation and mapped server violations of one language's article.
   */
  protected articleError(locale: ContentLocale): string | null {
    return this.visibleError(this.projectForm.article[locale]());
  }

  /**
   * Method describedBy
   *
   * @description
   * Links a control to its visible error (`<id>-error`) or hint (`<id>-hint`), followed by an always
   * visible description such as a character counter (`<id>-count`).
   *
   * @param {string} id - Control id given to the field.
   * @param {string | null} error - Visible error, if any.
   * @param {boolean} [hint] - Whether the field shows a hint while valid.
   * @param {string} [extra] - Suffix of an element always describing the control.
   *
   * @returns {string | null} The `aria-describedby` value, or `null` when nothing is shown.
   */
  protected describedBy(
    id: string,
    error: string | null,
    hint: boolean = false,
    extra?: string,
  ): string | null {
    const ids: string[] = [
      ...(error ? [`${id}-error`] : hint ? [`${id}-hint`] : []),
      ...(extra ? [`${id}-${extra}`] : []),
    ];
    return ids.length > 0 ? ids.join(' ') : null;
  }

  /**
   * Method localizedName
   * @method localizedName
   *
   * @description
   * Accessible name of one language's control of a bilingual field: its label and the language it
   * shows (« Titre en anglais »), the toggle joined to it naming the language visually.
   *
   * @param {string} label - Label of the field.
   * @param {ContentLocale} locale - Language of the control.
   *
   * @returns {string} The name.
   */
  protected localizedName(label: string, locale: ContentLocale): string {
    return locale === 'fr'
      ? $localize`:@@admin.project.form.inFrench:${label}:field: en français`
      : $localize`:@@admin.project.form.inEnglish:${label}:field: en anglais`;
  }

  /**
   * Method articleLabel
   * @method articleLabel
   *
   * @description
   * Accessible name of one language's article editor.
   *
   * @param {ContentLocale} locale - Language of the editor.
   *
   * @returns {string} The name.
   */
  protected articleLabel(locale: ContentLocale): string {
    return locale === 'fr'
      ? $localize`:@@admin.project.form.articleLabel.fr:Article (français)`
      : $localize`:@@admin.project.form.articleLabel.en:Article (anglais)`;
  }

  /**
   * Method visibleError
   *
   * @description
   * First message of a field once it is touched or the last submission returned field errors.
   *
   * @param {FieldState<unknown, string | number>} state - Field inspected.
   *
   * @returns {string | null} The message, or `null`.
   */
  private visibleError(state: FieldState<unknown, string | number>): string | null {
    return state.touched() || this.serverErrors().length > 0
      ? (state.errors()[0]?.message ?? null)
      : null;
  }

  /**
   * Method show
   * @method show
   *
   * @description
   * Shows a bilingual field in a language.
   *
   * @param {LocalizedField} key - Field.
   * @param {ContentLocale} locale - Language.
   */
  protected show(key: LocalizedField, locale: ContentLocale): void {
    this.shown.update(
      (
        shown: Readonly<Record<LocalizedField, ContentLocale>>,
      ): Readonly<Record<LocalizedField, ContentLocale>> => ({ ...shown, [key]: locale }),
    );
  }

  /**
   * Method showArticle
   * @method showArticle
   *
   * @description
   * Shows the article in a language from the toggle at the end of an editor's toolbar. That toolbar is
   * hidden with its editor, so a focus inside it moves to the toggle of the editor shown.
   *
   * @param {ContentLocale} locale - Language.
   */
  protected showArticle(locale: ContentLocale): void {
    const panes: HTMLElement[] = this.articlePanes().map(
      (pane: ElementRef<HTMLElement>): HTMLElement => pane.nativeElement,
    );
    const focused: boolean = panes.some((pane: HTMLElement): boolean =>
      pane.contains(pane.ownerDocument.activeElement),
    );
    this.show('article', locale);
    if (!focused) return;
    afterNextRender(
      {
        write: (): void =>
          panes[this.locales.indexOf(locale)]
            ?.querySelector<HTMLElement>('[articleToolbarEnd] [aria-pressed="true"]')
            ?.focus(),
      },
      { injector: this.injector },
    );
  }

  /**
   * Method localeStates
   * @method localeStates
   *
   * @description
   * State of each language of a field for its selector: a shown error, else a path still to complete
   * or invalid (`missing`, an article's figures without alternative text counting for the article),
   * else filled. An empty search text or keyword list is optional, so filled while valid.
   *
   * @param {LocalizedField} key - Field.
   *
   * @returns {Readonly<Record<ContentLocale, LocaleFieldState>>} States.
   */
  protected localeStates(key: LocalizedField): Readonly<Record<ContentLocale, LocaleFieldState>> {
    const state = (locale: ContentLocale): LocaleFieldState => {
      if (this.visibleError(this.fieldOf(key, locale))) return 'error';
      const paths: ReadonlySet<string> = this.missing()[locale];
      return paths.has(`${key}.${locale}`) ||
        (key === 'article' && paths.has(`article.${locale}.figures`))
        ? 'empty'
        : 'filled';
    };
    return { fr: state('fr'), en: state('en') };
  }

  /**
   * Method fieldOf
   * @method fieldOf
   *
   * @description
   * State of one language of a bilingual field.
   *
   * @param {LocalizedField} key - Field.
   * @param {ContentLocale} locale - Language.
   *
   * @returns {FieldState<unknown, string | number>} Field state.
   */
  private fieldOf(
    key: LocalizedField,
    locale: ContentLocale,
  ): FieldState<unknown, string | number> {
    switch (key) {
      case 'article':
        return this.projectForm.article[locale]();
      case 'seo.title':
        return this.projectForm.seo.title[locale]();
      case 'seo.description':
        return this.projectForm.seo.description[locale]();
      case 'seo.keywords':
        return this.projectForm.seo.keywords[locale]();
      case 'cover.alt':
        return this.projectForm.cover.alt[locale]();
      case 'title':
      case 'summary':
      case 'lead':
      case 'client':
      case 'role':
      case 'place':
        return this.projectForm[key][locale]();
    }
  }

  /**
   * Method missingPaths
   *
   * @description
   * Paths of one language's localized fields that are incomplete or invalid.
   *
   * @param {ContentLocale} locale - Language inspected.
   *
   * @returns {Set<string>} Field paths such as `title.en`, `article.en` or `cover.alt.en`.
   */
  private missingPaths(locale: ContentLocale): Set<string> {
    const paths: Set<string> = new Set<string>(incompleteFields(this.model(), locale));
    for (const field of PROJECT_SHORT_FIELDS) {
      if (this.projectForm[field.key][locale]().invalid()) paths.add(`${field.key}.${locale}`);
    }
    if (this.projectForm.article[locale]().invalid() && !paths.has(`article.${locale}.figures`))
      paths.add(`article.${locale}`);
    if (this.projectForm.cover.alt[locale]().invalid()) paths.add(`cover.alt.${locale}`);
    for (const kind of ['title', 'description', 'keywords'] as const)
      if (this.projectForm.seo[kind][locale]().invalid()) paths.add(`seo.${kind}.${locale}`);
    return paths;
  }

  /**
   * Method revealErrors
   *
   * @description
   * After a refused submission or write, switches each bilingual field whose shown language is valid
   * to its other language when that one holds an error, so that no error stays hidden.
   */
  private revealErrors(): void {
    const shown: Record<LocalizedField, ContentLocale> = { ...this.shown() };
    for (const key of LOCALIZED_FIELDS) {
      const current: ContentLocale = shown[key];
      const other: ContentLocale = current === 'fr' ? 'en' : 'fr';
      if (!this.fieldOf(key, current).invalid() && this.fieldOf(key, other).invalid())
        shown[key] = other;
    }
    this.shown.set(shown);
  }

  /**
   * Method serverError
   *
   * @description
   * Maps an API violation to its form field while the field still holds the submitted value: an
   * article document path to the editor of its language, an unlocalized path to the French field.
   *
   * @param {string} field - Form field path, such as `title.fr` or `article.en`.
   * @param {unknown} value - Current value of the field.
   *
   * @returns {{ kind: string; message: string } | null} The server error, or `null`.
   */
  private serverError(field: string, value: unknown): { kind: string; message: string } | null {
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
    const before: unknown = read(sent);
    if (
      before !== value &&
      (typeof value !== 'object' || JSON.stringify(before) !== JSON.stringify(value))
    )
      return null;
    const error: { readonly field: string; readonly message: string } | undefined =
      this.serverErrors().find(
        (error: { readonly field: string; readonly message: string }): boolean => {
          const path: string = serverPath(error.field);
          return path === field || (field.endsWith('.fr') && path === field.slice(0, -3));
        },
      );
    return error ? { kind: 'server', message: error.message } : null;
  }
  // #endregion
}
