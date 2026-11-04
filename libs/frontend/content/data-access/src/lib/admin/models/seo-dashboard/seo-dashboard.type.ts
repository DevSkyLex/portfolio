import type {
  AnalyticsDataDto,
  SearchConsoleDataDto,
  SeoAuditDto,
  SeoAuditIssueDto,
  SeoDashboardDto,
  SeoRangeDto,
  SeoSourceErrorDto,
  WebVitalsDataDto,
} from '@vfortin/content-contracts';

/**
 * Type SeoDashboard
 *
 * @description
 * SEO dashboard as the API answers it (D47), read as is: every figure is already aggregated and each
 * section carries its own status. Type-only, from the contract (D10).
 */
export type SeoDashboard = SeoDashboardDto;

/**
 * Type SeoRange
 *
 * @description
 * Report window: `7d`, `28d` or `90d`.
 */
export type SeoRange = SeoRangeDto;

/**
 * Type SearchConsoleSection
 *
 * @description
 * Search Console section: `not-configured`, `pending`, `ok`, or `error` with the last good report.
 */
export type SearchConsoleSection = SeoDashboardDto['searchConsole'];

/**
 * Type AnalyticsSection
 *
 * @description
 * Google Analytics 4 section, with the same statuses.
 */
export type AnalyticsSection = SeoDashboardDto['analytics'];

/**
 * Type WebVitalsSection
 *
 * @description
 * Core Web Vitals section (PageSpeed Insights), independent of the window.
 */
export type WebVitalsSection = SeoDashboardDto['webVitals'];

/**
 * Type SearchConsoleData
 *
 * @description
 * Search Console report of a window and of the period before it.
 */
export type SearchConsoleData = SearchConsoleDataDto;

/**
 * Type AnalyticsData
 *
 * @description
 * GA4 report of a window and of the period before it.
 */
export type AnalyticsData = AnalyticsDataDto;

/**
 * Type WebVitalsData
 *
 * @description
 * PageSpeed Insights rows, one per key URL and strategy.
 */
export type WebVitalsData = WebVitalsDataDto;

/**
 * Type SeoAudit
 *
 * @description
 * Internal audit of the published projects and of the next sitemap, computed on every read.
 */
export type SeoAudit = SeoAuditDto;

/**
 * Type SeoAuditIssue
 *
 * @description
 * One audit finding of a project, with its severity and its measured length or count.
 */
export type SeoAuditIssue = SeoAuditIssueDto;

/**
 * Type SeoSourceError
 *
 * @description
 * Failure of a source's last attempt: a stable code and an English message without secrets.
 */
export type SeoSourceError = SeoSourceErrorDto;
