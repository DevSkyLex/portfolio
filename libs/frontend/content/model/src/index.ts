/**
 * Export ContentModel
 *
 * @description
 * Public type surface for locale-specific profile, project, article, timeline, skill, and site content
 * view models.
 */
export type {
  ArticleBlock,
  ArticleCode,
  ArticleCodeToken,
  ArticleCodeTokenKind,
  ArticleFlowBlock,
  ArticleInline,
  ArticleList,
  ArticleParagraph,
  ArticleSection,
  FaqEntry,
  LegalBlock,
  LegalDocument,
  LegalDocumentKind,
  LegalSection,
  Profile,
  ProjectArticle,
  ProjectImage,
  ProjectVideo,
  ProjectSeo,
  ProjectSummary,
  SiteContent,
  SiteLink,
  SiteLinkKind,
  SiteLocale,
  SiteMaintenance,
  SkillColumn,
  TimelineKind,
  TimelineStep,
} from '@internal/content-web-model/lib/content.model';

export type { EditorialArticle, ArticleTerm } from './lib/content.model';
