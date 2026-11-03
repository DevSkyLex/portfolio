import { DomainError, InvalidValueError } from '@internal/content-domain/lib/errors/domain-error';
import {
  type Locale,
  LocalizedText,
} from '@internal/content-domain/lib/values/localized-text/localized-text';
import { Slug } from '@internal/content-domain/lib/values/slug/slug';

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
 * Localized case-study paragraphs grouped by their public presentation section.
 */
export interface ProjectArticle {
  // #region Properties
  /**
   * Property context
   * @readonly
   *
   * @description
   * Context paragraphs explaining the initial situation.
   */
  readonly context: readonly LocalizedText[];

  /**
   * Property work
   * @readonly
   *
   * @description
   * Narrative paragraphs describing the work performed.
   */
  readonly work: readonly LocalizedText[];

  /**
   * Property workList
   * @readonly
   *
   * @description
   * Itemized work descriptions rendered as a list.
   */
  readonly workList: readonly LocalizedText[];

  /**
   * Property choices
   * @readonly
   *
   * @description
   * Paragraphs explaining implementation choices.
   */
  readonly choices: readonly LocalizedText[];

  /**
   * Property result
   * @readonly
   *
   * @description
   * Paragraphs describing project outcomes.
   */
  readonly result: readonly LocalizedText[];

  /**
   * Property lessons
   * @readonly
   *
   * @description
   * Reflections and lessons learned from the project.
   */
  readonly lessons: readonly LocalizedText[];

  /**
   * Property captions
   * @readonly
   *
   * @description
   * Localized captions associated with case-study media.
   */
  readonly captions: readonly LocalizedText[];
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
   * Property periodLabel
   * @readonly
   *
   * @description
   * Localized display label for the project's period.
   */
  readonly periodLabel: LocalizedText;

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
  | 'periodLabel'
  | 'client'
  | 'role'
  | 'place'
  | 'siteUrl'
  | 'techs'
  | 'featured'
  | 'article'
>;

/**
 * Constant ARTICLE_SECTIONS
 *
 * @description
 * Required `context`, `work`, `choices`, `result` and `lessons` sections checked for translations before publication.
 */
const ARTICLE_SECTIONS: readonly ['context', 'work', 'choices', 'result', 'lessons'] = [
  'context',
  'work',
  'choices',
  'result',
  'lessons',
] as const;

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
   * Rebuilds persisted state and rejects invalid positions, versions, HTTPS URL strings containing no whitespace or duplicate tech keys.
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
   * Lists required translation paths that are absent for the supplied publication locales.
   * Article sections with no paragraphs are reported as incomplete as well.
   *
   * @param {readonly Locale[]} locales - Locales required by the publishing site.
   * @returns {string[]} Missing field paths, empty when all required text is present.
   */
  public missingFor(locales: readonly Locale[]): string[] {
    const missing: string[] = [];
    const texts: Record<string, LocalizedText> = {
      title: this.props.title,
      summary: this.props.summary,
      lead: this.props.lead,
      periodLabel: this.props.periodLabel,
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
      for (const section of ARTICLE_SECTIONS) {
        const paragraphs: readonly LocalizedText[] = this.props.article[section];
        if (
          paragraphs.length === 0 ||
          paragraphs.some((p: LocalizedText): boolean => !p.isCompleteFor(locale))
        ) {
          missing.push(`article.${section}.${locale}`);
        }
      }
    }
    return missing;
  }

  /**
   * Method publish
   * @method publish
   *
   * @description
   * Marks the project published only when required fields and the required `context`, `work`, `choices`, `result` and `lessons` sections are complete.
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
      periodLabel: revision.periodLabel,
      client: revision.client,
      role: revision.role,
      place: revision.place,
      siteUrl: revision.siteUrl,
      techs: revision.techs,
      featured: revision.featured,
      article: revision.article,
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
