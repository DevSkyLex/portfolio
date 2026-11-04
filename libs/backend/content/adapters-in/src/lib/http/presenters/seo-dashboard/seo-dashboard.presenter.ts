import type {
  AnalyticsData,
  SearchConsoleData,
  SeoDashboardView,
  SeoRefreshFailure,
  SeoRefreshSummary,
  SeoSectionView,
  SeoSourceFailure,
  WebVitalsReport,
  WebVitalsRow,
} from '@vfortin/content-application';
import type {
  AnalyticsDataDto,
  SearchConsoleDataDto,
  SeoAuditDto,
  SeoAuditIssueDto,
  SeoDashboardDto,
  SeoSourceErrorDto,
  WebVitalsDataDto,
} from '@vfortin/content-contracts';
import type { ProjectSeoAudit, SeoAuditIssue } from '@vfortin/content-domain';

/**
 * Type SectionDto
 *
 * @description
 * Wire form of a Google section carrying data of type `T`.
 */
type SectionDto<T> =
  | { status: 'not-configured'; fetchedAt: null; missing: string[] }
  | { status: 'pending'; fetchedAt: null }
  | { status: 'ok'; fetchedAt: string; data: T }
  | {
      status: 'error';
      fetchedAt: string | null;
      attemptedAt: string;
      error: SeoSourceErrorDto;
      data: T | null;
    };

/**
 * Function toErrorDto
 *
 * @description
 * Maps a stored failure to its wire form.
 *
 * @param {SeoSourceFailure} failure - Failure.
 * @returns {SeoSourceErrorDto} Error.
 */
function toErrorDto(failure: SeoSourceFailure): SeoSourceErrorDto {
  return { code: failure.code, message: failure.message };
}

/**
 * Function toSectionDto
 *
 * @description
 * Maps a section view, converting its data with `data` and its times to ISO strings.
 *
 * @template T - View data.
 * @template D - Wire data.
 * @param {SeoSectionView<T>} section - Section view.
 * @param {(value: T) => D} data - Data conversion.
 * @returns {SectionDto<D>} Wire section.
 */
function toSectionDto<T, D>(section: SeoSectionView<T>, data: (value: T) => D): SectionDto<D> {
  switch (section.status) {
    case 'not-configured':
      return { status: 'not-configured', fetchedAt: null, missing: [...section.missing] };
    case 'pending':
      return { status: 'pending', fetchedAt: null };
    case 'ok':
      return { status: 'ok', fetchedAt: section.fetchedAt.toISOString(), data: data(section.data) };
    case 'error':
      return {
        status: 'error',
        fetchedAt: section.fetchedAt?.toISOString() ?? null,
        attemptedAt: section.attemptedAt.toISOString(),
        error: toErrorDto(section.failure),
        data: section.data === null ? null : data(section.data),
      };
  }
}

/**
 * Function toWebVitalsDto
 *
 * @description
 * Maps the Web Vitals report, each failed run carrying its `error`.
 *
 * @param {WebVitalsReport} report - Report.
 * @returns {WebVitalsDataDto} Wire report.
 */
function toWebVitalsDto(report: WebVitalsReport): WebVitalsDataDto {
  return {
    rows: report.rows.map((row: WebVitalsRow): WebVitalsDataDto['rows'][number] => ({
      url: row.url,
      strategy: row.strategy,
      measure: row.measure,
      error: row.failure === null ? null : toErrorDto(row.failure),
    })),
  };
}

/**
 * Function toSearchConsoleDto
 *
 * @description
 * Maps a Search Console report.
 *
 * @param {SearchConsoleData} data - Report.
 * @returns {SearchConsoleDataDto} Wire report.
 */
function toSearchConsoleDto(data: SearchConsoleData): SearchConsoleDataDto {
  return {
    window: data.window,
    totals: data.totals,
    previous: data.previous,
    daily: [...data.daily],
    queries: [...data.queries],
    pages: [...data.pages],
    devices: [...data.devices],
  };
}

/**
 * Function toAnalyticsDto
 *
 * @description
 * Maps a GA4 report.
 *
 * @param {AnalyticsData} data - Report.
 * @returns {AnalyticsDataDto} Wire report.
 */
function toAnalyticsDto(data: AnalyticsData): AnalyticsDataDto {
  return {
    window: data.window,
    totals: data.totals,
    previous: data.previous,
    daily: [...data.daily],
    pages: [...data.pages],
    channels: [...data.channels],
    countries: [...data.countries],
  };
}

/**
 * Function toIssueDto
 *
 * @description
 * Maps an audit finding, leaving out the figures it does not have.
 *
 * @param {SeoAuditIssue} issue - Finding.
 * @returns {SeoAuditIssueDto} Wire finding.
 */
function toIssueDto(issue: SeoAuditIssue): SeoAuditIssueDto {
  return {
    code: issue.code,
    severity: issue.severity,
    locale: issue.locale,
    ...(issue.length === undefined ? {} : { length: issue.length }),
    ...(issue.limit === undefined ? {} : { limit: issue.limit }),
    ...(issue.count === undefined ? {} : { count: issue.count }),
    ...(issue.fields === undefined ? {} : { fields: [...issue.fields] }),
  };
}

/**
 * Function toSeoDashboardDto
 *
 * @description
 * Maps the dashboard view to `SeoDashboardDto` (D47).
 *
 * @param {SeoDashboardView} view - Dashboard.
 * @returns {SeoDashboardDto} Wire dashboard.
 */
export function toSeoDashboardDto(view: SeoDashboardView): SeoDashboardDto {
  const audit: SeoAuditDto = {
    generatedAt: view.audit.generatedAt.toISOString(),
    projects: view.audit.projects.map(
      (project: ProjectSeoAudit): SeoAuditDto['projects'][number] => ({
        id: project.projectId,
        slug: project.slug,
        title: project.title,
        pages: {
          fr: { ...project.pages.fr, keywords: [...project.pages.fr.keywords] },
          en: { ...project.pages.en, keywords: [...project.pages.en.keywords] },
        },
        issues: project.issues.map(toIssueDto),
      }),
    ),
    sitemap: { ...view.audit.sitemap },
    totals: {
      published: view.audit.totals.published,
      drafts: view.audit.totals.drafts,
      issues: { ...view.audit.totals.issues },
    },
  };
  return {
    range: view.range,
    refresh: {
      running: view.refresh.running,
      startedAt: view.refresh.startedAt?.toISOString() ?? null,
      finishedAt: view.refresh.finishedAt?.toISOString() ?? null,
      nextAllowedAt: view.refresh.nextAllowedAt?.toISOString() ?? null,
    },
    searchConsole: toSectionDto(view.searchConsole, toSearchConsoleDto),
    analytics: toSectionDto(view.analytics, toAnalyticsDto),
    webVitals: toSectionDto(view.webVitals, toWebVitalsDto),
    audit,
  };
}

/**
 * Function summaryLine
 *
 * @description
 * Formats a refresh outcome for the operations log: counts and failure reasons, never a message.
 *
 * @param {SeoRefreshSummary} summary - Outcome.
 * @returns {string} Log line.
 */
export function summaryLine(summary: SeoRefreshSummary): string {
  const failures: string = summary.failures
    .map(
      (failure: SeoRefreshFailure): string =>
        `${failure.source}/${failure.range ?? 'all'}: ${failure.code}`,
    )
    .join(', ');
  return `SEO dashboard refreshed: ${summary.refreshed} report(s) stored, ${summary.failures.length} failure(s)${failures ? ` (${failures})` : ''}.`;
}
