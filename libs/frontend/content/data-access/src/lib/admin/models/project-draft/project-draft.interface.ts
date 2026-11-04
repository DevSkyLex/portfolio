import type { ArticleDocumentDraft } from '@internal/content-web-data-access/lib/admin/models/article-document/article-document-draft.interface';
import type { BilingualText } from '@internal/content-web-data-access/lib/admin/models/bilingual-text/bilingual-text.interface';
import type { ProjectPeriod } from '@internal/content-web-data-access/lib/admin/models/project-period/project-period.interface';
import type { ProjectCoverDraft } from '@internal/content-web-data-access/lib/admin/models/project-cover/project-cover-draft.interface';
import type { ProjectSeoDraft } from '@internal/content-web-data-access/lib/admin/models/project-seo/project-seo-draft.interface';

/**
 * Interface ProjectDraft
 * @interface ProjectDraft
 *
 * @description
 * Editable administrator form values before conversion to the API revision contract.
 */
export interface ProjectDraft {
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
   * Start and end of the project (D46), `null` until chosen; the form requires one.
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
   * Article document of each language; an English document without text nor figure is omitted from
   * the revision.
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
   * @type {ProjectCoverDraft}
   */
  cover: ProjectCoverDraft;

  /**
   * Property seo
   *
   * @description
   * Search title and description of each language; empty texts are omitted from the revision.
   *
   * @type {ProjectSeoDraft}
   */
  seo: ProjectSeoDraft;
  // #endregion
}
