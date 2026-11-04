import { z } from 'zod/mini';

/**
 * Constant SEO_DASHBOARD_RANGES
 *
 * @description
 * Report lengths of the SEO dashboard (D47), mirrored by the domain's `SEO_RANGES`.
 */
export const SEO_DASHBOARD_RANGES = ['7d', '28d', '90d'] as const;

/**
 * Constant SEO_DASHBOARD_DEFAULT_RANGE
 *
 * @description
 * Range served when the query names none.
 */
export const SEO_DASHBOARD_DEFAULT_RANGE = '28d' as const;

/**
 * Constant SeoRangeSchema
 *
 * @description
 * One report length.
 */
export const SeoRangeSchema = z.enum(SEO_DASHBOARD_RANGES);

/**
 * Type SeoRangeDto
 * @type SeoRangeDto
 *
 * @description
 * `7d`, `28d` or `90d`.
 */
export type SeoRangeDto = z.infer<typeof SeoRangeSchema>;

/**
 * Constant SeoDashboardQuerySchema
 *
 * @description
 * Query of `GET /api/content/admin/seo/dashboard`: `range`, `28d` when absent.
 */
export const SeoDashboardQuerySchema = z.object({ range: z.optional(SeoRangeSchema) });

/**
 * Type SeoDashboardQuery
 * @type SeoDashboardQuery
 *
 * @description
 * Validated dashboard query.
 */
export type SeoDashboardQuery = z.infer<typeof SeoDashboardQuerySchema>;

/**
 * Constant IsoDateTime
 *
 * @description
 * Instant as an ISO 8601 date-time with offset.
 */
const IsoDateTime: z.iso.ZodMiniISODateTime = z.iso.datetime({ offset: true });

/**
 * Constant IsoDay
 *
 * @description
 * Calendar day as `YYYY-MM-DD`.
 */
const IsoDay = z.string().check(z.regex(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/));

/**
 * Constant Count
 *
 * @description
 * Whole number of clicks, impressions, users, sessions or views.
 */
const Count = z.int().check(z.nonnegative());

/**
 * Constant Ratio
 *
 * @description
 * Rate between 0 and 1 (click-through or engagement rate).
 */
const Ratio = z.number().check(z.minimum(0), z.maximum(1));

/**
 * Constant Measure
 *
 * @description
 * Non-negative measure (position, seconds, milliseconds, layout shift).
 */
const Measure = z.number().check(z.nonnegative());

/**
 * Constant DateSpanSchema
 *
 * @description
 * Inclusive span of days.
 */
const DateSpanSchema = z.object({ start: IsoDay, end: IsoDay });

/**
 * Constant ReportWindowSchema
 *
 * @description
 * Days a report covers and the period of the same length before it, which the `previous` figures
 * describe. Search Console ends three days back, GA4 the day before (data processing delays).
 */
export const ReportWindowSchema = z.object({
  range: SeoRangeSchema,
  current: DateSpanSchema,
  previous: DateSpanSchema,
});

/**
 * Type ReportWindowDto
 * @type ReportWindowDto
 *
 * @description
 * Window of a report.
 */
export type ReportWindowDto = z.infer<typeof ReportWindowSchema>;

/**
 * Constant SEO_SOURCE_ERROR_CODES
 *
 * @description
 * Reasons a Google source can fail, mirrored by the application's `SeoSourceErrorCode`:
 * `credentials-missing` (empty or absent service account file), `credentials-invalid` (not a service
 * account key), `credentials-rejected` (Google refused the key), `permission-denied` (the service
 * account has no access to the property, or the API is not enabled), `not-found` (unknown property),
 * `bad-request`, `quota-exceeded`, `timeout`, `network`, `upstream` (Google 5xx),
 * `invalid-response` and `unexpected`.
 */
export const SEO_SOURCE_ERROR_CODES = [
  'credentials-missing',
  'credentials-invalid',
  'credentials-rejected',
  'permission-denied',
  'not-found',
  'bad-request',
  'quota-exceeded',
  'timeout',
  'network',
  'upstream',
  'invalid-response',
  'unexpected',
] as const;

/**
 * Constant SeoSourceErrorSchema
 *
 * @description
 * Failure of a source: its reason and an English message that never carries a token or a key.
 */
export const SeoSourceErrorSchema = z.object({
  code: z.enum(SEO_SOURCE_ERROR_CODES),
  message: z.string().check(z.maxLength(300)),
});

/**
 * Type SeoSourceErrorDto
 * @type SeoSourceErrorDto
 *
 * @description
 * Source failure.
 */
export type SeoSourceErrorDto = z.infer<typeof SeoSourceErrorSchema>;

/**
 * Constant SearchMetricsSchema
 *
 * @description
 * Search Console figures: clicks, impressions, click-through rate (0 to 1) and average position
 * (1 is the top result, 0 without impression).
 */
const SearchMetricsSchema = z.object({
  clicks: Count,
  impressions: Count,
  ctr: Ratio,
  position: Measure,
});

/**
 * Constant SearchRowSchema
 *
 * @description
 * Figures of one query, page (absolute URL) or device (`DESKTOP`, `MOBILE`, `TABLET`).
 */
const SearchRowSchema = z.extend(SearchMetricsSchema, { key: z.string() });

/**
 * Constant SearchConsoleDataSchema
 *
 * @description
 * Search Console report of a window: totals and the previous period's, one entry per day (zeros for a
 * day without data), the top 20 queries and pages by clicks, and the figures per device.
 */
export const SearchConsoleDataSchema = z.object({
  window: ReportWindowSchema,
  totals: SearchMetricsSchema,
  previous: SearchMetricsSchema,
  daily: z.array(z.extend(SearchMetricsSchema, { date: IsoDay })),
  queries: z.array(SearchRowSchema),
  pages: z.array(SearchRowSchema),
  devices: z.array(SearchRowSchema),
});

/**
 * Type SearchConsoleDataDto
 * @type SearchConsoleDataDto
 *
 * @description
 * Search Console report.
 */
export type SearchConsoleDataDto = z.infer<typeof SearchConsoleDataSchema>;

/**
 * Constant AudienceTotalsSchema
 *
 * @description
 * GA4 figures of a period; `averageEngagementSeconds` is engagement time per active user.
 */
const AudienceTotalsSchema = z.object({
  activeUsers: Count,
  sessions: Count,
  views: Count,
  engagementRate: Ratio,
  averageEngagementSeconds: Measure,
});

/**
 * Constant AudienceShareSchema
 *
 * @description
 * Sessions and active users of one default channel group or country (named as GA4 reports it).
 */
const AudienceShareSchema = z.object({ key: z.string(), sessions: Count, activeUsers: Count });

/**
 * Constant AnalyticsDataSchema
 *
 * @description
 * GA4 report of a window: totals and the previous period's, one entry per day, the top 20 pages by
 * views, sessions by default channel group and the top 10 countries by sessions.
 */
export const AnalyticsDataSchema = z.object({
  window: ReportWindowSchema,
  totals: AudienceTotalsSchema,
  previous: AudienceTotalsSchema,
  daily: z.array(z.object({ date: IsoDay, activeUsers: Count, sessions: Count, views: Count })),
  pages: z.array(z.object({ path: z.string(), views: Count, activeUsers: Count })),
  channels: z.array(AudienceShareSchema),
  countries: z.array(AudienceShareSchema),
});

/**
 * Type AnalyticsDataDto
 * @type AnalyticsDataDto
 *
 * @description
 * GA4 report.
 */
export type AnalyticsDataDto = z.infer<typeof AnalyticsDataSchema>;

/**
 * Constant VitalCategorySchema
 *
 * @description
 * Core Web Vitals assessment of a 75th percentile.
 */
const VitalCategorySchema = z.enum(['good', 'needs-improvement', 'poor']);

/**
 * Constant FieldVitalSchema
 *
 * @description
 * One field metric: its 75th percentile (milliseconds for LCP and INP, unitless for CLS) and its
 * assessment; `null` where CrUX has too few samples.
 */
const FieldVitalSchema = z.nullable(z.object({ p75: Measure, category: VitalCategorySchema }));

/**
 * Constant WebVitalsMeasureSchema
 *
 * @description
 * Measures of one URL and strategy: CrUX field data of the last 28 days (`scope` `origin` when CrUX
 * fell back to the whole site; `null` without data) and the Lighthouse run (score 0 to 100).
 */
const WebVitalsMeasureSchema = z.object({
  field: z.nullable(
    z.object({
      scope: z.enum(['url', 'origin']),
      lcp: FieldVitalSchema,
      inp: FieldVitalSchema,
      cls: FieldVitalSchema,
    }),
  ),
  lab: z.object({
    performanceScore: z.nullable(z.number().check(z.minimum(0), z.maximum(100))),
    lcpMs: z.nullable(Measure),
    cls: z.nullable(Measure),
    tbtMs: z.nullable(Measure),
  }),
});

/**
 * Constant WebVitalsDataSchema
 *
 * @description
 * PageSpeed Insights runs of every key URL, mobile then desktop; a failed run has `measure: null` and
 * its `error`.
 */
export const WebVitalsDataSchema = z.object({
  rows: z.array(
    z.object({
      url: z.url(),
      strategy: z.enum(['mobile', 'desktop']),
      measure: z.nullable(WebVitalsMeasureSchema),
      error: z.nullable(SeoSourceErrorSchema),
    }),
  ),
});

/**
 * Type WebVitalsDataDto
 * @type WebVitalsDataDto
 *
 * @description
 * Web Vitals report.
 */
export type WebVitalsDataDto = z.infer<typeof WebVitalsDataSchema>;

/**
 * Constant NotConfiguredSectionSchema
 *
 * @description
 * Section whose source lacks settings: `missing` names the environment variables to set (see
 * `docs/operations/deployment.md`).
 */
const NotConfiguredSectionSchema = z.object({
  status: z.literal('not-configured'),
  fetchedAt: z.null(),
  missing: z.array(z.string()),
});

/**
 * Constant PendingSectionSchema
 *
 * @description
 * Configured section never refreshed yet.
 */
const PendingSectionSchema = z.object({ status: z.literal('pending'), fetchedAt: z.null() });

/**
 * Constant SearchConsoleSectionSchema
 *
 * @description
 * Search Console section: `ok` with the cached report, or `error` with the failure of the last
 * attempt (`attemptedAt`) and the report fetched before it (`data`, `fetchedAt`), if any.
 */
const SearchConsoleSectionSchema = z.discriminatedUnion('status', [
  NotConfiguredSectionSchema,
  PendingSectionSchema,
  z.object({ status: z.literal('ok'), fetchedAt: IsoDateTime, data: SearchConsoleDataSchema }),
  z.object({
    status: z.literal('error'),
    fetchedAt: z.nullable(IsoDateTime),
    attemptedAt: IsoDateTime,
    error: SeoSourceErrorSchema,
    data: z.nullable(SearchConsoleDataSchema),
  }),
]);

/**
 * Constant AnalyticsSectionSchema
 *
 * @description
 * GA4 section, with the same states as the Search Console one.
 */
const AnalyticsSectionSchema = z.discriminatedUnion('status', [
  NotConfiguredSectionSchema,
  PendingSectionSchema,
  z.object({ status: z.literal('ok'), fetchedAt: IsoDateTime, data: AnalyticsDataSchema }),
  z.object({
    status: z.literal('error'),
    fetchedAt: z.nullable(IsoDateTime),
    attemptedAt: IsoDateTime,
    error: SeoSourceErrorSchema,
    data: z.nullable(AnalyticsDataSchema),
  }),
]);

/**
 * Constant WebVitalsSectionSchema
 *
 * @description
 * Core Web Vitals section, with the same states; independent of the range.
 */
const WebVitalsSectionSchema = z.discriminatedUnion('status', [
  NotConfiguredSectionSchema,
  PendingSectionSchema,
  z.object({ status: z.literal('ok'), fetchedAt: IsoDateTime, data: WebVitalsDataSchema }),
  z.object({
    status: z.literal('error'),
    fetchedAt: z.nullable(IsoDateTime),
    attemptedAt: IsoDateTime,
    error: SeoSourceErrorSchema,
    data: z.nullable(WebVitalsDataSchema),
  }),
]);

/**
 * Constant SEO_AUDIT_CODES
 *
 * @description
 * Findings of the internal audit, mirrored by the domain's `SeoAuditCode`. Search texts are measured
 * as the page emits them (custom text, or the fallback title `<title> — Valentin Fortin` and the
 * summary cut near 160 characters, D42) against 30 to 70 characters for the title and 70 to 170 for
 * the description.
 */
export const SEO_AUDIT_CODES = [
  'search-title-missing',
  'search-title-too-short',
  'search-title-too-long',
  'search-description-missing',
  'search-description-too-short',
  'search-description-too-long',
  'keywords-missing',
  'cover-missing',
  'cover-alt-missing',
  'image-alt-missing',
  'translation-missing',
] as const;

/**
 * Constant SeoAuditIssueSchema
 *
 * @description
 * One finding: `locale` `null` for the cover (shared by both pages); `length` and `limit` for the
 * length findings, `count` for `image-alt-missing`, `fields` for `translation-missing`.
 */
export const SeoAuditIssueSchema = z.object({
  code: z.enum(SEO_AUDIT_CODES),
  severity: z.enum(['error', 'warning', 'info']),
  locale: z.nullable(z.enum(['fr', 'en'])),
  length: z.optional(Count),
  limit: z.optional(Count),
  count: z.optional(Count),
  fields: z.optional(z.array(z.string())),
});

/**
 * Type SeoAuditIssueDto
 * @type SeoAuditIssueDto
 *
 * @description
 * Audit finding.
 */
export type SeoAuditIssueDto = z.infer<typeof SeoAuditIssueSchema>;

/**
 * Constant SeoAuditPageSchema
 *
 * @description
 * Search texts one page emits and where its keywords come from (D42).
 */
const SeoAuditPageSchema = z.object({
  path: z.string(),
  title: z.string(),
  description: z.string(),
  keywords: z.array(z.string()),
  keywordsSource: z.enum(['custom', 'techs', 'none']),
});

/**
 * Constant SeoAuditSchema
 *
 * @description
 * Internal audit of the published projects (computed on every read, no Google call): each project's
 * pages and findings in display order, the sitemap the next build writes, and totals.
 */
export const SeoAuditSchema = z.object({
  generatedAt: IsoDateTime,
  projects: z.array(
    z.object({
      id: z.string(),
      slug: z.string(),
      title: z.string(),
      pages: z.object({ fr: SeoAuditPageSchema, en: SeoAuditPageSchema }),
      issues: z.array(SeoAuditIssueSchema),
    }),
  ),
  sitemap: z.object({ pages: Count, urls: Count }),
  totals: z.object({
    published: Count,
    drafts: Count,
    issues: z.object({ error: Count, warning: Count, info: Count }),
  }),
});

/**
 * Type SeoAuditDto
 * @type SeoAuditDto
 *
 * @description
 * Internal audit.
 */
export type SeoAuditDto = z.infer<typeof SeoAuditSchema>;

/**
 * Constant SeoDashboardDtoSchema
 *
 * @description
 * Response of `GET /api/content/admin/seo/dashboard` (D47): the range, the refresh state (a running
 * refresh, its start and end, the earliest next manual refresh) and the four sections. The Google
 * sections come from the cache, refreshed daily and on request.
 */
export const SeoDashboardDtoSchema = z.object({
  range: SeoRangeSchema,
  refresh: z.object({
    running: z.boolean(),
    startedAt: z.nullable(IsoDateTime),
    finishedAt: z.nullable(IsoDateTime),
    nextAllowedAt: z.nullable(IsoDateTime),
  }),
  searchConsole: SearchConsoleSectionSchema,
  analytics: AnalyticsSectionSchema,
  webVitals: WebVitalsSectionSchema,
  audit: SeoAuditSchema,
});

/**
 * Type SeoDashboardDto
 * @type SeoDashboardDto
 *
 * @description
 * SEO dashboard.
 */
export type SeoDashboardDto = z.infer<typeof SeoDashboardDtoSchema>;

/**
 * Type SeoSectionStatusDto
 * @type SeoSectionStatusDto
 *
 * @description
 * State of a Google section.
 */
export type SeoSectionStatusDto = SeoDashboardDto['searchConsole']['status'];

/**
 * Constant SeoRefreshAcceptedDtoSchema
 *
 * @description
 * Response 202 of `POST /api/content/admin/seo/dashboard/refresh`: the refresh runs in the background
 * (it takes longer than the edge's proxy timeout); poll the dashboard until `refresh.running` is false.
 */
export const SeoRefreshAcceptedDtoSchema = z.object({
  startedAt: IsoDateTime,
  nextAllowedAt: IsoDateTime,
});

/**
 * Type SeoRefreshAcceptedDto
 * @type SeoRefreshAcceptedDto
 *
 * @description
 * Accepted refresh.
 */
export type SeoRefreshAcceptedDto = z.infer<typeof SeoRefreshAcceptedDtoSchema>;

/**
 * Constant SEO_DASHBOARD_ERROR_CODES
 *
 * @description
 * Problem codes of the SEO dashboard besides `request.invalid` (400, an unknown range) and 401: a
 * refresh within 10 minutes of the previous one (429, with `Retry-After` in seconds and the ISO time
 * from which it is accepted in `details[0]`).
 */
export const SEO_DASHBOARD_ERROR_CODES = {
  refreshTooSoon: 'content.seo-refresh-too-soon',
} as const;
