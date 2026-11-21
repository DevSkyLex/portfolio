import { DomainError, InvalidValueError } from '@internal/content-domain/lib/errors/domain-error';
import {
  type Locale,
  LocalizedText,
} from '@internal/content-domain/lib/values/localized-text/localized-text';
import { Slug } from '@internal/content-domain/lib/values/slug/slug';
import type { ArticleDocument } from '@internal/content-domain/lib/values/article-document/article-document';
import type { ProjectPeriod } from '@internal/content-domain/lib/values/project-period/project-period';
import type { ArticleSeo } from '@internal/content-domain/lib/values/article-seo/article-seo';

/**
 * Type ArticleStatus
 * @type ArticleStatus
 *
 * @description
 * Visibility state controlling whether a project appears in published content.
 */
export type ArticleStatus = 'draft' | 'published';

/** Legacy collection used by compatibility endpoints. */
export type PublicationKind = 'project' | 'article';

/** Stable taxonomy key and its independently translated display label. */
export interface PublicationTaxon {
  readonly key: string;
  readonly label: LocalizedText;
}

/** One category and an ordered, unique set of tags for an editorial article. */
export interface PublicationTaxonomy {
  readonly category: PublicationTaxon | null;
  readonly tags: readonly PublicationTaxon[];
}

/** Bounds shared by category and tag validation at the domain boundary. */
export const PUBLICATION_TAXONOMY_LIMITS = { key: 80, label: 80, tags: 24 } as const;

/** Category assigned to case studies saved before article taxonomy was introduced. */
export const PROJECTS_CATEGORY: PublicationTaxon = Object.freeze({
  key: 'projects',
  label: LocalizedText.of('taxonomy.category.label', { fr: 'Projets', en: 'Projects' }),
});

/**
 * Interface LocalizedArticleBody
 * @interface LocalizedArticleBody
 *
 * @description
 * Case study as one rich document per language (D40): French is required, English is optional until
 * publication.
 */
export interface LocalizedArticleBody {
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
 * Interface ArticleCover
 * @interface ArticleCover
 *
 * @description
 * Cover image shown at the top of the article and on the home cards (D40): an uploaded media and its
 * alternative text, which a draft may still lack in either language.
 */
export interface ArticleCover {
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
 * Interface ArticleProps
 * @interface ArticleProps
 *
 * @description
 * Complete persisted state used to rehydrate a project aggregate.
 */
export interface ArticleProps {
  /** Legacy rows without a collection kind belong to projects. */
  readonly kind?: PublicationKind;

  /** Article classification, absent on legacy projects. */
  readonly taxonomy?: PublicationTaxonomy | undefined;
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
  readonly status: ArticleStatus;

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
  readonly article: LocalizedArticleBody;

  /**
   * Property cover
   * @readonly
   *
   * @description
   * Cover image, or `null` when the project shows the tinted placeholder.
   */
  readonly cover: ArticleCover | null;

  /**
   * Property seo
   * @readonly
   *
   * @description
   * Optional search title and description per language; never part of publication completeness.
   */
  readonly seo: ArticleSeo;
  // #endregion
}

/**
 * Type ArticleRevision
 * @type ArticleRevision
 *
 * @description
 * Administration-editable project content; identity, position and publication state use separate
 * domain operations.
 */
export type ArticleRevision = Pick<
  ArticleProps,
  | 'title'
  | 'summary'
  | 'lead'
  | 'period'
  | 'client'
  | 'role'
  | 'place'
  | 'siteUrl'
  | 'featured'
  | 'article'
  | 'cover'
  | 'seo'
  | 'taxonomy'
> & {
  /** Legacy technologies. Omission preserves them unless the revision supplies the new taxonomy. */
  readonly techs?: readonly string[] | undefined;
};

/**
 * Constant TECH_KEY
 *
 * @description
 * Pattern accepted for normalized technology catalogue keys.
 */
const TECH_KEY: RegExp = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type StoredArticleProps = ArticleProps & { readonly taxonomy: PublicationTaxonomy };

/**
 * Class Article
 * @class Article
 *
 * @description
 * Article aggregate that validates persisted values and protects publication completeness rules.
 */
export class Article {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Creates the aggregate around persisted state; callers use `rehydrate` to validate invariants.
   *
   * @param {StoredArticleProps} props - Aggregate state replaced only after validated domain operations.
   */
  private constructor(private props: StoredArticleProps) {}
  // #endregion

  // #region Methods
  /**
   * Method create
   * @method create
   *
   * @description
   * Starts a new project as a draft at version 1. The revision is copied field by field, so that an
   * object carrying more (status, version…) sets nothing else.
   *
   * @param {Pick<ArticleProps, 'id' | 'slug' | 'position' | 'kind'>} identity - Collection, identifier, slug and position.
   * @param {ArticleRevision} revision - Editable content of the new project.
   * @returns {Article} New draft aggregate.
   */
  public static create(
    identity: Pick<ArticleProps, 'id' | 'slug' | 'position' | 'kind'>,
    revision: ArticleRevision,
  ): Article {
    return Article.rehydrate({
      id: identity.id,
      kind: identity.kind ?? 'project',
      taxonomy: revision.taxonomy,
      slug: identity.slug,
      position: identity.position,
      title: revision.title,
      summary: revision.summary,
      lead: revision.lead,
      period: revision.period,
      client: revision.client,
      role: revision.role,
      place: revision.place,
      siteUrl: revision.siteUrl,
      techs: revision.techs ?? [],
      featured: revision.featured,
      article: revision.article,
      cover: revision.cover,
      seo: revision.seo,
      status: 'draft',
      version: 1,
    });
  }

  /**
   * Method rehydrate
   * @method rehydrate
   *
   * @description
   * Rebuilds persisted state and rejects invalid positions, versions, HTTPS URL strings containing no whitespace, duplicate tech keys or a cover without media.
   * The returned aggregate copies the technology list to avoid retaining its mutable input array.
   *
   * @param {ArticleProps} props - Persisted project state.
   * @returns {Article} Rehydrated aggregate.
   */
  public static rehydrate(props: ArticleProps): Article {
    const kind: PublicationKind = props.kind ?? 'project';
    if (kind !== 'project' && kind !== 'article') {
      throw new InvalidValueError('kind', 'project or article expected');
    }
    const taxonomy: PublicationTaxonomy = validateTaxonomy(
      props.taxonomy ?? { category: kind === 'project' ? PROJECTS_CATEGORY : null, tags: [] },
    );
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
    const tagKeys: Set<string> = new Set([
      ...taxonomy.tags.map((tag) => tag.key),
      ...props.techs.map(technologyTagKey),
    ]);
    if (tagKeys.size > PUBLICATION_TAXONOMY_LIMITS.tags) {
      throw new InvalidValueError('taxonomy.tags', 'too many tags');
    }
    if (props.cover !== null && props.cover.media.trim() === '') {
      throw new InvalidValueError('cover', 'a media identifier is expected');
    }
    return new Article({ ...props, kind, taxonomy, techs: [...props.techs] });
  }

  /** Returns the collection owning this publication. */
  public get kind(): PublicationKind {
    return this.props.kind ?? 'project';
  }

  /** Exposes legacy technologies as tags, preserving explicit labels and order for matching keys. */
  public get taxonomy(): PublicationTaxonomy {
    const { category, tags } = this.props.taxonomy;
    const merged: Map<string, PublicationTaxon> = new Map(tags.map((tag) => [tag.key, tag]));
    for (const tech of this.props.techs) {
      const key: string = technologyTagKey(tech);
      if (merged.has(key)) continue;
      const label: string = tech.slice(0, PUBLICATION_TAXONOMY_LIMITS.label);
      merged.set(key, {
        key,
        label: LocalizedText.of('taxonomy.tags.label', { fr: label, en: label }),
      });
    }
    return { category, tags: [...merged.values()] };
  }

  /**
   * Method id
   * @method id
   *
   * @description
   * Returns the stable project identifier.
   *
   * @returns {string} Article identifier.
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
   * @returns {Slug} Article slug.
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
   * @returns {ArticleStatus} Draft or published status.
   */
  public get status(): ArticleStatus {
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
    const { category, tags }: PublicationTaxonomy = this.taxonomy;
    if (category === null) {
      missing.push('taxonomy.category');
    }
    for (const locale of locales) {
      if (category !== null && !category.label.isCompleteFor(locale)) {
        missing.push(`taxonomy.category.label.${locale}`);
      }
      tags.forEach((tag: PublicationTaxon, index: number): void => {
        if (!tag.label.isCompleteFor(locale)) {
          missing.push(`taxonomy.tags.${index}.label.${locale}`);
        }
      });
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
      const cover: ArticleCover | null = this.props.cover;
      if (cover !== null && (cover.alt[locale] ?? '').trim() === '') {
        missing.push(`cover.alt.${locale}`);
      }
    }
    return missing;
  }

  /**
   * Method coverMedia
   * @method coverMedia
   *
   * @description
   * Media shown as the cover, which must be an image (D57).
   *
   * @returns {string | null} Cover media identifier, or `null` without a cover.
   */
  public coverMedia(): string | null {
    return this.props.cover?.media ?? null;
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
        'The article is incomplete and cannot be published.',
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
   * @param {ArticleRevision} revision - New editable content.
   * @param {readonly Locale[]} publishedLocales - Locales that published projects must satisfy.
   * @throws {DomainError} When a published project's required text would become incomplete.
   * @returns {void} Completes after replacing the editable project fields.
   */
  public revise(revision: ArticleRevision, publishedLocales: readonly Locale[]): void {
    // Field by field: an object carrying more (id, status, version…) changes nothing else.
    const next: Article = Article.rehydrate({
      ...this.props,
      taxonomy: revision.taxonomy ?? this.props.taxonomy,
      title: revision.title,
      summary: revision.summary,
      lead: revision.lead,
      period: revision.period,
      client: revision.client,
      role: revision.role,
      place: revision.place,
      siteUrl: revision.siteUrl,
      techs: revision.techs ?? (revision.taxonomy === undefined ? this.props.techs : []),
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
          'A published article must stay complete; unpublish it before removing required fields.',
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
   * @returns {StoredArticleProps} Current stored state, with explicit tags separate from legacy technologies.
   */
  public snapshot(): StoredArticleProps {
    return this.props;
  }
  // #endregion
}

/** Maps historical keys with no length limit to stable keys fitting the taxonomy contract. */
function technologyTagKey(tech: string): string {
  if (tech.length <= PUBLICATION_TAXONOMY_LIMITS.key) return tech;
  let hash: bigint = 0xcbf29ce484222325n;
  for (const character of tech) {
    hash = BigInt.asUintN(64, (hash ^ BigInt(character.charCodeAt(0))) * 0x100000001b3n);
  }
  const suffix: string = hash.toString(16);
  const stem: string = tech
    .slice(0, PUBLICATION_TAXONOMY_LIMITS.key - suffix.length - 1)
    .replace(/-$/, '');
  return `${stem}-${suffix}`;
}

/** Validates and copies article taxonomy without retaining caller-owned arrays. */
function validateTaxonomy(taxonomy: PublicationTaxonomy): PublicationTaxonomy {
  if (taxonomy.tags.length > PUBLICATION_TAXONOMY_LIMITS.tags) {
    throw new InvalidValueError('taxonomy.tags', 'too many tags');
  }
  const entries: readonly PublicationTaxon[] =
    taxonomy.category === null ? taxonomy.tags : [taxonomy.category, ...taxonomy.tags];
  for (const taxon of entries) {
    if (!TECH_KEY.test(taxon.key) || taxon.key.length > PUBLICATION_TAXONOMY_LIMITS.key) {
      throw new InvalidValueError('taxonomy', 'a normalized category or tag key is required');
    }
    if (
      Object.values(taxon.label.toProps()).some(
        (label: string): boolean => label.length > PUBLICATION_TAXONOMY_LIMITS.label,
      )
    ) {
      throw new InvalidValueError(
        'taxonomy',
        'category and tag labels are limited to 80 characters',
      );
    }
  }
  if (
    new Set(taxonomy.tags.map((tag: PublicationTaxon): string => tag.key)).size !==
    taxonomy.tags.length
  ) {
    throw new InvalidValueError('taxonomy.tags', 'a tag appears twice');
  }
  return {
    category: taxonomy.category === null ? null : { ...taxonomy.category },
    tags: taxonomy.tags.map((tag: PublicationTaxon): PublicationTaxon => ({ ...tag })),
  };
}
