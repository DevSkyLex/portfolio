import type { ArticleDocumentDraft, ProjectPeriod } from '@vfortin/content-web-data-access/admin';
import type { BilingualText } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/bilingual-text.interface';
import type { ProjectCoverFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/project-cover-form-values.interface';
import type { ProjectSeoFormValues } from '@internal/content-web-feature-admin/lib/ui/forms/project-form/models/project-seo-form-values.interface';

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
   * Property period
   *
   * @description
   * Start and end of the project, months or whole years (D46), `null` until chosen; required.
   *
   * @type {ProjectPeriod | null}
   */
  period: ProjectPeriod | null;

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
   * Technology catalogue keys, one tag each in the editor.
   *
   * @type {string[]}
   */
  techs: string[];

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
   * Article document of each language (D40); an unwritten English article is an empty document.
   *
   * @type {{ fr: ArticleDocumentDraft; en: ArticleDocumentDraft }}
   */
  article: { fr: ArticleDocumentDraft; en: ArticleDocumentDraft };

  /**
   * Property cover
   *
   * @description
   * Cover image and its alternative texts; an empty `media` means no cover.
   *
   * @type {ProjectCoverFormValues}
   */
  cover: ProjectCoverFormValues;

  /**
   * Property seo
   *
   * @description
   * Search title and description of each language; empty texts fall back on the title and summary.
   *
   * @type {ProjectSeoFormValues}
   */
  seo: ProjectSeoFormValues;
  // #endregion
}
