import { DomainError, InvalidValueError } from '@internal/content-domain/lib/errors/domain-error';
import {
  type Locale,
  LocalizedText,
} from '@internal/content-domain/lib/values/localized-text/localized-text';
import { Slug } from '@internal/content-domain/lib/values/slug/slug';
import type { ArticleDocument } from '@internal/content-domain/lib/values/article-document/article-document';
import type { ProjectPeriod } from '@internal/content-domain/lib/values/project-period/project-period';
import type { ProjectSeo } from '@internal/content-domain/lib/values/project-seo/project-seo';

/**
 * Type ProjectStatus
 * @type ProjectStatus
 *
 * @description
 * Visibility state controlling whether a project appears in published content.
 */
export type ProjectStatus = 'draft' | 'published';

/**
 * Interface ProjectArticle
 * @interface ProjectArticle
 *
 * @description
 * Case study as one rich document per language (D40): French is required, English is optional until
 * publication.
 */
export interface ProjectArticle {
  // #region Properties
  /**
   * Property fr
   * @readonly
   *
   * @description
   * French source document.
   */
  readonly fr: ArticleDocument;

  /**
   * Property en
   * @readonly
   *
   * @description
   * English document, absent until translated.
   */
  readonly en?: ArticleDocument | undefined;
  // #endregion
}

/**
 * Interface ProjectCover
 * @interface ProjectCover
 *
 * @description
 * Cover image shown at the top of the article and on the home cards (D40): an uploaded media and its
 * alternative text, which a draft may still lack in either language.
 */
export interface ProjectCover {
  // #region Properties
  /**
   * Property media
   * @readonly
   *
   * @description
   * Identifier of the uploaded media.
   */
  readonly media: string;

  /**
   * Property alt
   * @readonly
   *
   * @description
   * Alternative text per language; blank or absent text is reported by `missingFor`.
   */
  readonly alt: { readonly fr: string; readonly en?: string | undefined };
  // #endregion
}

/**
 * Interface ProjectProps
 * @interface ProjectProps
 *
 * @description
 * Complete persisted state used to rehydrate a project aggregate.
 */
export interface ProjectProps {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable project identifier.
   */
  readonly id: string;

  /**
   * Property slug
   * @readonly
   *
   * @description
   * Validated public URL segment for this project.
   */
  readonly slug: Slug;

  /**
   * Property title
   * @readonly
   *
   * @description
   * Localized project title.
   */
  readonly title: LocalizedText;

  /**
   * Property summary
   * @readonly
   *
   * @description
   * Localized short description used in project listings.
   */
  readonly summary: LocalizedText;

  /**
   * Property lead
   * @readonly
   *
   * @description
   * Localized introductory text for the case study.
   */
  readonly lead: LocalizedText;

  /**
   * Property period
   * @readonly
   *
   * @description
   * Start and end of the project, months or whole years (D46); the public label is written from it.
   */
  readonly period: ProjectPeriod;

  /**
   * Property client
   * @readonly
   *
   * @description
   * Localized client name.
   */
  readonly client: LocalizedText;

  /**
   * Property role
   * @readonly
   *
   * @description
   * Localized role performed on the project.
   */
  readonly role: LocalizedText;

  /**
   * Property place
   * @readonly
   *
   * @description
   * Localized project location.
   */
  readonly place: LocalizedText;

  /**
   * Property siteUrl
   * @readonly
   *
   * @description
   * Optional HTTPS link to the deployed project.
   */
  readonly siteUrl: string | null;

  /**
   * Property techs
   * @readonly
   *
   * @description
   * Technology keys in display order; rehydration checks their normalized format and uniqueness.
   */
  readonly techs: readonly string[];

  /**
   * Property featured
   * @readonly
   *
   * @description
   * Whether the project receives featured placement on the home page.
   */
  readonly featured: boolean;

  /**
   * Property position
   * @readonly
   *
   * @description
   * Nonnegative display-order position.
   */
  readonly position: number;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Draft or published visibility state.
   */
  readonly status: ProjectStatus;

  /**
   * Property version
   * @readonly
   *
   * @description
   * Persisted optimistic-lock version, starting at one.
   */
  readonly version: number;

  /**
   * Property article
   * @readonly
   *
   * @description
   * Localized body of the case study.
   */
  readonly article: ProjectArticle;

  /**
   * Property cover
   * @readonly
   *
   * @description
   * Cover image, or `null` when the project shows the tinted placeholder.
   */
  readonly cover: ProjectCover | null;

  /**
   * Property seo
   * @readonly
   *
   * @description
   * Optional search title and description per language; never part of publication completeness.
   */
  readonly seo: ProjectSeo;
  // #endregion
}

/**
 * Type ProjectRevision
 * @type ProjectRevision
 *
 * @description
 * Administration-editable project content; identity, position and publication state use separate
 * domain operations.
 */
export type ProjectRevision = Pick<
  ProjectProps,
  | 'title'
  | 'summary'
  | 'lead'
  | 'period'
  | 'client'
  | 'role'
  | 'place'
  | 'siteUrl'
  | 'techs'
  | 'featured'
  | 'article'
  | 'cover'
  | 'seo'
>;

/**
 * Constant TECH_KEY
 *
 * @description
 * Pattern accepted for normalized technology catalogue keys.
 */
const TECH_KEY: RegExp = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Class Project
 * @class Project
 *
 * @description
 * Project aggregate that validates persisted values and protects publication completeness rules.
 */
export class Project {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates the aggregate around persisted state; callers use `rehydrate` to validate invariants.
   *
   * @param {ProjectProps} props - Aggregate state replaced only after validated domain operations.
   */
  private constructor(private props: ProjectProps) {}
  // #endregion

  // #region Methods
  /**
   * Method rehydrate
   * @method rehydrate
   *
   * @description
   * Rebuilds persisted state and rejects invalid positions, versions, HTTPS URL strings containing no whitespace, duplicate tech keys or a cover without media.
   * The returned aggregate copies the technology list to avoid retaining its mutable input array.
   *
   * @param {ProjectProps} props - Persisted project state.
   * @returns {Project} Rehydrated aggregate.
   */
  public static rehydrate(props: ProjectProps): Project {
    if (!Number.isInteger(props.position) || props.position < 0) {
      throw new InvalidValueError('position', 'positive integer expected');
    }
    if (!Number.isInteger(props.version) || props.version < 1) {
      throw new InvalidValueError('version', 'integer greater than or equal to 1 expected');
    }
    if (props.siteUrl !== null && !/^https:\/\/\S+$/.test(props.siteUrl)) {
      throw new InvalidValueError('siteUrl', 'https address expected');
    }
    const badTech: string | undefined = props.techs.find(
      (tech: string): boolean => !TECH_KEY.test(tech),
    );
    if (badTech !== undefined) {
      throw new InvalidValueError('techs', `invalid tech key "${badTech}"`);
    }
    if (new Set(props.techs).size !== props.techs.length) {
      throw new InvalidValueError('techs', 'a tech appears twice');
    }
    if (props.cover !== null && props.cover.media.trim() === '') {
      throw new InvalidValueError('cover', 'a media identifier is expected');
    }
    return new Project({ ...props, techs: [...props.techs] });
  }

  /**
   * Method id
   * @method id
   *
   * @description
   * Returns the stable project identifier.
   *
   * @returns {string} Project identifier.
   */
  public get id(): string {
    return this.props.id;
  }

  /**
   * Method slug
   * @method slug
   *
   * @description
   * Returns the validated public URL segment.
   *
   * @returns {Slug} Project slug.
   */
  public get slug(): Slug {
    return this.props.slug;
  }

  /**
   * Method status
   * @method status
   *
   * @description
   * Returns the current visibility state.
   *
   * @returns {ProjectStatus} Draft or published status.
   */
  public get status(): ProjectStatus {
    return this.props.status;
  }

  /**
   * Method version
   * @method version
   *
   * @description
   * Returns the persisted optimistic-lock version.
   *
   * @returns {number} Current project version.
   */
  public get version(): number {
    return this.props.version;
  }

  /**
   * Method position
   * @method position
   *
   * @description
   * Returns the current display-order position.
   *
   * @returns {number} Nonnegative position.
   */
  public get position(): number {
    return this.props.position;
  }

  /**
   * Method isPublished
   * @method isPublished
   *
   * @description
   * Checks whether public content may include this project.
   *
   * @returns {boolean} Whether status is `published`.
   */
  public isPublished(): boolean {
    return this.props.status === 'published';
  }

  /**
   * Method missingFor
   * @method missingFor
   *
   * @description
   * Lists, per supplied locale, the paths still to fill in before publication: the short fields
   * (`title.en`…), `article.<locale>` when that document is absent or empty,
   * `article.<locale>.figures` when one of its figures lacks alternative text and
   * `cover.alt.<locale>` when a cover lacks it. The search texts are optional and never listed; the
   * period has no text and is always set (D46).
   *
   * @param {readonly Locale[]} locales - Locales required by the publishing site.
   * @returns {string[]} Missing field paths, empty when all required content is present.
   */
  public missingFor(locales: readonly Locale[]): string[] {
    const missing: string[] = [];
    const texts: Record<string, LocalizedText> = {
      title: this.props.title,
      summary: this.props.summary,
      lead: this.props.lead,
      client: this.props.client,
      role: this.props.role,
      place: this.props.place,
    };
    for (const locale of locales) {
      for (const [field, text] of Object.entries(texts)) {
        if (!text.isCompleteFor(locale)) {
          missing.push(`${field}.${locale}`);
        }
      }
      const document: ArticleDocument | undefined = this.props.article[locale];
      if (document === undefined || document.isEmpty()) {
        missing.push(`article.${locale}`);
      }
      if (document !== undefined && document.figuresMissingAlt().length > 0) {
        missing.push(`article.${locale}.figures`);
      }
      const cover: ProjectCover | null = this.props.cover;
      if (cover !== null && (cover.alt[locale] ?? '').trim() === '') {
        missing.push(`cover.alt.${locale}`);
      }
    }
    return missing;
  }

  /**
   * Method mediaIds
   * @method mediaIds
   *
   * @description
   * Lists the media the project references, without duplicates: the cover first, then the figures of
   * the French and English documents.
   *
   * @returns {string[]} Referenced media identifiers.
   */
  public mediaIds(): string[] {
    const { article, cover } = this.props;
    return [
      ...new Set([
        ...(cover === null ? [] : [cover.media]),
        ...article.fr.mediaIds(),
        ...(article.en?.mediaIds() ?? []),
      ]),
    ];
  }

  /**
   * Method publish
   * @method publish
   *
   * @description
   * Marks the project published only when `missingFor` reports nothing for the supplied locales.
   *
   * @param {readonly Locale[]} locales - Locales required for publication.
   * @throws {DomainError} When any required translation is incomplete.
   * @returns {void} Completes after setting the project status to published.
   */
  public publish(locales: readonly Locale[]): void {
    const missing: string[] = this.missingFor(locales);
    if (missing.length > 0) {
      throw new DomainError(
        'content.project-incomplete',
        'The project is incomplete and cannot be published.',
        missing,
      );
    }
    this.props = { ...this.props, status: 'published' };
  }

  /**
   * Method revise
   * @method revise
   *
   * @description
   * Replaces editable fields while preserving identity, status, position and version. A published
   * project must remain complete for every supplied locale or the change is rejected.
   *
   * @param {ProjectRevision} revision - New editable content.
   * @param {readonly Locale[]} publishedLocales - Locales that published projects must satisfy.
   * @throws {DomainError} When a published project's required text would become incomplete.
   * @returns {void} Completes after replacing the editable project fields.
   */
  public revise(revision: ProjectRevision, publishedLocales: readonly Locale[]): void {
    // Field by field: an object carrying more (id, status, version…) changes nothing else.
    const next: Project = Project.rehydrate({
      ...this.props,
      title: revision.title,
      summary: revision.summary,
      lead: revision.lead,
      period: revision.period,
      client: revision.client,
      role: revision.role,
      place: revision.place,
      siteUrl: revision.siteUrl,
      techs: revision.techs,
      featured: revision.featured,
      article: revision.article,
      cover: revision.cover,
      seo: revision.seo,
    });
    if (this.isPublished()) {
      const missing: string[] = next.missingFor(publishedLocales);
      if (missing.length > 0) {
        throw new DomainError(
          'content.project-incomplete',
          'A published project must stay complete; unpublish it before removing text.',
          missing,
        );
      }
    }
    this.props = next.props;
  }

  /**
   * Method unpublish
   * @method unpublish
   *
   * @description
   * Moves the project to draft state so it is excluded from public content.
   *
   * @returns {void} Completes after setting the project status to draft.
   */
  public unpublish(): void {
    this.props = { ...this.props, status: 'draft' };
  }

  /**
   * Method snapshot
   * @method snapshot
   *
   * @description
   * Returns the aggregate's persisted properties for adapters and presenters.
   *
   * @returns {ProjectProps} Current project state.
   */
  public snapshot(): ProjectProps {
    return this.props;
  }
  // #endregion
}
