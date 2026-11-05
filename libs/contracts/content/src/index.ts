/**
 * Public snapshot exports
 *
 * @description
 * Exposes locale query validation and the localized published-content snapshot contract and DTO types.
 */
export {
  ContentLocaleSchema,
  ContentSnapshotQuerySchema,
  ContentSnapshotSchema,
  ProfileDtoSchema,
  ProjectDtoSchema,
  SkillGroupDtoSchema,
  TimelineEntryDtoSchema,
  type ContentLocale,
  type ContentSnapshot,
  type ContentSnapshotQuery,
  type ProfileDto,
  type ProjectDto,
  type SkillGroupDto,
  type TimelineEntryDto,
} from '@internal/content-contracts/lib/content-snapshot.contract';

/**
 * Public project administration exports
 *
 * @description
 * Exposes project revision, administrator DTO and list schemas with stable content error codes.
 */
export {
  AdminProjectDtoSchema,
  AdminProjectListSchema,
  CONTENT_ADMIN_ERROR_CODES,
  LocalizedTextDtoSchema,
  ProjectCoverDtoSchema,
  ProjectRevisionRequestSchema,
  type AdminProjectDto,
  type AdminProjectList,
  type LocalizedTextDto,
  type ProjectCoverDto,
  type ProjectRevisionRequest,
} from '@internal/content-contracts/lib/admin-project.contract';

/**
 * Article document exports
 *
 * @description
 * Exposes the article document schemas of the administrator API and of the public snapshot (D40), their
 * figure and image schemas, the code block languages and token kinds, limits and DTO types.
 */
export {
  ARTICLE_DOCUMENT_LIMITS,
  CODE_BLOCK_LANGUAGES,
  EditableArticleDocumentSchema,
  MediaFigureSchema,
  PublicArticleDocumentSchema,
  PublicFigureSchema,
  PublicImageSchema,
  type ArticleInlineDto,
  type ArticleListDto,
  type ArticleMarkDto,
  type ArticleParagraphDto,
  type CodeLanguageDto,
  type CodeTokenDto,
  type CodeTokenKindDto,
  type EditableArticleBlockDto,
  type EditableArticleDocumentDto,
  type MediaFigureDto,
  type PublicArticleBlockDto,
  type PublicArticleDocumentDto,
  type PublicCodeBlockDto,
  type PublicFigureDto,
  type PublicImageDto,
} from '@internal/content-contracts/lib/article-document.contract';

/**
 * Media exports
 *
 * @description
 * Exposes the uploaded media DTO, the upload limits and the media problem codes.
 */
export {
  MEDIA_ERROR_CODES,
  MEDIA_UPLOAD_LIMITS,
  MediaDtoSchema,
  type MediaDto,
} from '@internal/content-contracts/lib/media.contract';

/**
 * Project search exports
 *
 * @description
 * Exposes the editable search title, description and keywords of a project, their public form and
 * limits.
 */
export {
  PROJECT_SEO_LIMITS,
  ProjectSeoDtoSchema,
  PublicProjectSeoSchema,
  type ProjectSeoDto,
  type PublicProjectSeoDto,
} from '@internal/content-contracts/lib/project-seo.contract';

/**
 * Timeline administration exports
 *
 * @description
 * Exposes the education and experience entry request, administrator DTO, list and reorder schemas,
 * their limits and problem codes.
 */
export {
  AdminTimelineEntryDtoSchema,
  AdminTimelineListSchema,
  TIMELINE_ENTRY_LIMITS,
  TIMELINE_ERROR_CODES,
  TimelineEntryRequestSchema,
  TimelineKindSchema,
  TimelineOrderRequestSchema,
  YearMonthDtoSchema,
  type AdminTimelineEntryDto,
  type AdminTimelineList,
  type TimelineEntryRequest,
  type TimelineKindDto,
  type TimelineOrderRequest,
  type YearMonthDto,
} from '@internal/content-contracts/lib/admin-timeline.contract';

/**
 * Profile administration exports
 *
 * @description
 * Exposes the « Informations » revision request, administrator DTO, the public link and fact schemas,
 * their limits and problem codes.
 */
export {
  AdminProfileDtoSchema,
  PROFILE_ERROR_CODES,
  PROFILE_LIMITS,
  ProfileFactDtoSchema,
  ProfileLinkDtoSchema,
  ProfileLinkKindSchema,
  ProfileRevisionRequestSchema,
  type AdminProfileDto,
  type ProfileFactDto,
  type ProfileLinkDto,
  type ProfileLinkKindDto,
  type ProfileRevisionRequest,
} from '@internal/content-contracts/lib/admin-profile.contract';

/**
 * Legal document exports
 *
 * @description
 * Exposes the legal notice and privacy policy revision request, administrator DTO, their public form
 * in the snapshot and problem codes.
 */
export {
  AdminLegalDocumentDtoSchema,
  LEGAL_ERROR_CODES,
  LegalDocumentKindSchema,
  LegalDocumentRevisionRequestSchema,
  LegalDocumentsSchema,
  PublicLegalDocumentSchema,
  type AdminLegalDocumentDto,
  type LegalDocumentKindDto,
  type LegalDocumentRevisionRequest,
  type LegalDocumentsDto,
  type PublicLegalDocumentDto,
} from '@internal/content-contracts/lib/legal-document.contract';

/**
 * SEO dashboard exports
 *
 * @description
 * Exposes the administrator SEO dashboard query, response and refresh schemas (D47), their report
 * and audit parts, source failure and audit codes, and problem codes.
 */
export {
  AnalyticsDataSchema,
  ReportWindowSchema,
  SEO_AUDIT_CODES,
  SEO_DASHBOARD_DEFAULT_RANGE,
  SEO_DASHBOARD_ERROR_CODES,
  SEO_DASHBOARD_RANGES,
  SEO_SOURCE_ERROR_CODES,
  SearchConsoleDataSchema,
  SeoAuditIssueSchema,
  SeoAuditSchema,
  SeoDashboardDtoSchema,
  SeoDashboardQuerySchema,
  SeoRangeSchema,
  SeoRefreshAcceptedDtoSchema,
  SeoSourceErrorSchema,
  WebVitalsDataSchema,
  type AnalyticsDataDto,
  type ReportWindowDto,
  type SearchConsoleDataDto,
  type SeoAuditDto,
  type SeoAuditIssueDto,
  type SeoDashboardDto,
  type SeoDashboardQuery,
  type SeoRangeDto,
  type SeoRefreshAcceptedDto,
  type SeoSectionStatusDto,
  type SeoSourceErrorDto,
  type WebVitalsDataDto,
} from '@internal/content-contracts/lib/admin-seo-dashboard.contract';

export {
  PublicationStatusSchema,
  type PublicationStatusDto,
} from '@internal/content-contracts/lib/admin-publication.contract';
