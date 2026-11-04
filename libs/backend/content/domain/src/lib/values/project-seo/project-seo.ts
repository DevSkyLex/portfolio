import { InvalidValueError } from '@internal/content-domain/lib/errors/domain-error';
import {
  LOCALES,
  type Locale,
} from '@internal/content-domain/lib/values/localized-text/localized-text';

/**
 * Constant PROJECT_SEO_TITLE_MAX_LENGTH
 *
 * @description
 * Longest search title kept for a project, mirrored by `PROJECT_SEO_LIMITS.title` in the content
 * contracts: search engines cut longer titles.
 */
export const PROJECT_SEO_TITLE_MAX_LENGTH: number = 70;

/**
 * Constant PROJECT_SEO_DESCRIPTION_MAX_LENGTH
 *
 * @description
 * Longest search description kept for a project, mirrored by `PROJECT_SEO_LIMITS.description` in the
 * content contracts.
 */
export const PROJECT_SEO_DESCRIPTION_MAX_LENGTH: number = 170;

/**
 * Constant PROJECT_SEO_KEYWORDS_MAX_COUNT
 *
 * @description
 * Most keywords kept per language, mirrored by `PROJECT_SEO_LIMITS.keywords` in the content contracts:
 * a short list the page writes to `<meta name="keywords">` and to the JSON-LD `keywords`.
 */
export const PROJECT_SEO_KEYWORDS_MAX_COUNT: number = 10;

/**
 * Constant PROJECT_SEO_KEYWORD_MIN_LENGTH
 *
 * @description
 * Shortest keyword after trimming, mirrored by `PROJECT_SEO_LIMITS.keywordMinLength`.
 */
export const PROJECT_SEO_KEYWORD_MIN_LENGTH: number = 2;

/**
 * Constant PROJECT_SEO_KEYWORD_MAX_LENGTH
 *
 * @description
 * Longest keyword after trimming, mirrored by `PROJECT_SEO_LIMITS.keywordMaxLength`.
 */
export const PROJECT_SEO_KEYWORD_MAX_LENGTH: number = 40;

/**
 * Interface OptionalLocalizedTextProps
 * @interface OptionalLocalizedTextProps
 *
 * @description
 * Text per language where every language may be absent, unlike `LocalizedTextProps`.
 */
export interface OptionalLocalizedTextProps {
  // #region Properties
  /**
   * Property fr
   * @readonly
   *
   * @description
   * French text, absent when the administrator left it empty.
   */
  readonly fr?: string | undefined;

  /**
   * Property en
   * @readonly
   *
   * @description
   * English text, absent when the administrator left it empty.
   */
  readonly en?: string | undefined;
  // #endregion
}

/**
 * Interface OptionalLocalizedKeywordsProps
 * @interface OptionalLocalizedKeywordsProps
 *
 * @description
 * Keyword list per language where every language may be absent; an absent list lets the public page
 * use the project's technologies instead.
 */
export interface OptionalLocalizedKeywordsProps {
  // #region Properties
  /**
   * Property fr
   * @readonly
   *
   * @description
   * French keywords, absent when the administrator wrote none.
   */
  readonly fr?: readonly string[] | undefined;

  /**
   * Property en
   * @readonly
   *
   * @description
   * English keywords, absent when the administrator wrote none.
   */
  readonly en?: readonly string[] | undefined;
  // #endregion
}

/**
 * Interface ProjectSeoProps
 * @interface ProjectSeoProps
 *
 * @description
 * Search title, description and keywords of a project per language; an absent value lets the public
 * page use the project title, summary or technologies instead.
 */
export interface ProjectSeoProps {
  // #region Properties
  /**
   * Property title
   * @readonly
   *
   * @description
   * Search title per language, at most `PROJECT_SEO_TITLE_MAX_LENGTH` characters.
   */
  readonly title: OptionalLocalizedTextProps;

  /**
   * Property description
   * @readonly
   *
   * @description
   * Search description per language, at most `PROJECT_SEO_DESCRIPTION_MAX_LENGTH` characters.
   */
  readonly description: OptionalLocalizedTextProps;

  /**
   * Property keywords
   * @readonly
   *
   * @description
   * Keywords per language: at most `PROJECT_SEO_KEYWORDS_MAX_COUNT`, each of
   * `PROJECT_SEO_KEYWORD_MIN_LENGTH` to `PROJECT_SEO_KEYWORD_MAX_LENGTH` characters, unique regardless
   * of case.
   */
  readonly keywords: OptionalLocalizedKeywordsProps;
  // #endregion
}

/**
 * Interface LocalizedProjectSeo
 * @interface LocalizedProjectSeo
 *
 * @description
 * Search texts and keywords of one language, `null` or empty where the administrator wrote none.
 */
export interface LocalizedProjectSeo {
  // #region Properties
  /**
   * Property title
   * @readonly
   *
   * @description
   * Custom search title, or `null`.
   */
  readonly title: string | null;

  /**
   * Property description
   * @readonly
   *
   * @description
   * Custom search description, or `null`.
   */
  readonly description: string | null;

  /**
   * Property keywords
   * @readonly
   *
   * @description
   * Custom keywords in their written order, empty when none was written.
   */
  readonly keywords: readonly string[];
  // #endregion
}

/**
 * Function normalize
 *
 * @description
 * Trims each language of one search text, drops empty ones and rejects a text above `max`
 * characters, reported as `seo.<field>.<locale>` like the contract field.
 *
 * @param {'title' | 'description'} field - Search text being normalized.
 * @param {OptionalLocalizedTextProps} value - Raw texts.
 * @param {number} max - Longest accepted length after trimming.
 * @returns {OptionalLocalizedTextProps} Trimmed texts without empty languages.
 */
function normalize(
  field: 'title' | 'description',
  value: OptionalLocalizedTextProps,
  max: number,
): OptionalLocalizedTextProps {
  const result: { fr?: string; en?: string } = {};
  for (const locale of LOCALES) {
    const text: string = value[locale]?.trim() ?? '';
    if (text.length > max) {
      throw new InvalidValueError(`seo.${field}.${locale}`, `at most ${max} characters expected`);
    }
    if (text !== '') {
      result[locale] = text;
    }
  }
  return result;
}

/**
 * Function normalizeKeywords
 *
 * @description
 * Trims the keywords of each language and drops empty lists; rejects, as `seo.keywords.<locale>` like
 * the contract field, a list above `PROJECT_SEO_KEYWORDS_MAX_COUNT`, a keyword outside the length
 * bounds (a blank one included) and two keywords equal regardless of case.
 *
 * @param {OptionalLocalizedKeywordsProps} value - Raw keyword lists.
 * @returns {OptionalLocalizedKeywordsProps} Trimmed lists without empty languages.
 */
function normalizeKeywords(value: OptionalLocalizedKeywordsProps): OptionalLocalizedKeywordsProps {
  const result: { fr?: readonly string[]; en?: readonly string[] } = {};
  for (const locale of LOCALES) {
    const field: string = `seo.keywords.${locale}`;
    const keywords: string[] = (value[locale] ?? []).map((keyword: string): string =>
      keyword.trim(),
    );
    if (keywords.length > PROJECT_SEO_KEYWORDS_MAX_COUNT) {
      throw new InvalidValueError(
        field,
        `at most ${PROJECT_SEO_KEYWORDS_MAX_COUNT} keywords expected`,
      );
    }
    if (
      keywords.some(
        (keyword: string): boolean =>
          keyword.length < PROJECT_SEO_KEYWORD_MIN_LENGTH ||
          keyword.length > PROJECT_SEO_KEYWORD_MAX_LENGTH,
      )
    ) {
      throw new InvalidValueError(
        field,
        `keywords of ${PROJECT_SEO_KEYWORD_MIN_LENGTH} to ${PROJECT_SEO_KEYWORD_MAX_LENGTH} characters expected`,
      );
    }
    const folded: Set<string> = new Set<string>(
      keywords.map((keyword: string): string => keyword.toLocaleLowerCase()),
    );
    if (folded.size !== keywords.length) {
      throw new InvalidValueError(field, 'a keyword appears twice');
    }
    if (keywords.length > 0) {
      result[locale] = keywords;
    }
  }
  return result;
}

/**
 * Class ProjectSeo
 * @class ProjectSeo
 *
 * @description
 * Optional search texts and keywords of a project. They never take part in publication completeness,
 * and a missing English value does not fall back on French: the English page uses its own title,
 * summary and technologies.
 */
export class ProjectSeo {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores values normalized by the `of` factory.
   *
   * @param {ProjectSeoProps} props - Trimmed texts and keywords without empty languages.
   */
  private constructor(private readonly props: ProjectSeoProps) {}
  // #endregion

  // #region Methods
  /**
   * Method of
   * @method of
   *
   * @description
   * Trims every text and keyword, treats a blank text or an empty list as absent and throws
   * `InvalidValueError` for a title above `PROJECT_SEO_TITLE_MAX_LENGTH` or a description above
   * `PROJECT_SEO_DESCRIPTION_MAX_LENGTH` characters, or for keywords breaking their bounds.
   *
   * @param {ProjectSeoProps} props - Raw search texts and keywords.
   * @returns {ProjectSeo} Normalized value.
   */
  public static of(props: ProjectSeoProps): ProjectSeo {
    return new ProjectSeo({
      title: normalize('title', props.title, PROJECT_SEO_TITLE_MAX_LENGTH),
      description: normalize('description', props.description, PROJECT_SEO_DESCRIPTION_MAX_LENGTH),
      keywords: normalizeKeywords(props.keywords),
    });
  }

  /**
   * Method empty
   * @method empty
   *
   * @description
   * Returns the value of a project without any custom search text or keyword.
   *
   * @returns {ProjectSeo} Empty search values.
   */
  public static empty(): ProjectSeo {
    return new ProjectSeo({ title: {}, description: {}, keywords: {} });
  }

  /**
   * Method in
   * @method in
   *
   * @description
   * Returns the custom values of one language, `null` texts and an empty list where none was written,
   * without falling back on another language.
   *
   * @param {Locale} locale - Snapshot locale.
   * @returns {LocalizedProjectSeo} Search values of that language.
   */
  public in(locale: Locale): LocalizedProjectSeo {
    return {
      title: this.props.title[locale] ?? null,
      description: this.props.description[locale] ?? null,
      keywords: [...(this.props.keywords[locale] ?? [])],
    };
  }

  /**
   * Method toProps
   * @method toProps
   *
   * @description
   * Returns copies of the stored texts and keywords, absent languages left out.
   *
   * @returns {ProjectSeoProps} Serializable search values.
   */
  public toProps(): ProjectSeoProps {
    const keywords: { fr?: readonly string[]; en?: readonly string[] } = {};
    for (const locale of LOCALES) {
      const list: readonly string[] | undefined = this.props.keywords[locale];
      if (list !== undefined) keywords[locale] = [...list];
    }
    return { title: { ...this.props.title }, description: { ...this.props.description }, keywords };
  }
  // #endregion
}
