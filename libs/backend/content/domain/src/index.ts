export { DomainError, InvalidValueError } from '@internal/content-domain/lib/errors/domain-error';
export {
  LOCALES,
  SOURCE_LOCALE,
  LocalizedText,
  type Locale,
  type LocalizedTextProps,
} from '@internal/content-domain/lib/values/localized-text/localized-text';
export {
  ArticleDocument,
  CODE_LANGUAGES,
  type ArticleBlock,
  type ArticleCodeBlock,
  type ArticleDeepList,
  type ArticleDocumentProps,
  type ArticleFigureAttrs,
  type ArticleInline,
  type ArticleList,
  type ArticleMark,
  type ArticleNestedList,
  type ArticleParagraph,
  type CodeLanguage,
} from '@internal/content-domain/lib/values/article-document/article-document';
export {
  PROJECT_SEO_DESCRIPTION_MAX_LENGTH,
  PROJECT_SEO_KEYWORDS_MAX_COUNT,
  PROJECT_SEO_KEYWORD_MAX_LENGTH,
  PROJECT_SEO_KEYWORD_MIN_LENGTH,
  PROJECT_SEO_TITLE_MAX_LENGTH,
  ProjectSeo,
  type LocalizedProjectSeo,
  type OptionalLocalizedKeywordsProps,
  type OptionalLocalizedTextProps,
  type ProjectSeoProps,
} from '@internal/content-domain/lib/values/project-seo/project-seo';
export { Slug } from '@internal/content-domain/lib/values/slug/slug';
export { Period, type YearMonth } from '@internal/content-domain/lib/values/period/period';
export {
  ProjectPeriod,
  type ProjectPeriodBound,
  type ProjectPeriodProps,
} from '@internal/content-domain/lib/values/project-period/project-period';
export {
  Project,
  type ProjectArticle,
  type ProjectCover,
  type ProjectProps,
  type ProjectRevision,
  type ProjectStatus,
} from '@internal/content-domain/lib/project/project';
export {
  assertSkillGroup,
  type Profile,
  type ProfileFact,
  type SkillGroup,
  type SkillTech,
} from '@internal/content-domain/lib/profile/profile';
export {
  TIMELINE_ENTRY_LIMITS,
  TIMELINE_KINDS,
  TimelineEntry,
  type TimelineEntryDraft,
  type TimelineEntryProps,
  type TimelineEntryRevision,
  type TimelineKind,
} from '@internal/content-domain/lib/timeline/timeline-entry';
export {
  PROFILE_LIMITS,
  profileLinks,
  reviseProfile,
  type ProfileDraft,
} from '@internal/content-domain/lib/profile/profile';
export {
  PROFILE_LINK_KINDS,
  PROFILE_LINK_LIMITS,
  ProfileLink,
  type ProfileLinkKind,
  type ProfileLinkProps,
} from '@internal/content-domain/lib/values/profile-link/profile-link';
export {
  LEGAL_DOCUMENT_KINDS,
  LegalDocument,
  type LegalBody,
  type LegalDocumentKind,
  type LegalDocumentProps,
} from '@internal/content-domain/lib/legal/legal-document';
export {
  SEO_RANGES,
  SEO_RANGE_DAYS,
  isSeoRange,
  reportWindow,
  spanDays,
  type DateSpan,
  type ReportWindow,
  type SeoRange,
} from '@internal/content-domain/lib/values/seo-range/seo-range';
export {
  SEO_DESCRIPTION_MIN_LENGTH,
  SEO_FALLBACK_DESCRIPTION_LENGTH,
  SEO_SITE_NAME,
  SEO_TITLE_MIN_LENGTH,
  auditProjectSeo,
  fallbackDescription,
  type ProjectSeoAudit,
  type SeoAuditCode,
  type SeoAuditIssue,
  type SeoAuditSeverity,
  type SeoKeywordsSource,
  type SeoPageAudit,
} from '@internal/content-domain/lib/seo-audit/seo-audit';
