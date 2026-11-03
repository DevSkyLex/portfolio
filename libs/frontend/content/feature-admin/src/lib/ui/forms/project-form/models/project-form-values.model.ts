import type { ArticleSection } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/article-section.model';
import type { BilingualText } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/bilingual-text.interface';

/**
 * Interface ProjectFormValues
 * @interface ProjectFormValues
 *
 * @description
 * Editable administrator form values before conversion to the API revision contract.
 */
export interface ProjectFormValues {
  // #region Properties
  /**
   * Property title
   *
   * @description
   * Localized project title values.
   *
   * @type {BilingualText}
   */
  title: BilingualText;

  /**
   * Property summary
   *
   * @description
   * Localized short descriptions shown on project cards.
   *
   * @type {BilingualText}
   */
  summary: BilingualText;

  /**
   * Property lead
   *
   * @description
   * Localized opening text for the project article.
   *
   * @type {BilingualText}
   */
  lead: BilingualText;

  /**
   * Property periodLabel
   *
   * @description
   * Localized project period text.
   *
   * @type {BilingualText}
   */
  periodLabel: BilingualText;

  /**
   * Property client
   *
   * @description
   * Localized client name.
   *
   * @type {BilingualText}
   */
  client: BilingualText;

  /**
   * Property role
   *
   * @description
   * Localized role description.
   *
   * @type {BilingualText}
   */
  role: BilingualText;

  /**
   * Property place
   *
   * @description
   * Localized project location.
   *
   * @type {BilingualText}
   */
  place: BilingualText;

  /**
   * Property siteUrl
   *
   * @description
   * External site URL or an empty string when the project has no link.
   *
   * @type {string}
   */
  siteUrl: string;

  /**
   * Property techs
   *
   * @description
   * Technology catalogue keys entered as a comma-separated list.
   *
   * @type {string}
   */
  techs: string;

  /**
   * Property featured
   *
   * @description
   * Whether the project is included in the featured group.
   *
   * @type {boolean}
   */
  featured: boolean;

  /**
   * Property article
   *
   * @description
   * Localized values for each article section, with paragraphs separated by blank lines.
   *
   * @type {Record<ArticleSection, BilingualText>}
   */
  article: Record<ArticleSection, BilingualText>;
  // #endregion
}
