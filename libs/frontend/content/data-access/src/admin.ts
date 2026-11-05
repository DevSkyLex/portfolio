/**
 * Export AdminContentDataAccess
 *
 * @description
 * Administrator project editor models, request conversion, API and state entry point; kept out of the
 * public site bundle (D18). Every model is a type-only export: no Zod value reaches the browser (D10).
 */
export type { AdminMedia } from '@internal/content-web-data-access/lib/admin/models/admin-media/admin-media.interface';
export type { AdminProject } from '@internal/content-web-data-access/lib/admin/models/admin-project/admin-project.type';
export type { ArticleDocumentDraft } from '@internal/content-web-data-access/lib/admin/models/article-document/article-document-draft.interface';
export type { ArticleFigureAttrs } from '@internal/content-web-data-access/lib/admin/models/article-document/article-figure-attrs.interface';
export type { ArticleFigureNode } from '@internal/content-web-data-access/lib/admin/models/article-document/article-figure-node.interface';
export type { BilingualText } from '@internal/content-web-data-access/lib/admin/models/bilingual-text/bilingual-text.interface';
export type { ProjectDraft } from '@internal/content-web-data-access/lib/admin/models/project-draft/project-draft.interface';
export type { ProjectPeriod } from '@internal/content-web-data-access/lib/admin/models/project-period/project-period.interface';
export type { ProjectSeo } from '@internal/content-web-data-access/lib/admin/models/project-seo/project-seo.interface';
export type { ProjectSeoDraft } from '@internal/content-web-data-access/lib/admin/models/project-seo/project-seo-draft.interface';
export {
  toProjectDraft,
  toRevisionRequest,
} from '@internal/content-web-data-access/lib/admin/utils/project-draft/project-draft.utils';

/**
 * Export article document helpers
 *
 * @description
 * Empty document, the domain's emptiness and figure-alt rules mirrored for the form (D40).
 */
export {
  emptyArticleDocument,
  figuresMissingAlt,
  isArticleEmpty,
} from '@internal/content-web-data-access/lib/admin/utils/article-document/article-document.utils';

/**
 * Export code block language names
 *
 * @description
 * Display name of each code block language of the contract, as the public article shows it; the
 * editor's language picker lists them.
 */
export { CODE_LANGUAGE_LABELS } from '@internal/content-web-data-access/lib/constants/code-language-labels.constants';

/**
 * Export page metadata functions
 *
 * @description
 * The pure functions `PageSeoService` writes a case study's head with (D42), so that the editor lists
 * and previews exactly the tags the public page will emit, and the origin they are built from.
 */
export type { PageSeo } from '@internal/content-web-data-access/lib/models/page-seo/page-seo.interface';
export type { PageSeoMetaTag } from '@internal/content-web-data-access/lib/models/page-seo/page-seo-meta-tag.interface';
export type { ProjectPageSeoSource } from '@internal/content-web-data-access/lib/models/page-seo/project-page-seo-source.type';
export { SITE_ORIGIN } from '@internal/content-web-data-access/lib/tokens/site-origin/site-origin.token';
export { jsonLdText } from '@internal/content-web-data-access/lib/utils/json-ld/json-ld.utils';
export { pageSeoMetaTags } from '@internal/content-web-data-access/lib/utils/page-seo-meta/page-seo-meta.utils';
export { projectPageSeo } from '@internal/content-web-data-access/lib/utils/project-page-seo/project-page-seo.utils';

/**
 * Export ADMIN_MEDIA_LIMITS
 *
 * @description
 * Browser copy of the media upload limits, checked before sending a file.
 */
export { ADMIN_MEDIA_LIMITS } from '@internal/content-web-data-access/lib/admin/constants/admin-media.constants';

/**
 * Export AdminProjectsApiService
 *
 * @description
 * Administrator HTTP adapter for listing, loading, revising, publishing, and unpublishing projects.
 */
export { AdminProjectsApiService } from '@internal/content-web-data-access/lib/admin/services/admin-projects/admin-projects.service';

/**
 * Export AdminMediaApiService
 *
 * @description
 * Administrator HTTP adapter uploading article and cover images.
 */
export { AdminMediaApiService } from '@internal/content-web-data-access/lib/admin/services/admin-media/admin-media.service';

/**
 * Export AdminProjectsStore
 *
 * @description
 * Administrator project state and its inferred instance type.
 */
export {
  AdminProjectsStore,
  type AdminProjectsStoreType,
} from '@internal/content-web-data-access/lib/admin/state/admin-projects/admin-projects.store';

/**
 * Export timeline administration
 *
 * @description
 * « Expériences » and « Formations » view models, form draft conversion, API service and
 * `AdminTimelineStore`; models are type-only exports (D10).
 */
export type { AdminTimelineEntry } from '@internal/content-web-data-access/lib/admin/models/admin-timeline-entry/admin-timeline-entry.interface';
export type { AdminTimelineList } from '@internal/content-web-data-access/lib/admin/models/admin-timeline-list/admin-timeline-list.interface';
export type { TimelineEntryDraft } from '@internal/content-web-data-access/lib/admin/models/timeline-entry-draft/timeline-entry-draft.interface';
export type { TimelineKind } from '@internal/content-web-data-access/lib/admin/models/timeline-kind/timeline-kind.type';
export type { YearMonth } from '@internal/content-web-data-access/lib/admin/models/year-month/year-month.interface';
export {
  emptyTimelineEntryDraft,
  toTimelineEntryDraft,
  toTimelineEntryRequest,
} from '@internal/content-web-data-access/lib/admin/utils/timeline-entry-draft/timeline-entry-draft.utils';
export { AdminTimelineApiService } from '@internal/content-web-data-access/lib/admin/services/admin-timeline/admin-timeline.service';
export {
  AdminTimelineStore,
  type AdminTimelineStoreType,
} from '@internal/content-web-data-access/lib/admin/state/admin-timeline/admin-timeline.store';

/**
 * Export site texts administration
 *
 * @description
 * « Informations » (profile texts, facts and public links) and « Légal » (legal notice and privacy
 * policy) view models, form draft conversion, API service and stores; models are type-only exports
 * (D10).
 */
export type { AdminLegalDocument } from '@internal/content-web-data-access/lib/admin/models/admin-legal-document/admin-legal-document.interface';
export type { AdminProfile } from '@internal/content-web-data-access/lib/admin/models/admin-profile/admin-profile.interface';
export type { LegalDocumentKind } from '@internal/content-web-data-access/lib/admin/models/legal-document-kind/legal-document-kind.type';
export type { ProfileDraft } from '@internal/content-web-data-access/lib/admin/models/profile-draft/profile-draft.interface';
export type { ProfileLinkKind } from '@internal/content-web-data-access/lib/admin/models/profile-link-kind/profile-link-kind.type';
export {
  toLegalDocumentRevisionRequest,
  toProfileDraft,
  toProfileRevisionRequest,
} from '@internal/content-web-data-access/lib/admin/utils/site-texts-draft/site-texts-draft.utils';
export { AdminSiteTextsApiService } from '@internal/content-web-data-access/lib/admin/services/admin-site-texts/admin-site-texts.service';
export {
  AdminLegalStore,
  type AdminLegalStoreType,
} from '@internal/content-web-data-access/lib/admin/state/admin-legal/admin-legal.store';
export {
  AdminProfileStore,
  type AdminProfileStoreType,
} from '@internal/content-web-data-access/lib/admin/state/admin-profile/admin-profile.store';

/**
 * Export SEO dashboard administration
 *
 * @description
 * « Tableau de bord » (D47): the dashboard models (type-only aliases of the contract, D10), the
 * browser copy of its windows, the API service and `AdminSeoDashboardStore`, which polls a running
 * refresh.
 */
export type {
  AnalyticsData,
  AnalyticsSection,
  SearchConsoleData,
  SearchConsoleSection,
  SeoAudit,
  SeoAuditIssue,
  SeoDashboard,
  SeoRange,
  SeoSourceError,
  WebVitalsData,
  WebVitalsSection,
} from '@internal/content-web-data-access/lib/admin/models/seo-dashboard/seo-dashboard.type';
export type { SeoRefreshOutcome } from '@internal/content-web-data-access/lib/admin/models/seo-refresh-outcome/seo-refresh-outcome.type';
export {
  SEO_DEFAULT_RANGE,
  SEO_RANGES,
} from '@internal/content-web-data-access/lib/admin/constants/seo-dashboard.constants';
export { AdminSeoDashboardApiService } from '@internal/content-web-data-access/lib/admin/services/admin-seo-dashboard/admin-seo-dashboard.service';
export {
  AdminSeoDashboardStore,
  type AdminSeoDashboardStoreType,
} from '@internal/content-web-data-access/lib/admin/state/admin-seo-dashboard/admin-seo-dashboard.store';

/** Explicit grouped publication status and commands. */
export type { PublicationStatusDto as AdminPublicationStatus } from '@vfortin/content-contracts';
export { AdminPublicationApiService } from '@internal/content-web-data-access/lib/admin/services/admin-publication/admin-publication.service';
export {
  AdminPublicationStore,
  type AdminPublicationStoreType,
} from '@internal/content-web-data-access/lib/admin/state/admin-publication/admin-publication.store';
