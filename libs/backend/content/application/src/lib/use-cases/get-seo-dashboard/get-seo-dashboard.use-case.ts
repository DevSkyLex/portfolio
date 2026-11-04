import {
  LOCALES,
  type Project,
  type ProjectSeoAudit,
  type SeoAuditIssue,
  type SeoAuditSeverity,
  type SeoRange,
  auditProjectSeo,
} from '@vfortin/content-domain';
import type {
  Clock,
  ProjectRepository,
} from '@internal/content-application/lib/ports/content/content.ports';
import type {
  AnalyticsData,
  CachedSeoReport,
  SearchConsoleData,
  SeoDashboardCache,
  SeoRefreshState,
  SeoReportStore,
  SeoSourceFailure,
  SeoSourceSetup,
  SeoSources,
  WebVitalsReport,
} from '@internal/content-application/lib/ports/seo-dashboard/seo-dashboard.ports';
import { PUBLISHED_LOCALES } from '@internal/content-application/lib/use-cases/published-locales/published-locales';
import { SEO_REFRESH_INTERVAL_MS } from '@internal/content-application/lib/use-cases/refresh-seo-dashboard/refresh-seo-dashboard.use-case';

/**
 * Constant STATIC_PAGES
 *
 * @description
 * Pages of the sitemap that exist in every locale whatever the content (home, legal notice, privacy
 * policy), as `apps/web/scripts/generate-seo-files.mjs` lists them.
 */
const STATIC_PAGES: number = 3;

/**
 * Type SeoSectionView
 * @type SeoSectionView
 * @template T - Report data.
 *
 * @description
 * State of one Google section: `not-configured` with the settings to provide, `pending` until its
 * first refresh, `ok` with the last report, or `error` with the failure of the last attempt and the
 * report fetched before it, if any.
 */
export type SeoSectionView<T> =
  | { readonly status: 'not-configured'; readonly missing: readonly string[] }
  | { readonly status: 'pending' }
  | { readonly status: 'ok'; readonly fetchedAt: Date; readonly data: T }
  | {
      readonly status: 'error';
      readonly attemptedAt: Date;
      readonly failure: SeoSourceFailure;
      readonly fetchedAt: Date | null;
      readonly data: T | null;
    };

/**
 * Interface SeoRefreshView
 * @interface SeoRefreshView
 *
 * @description
 * Refresh state shown by the dashboard.
 */
export interface SeoRefreshView {
  // #region Properties
  /**
   * Property running
   * @readonly
   *
   * @description
   * Whether a refresh started less than `SEO_REFRESH_INTERVAL_MS` ago and has not finished (one
   * interrupted by a restart stops counting after that interval).
   */
  readonly running: boolean;

  /**
   * Property startedAt
   * @readonly
   *
   * @description
   * Start of the last refresh.
   */
  readonly startedAt: Date | null;

  /**
   * Property finishedAt
   * @readonly
   *
   * @description
   * End of the last completed refresh.
   */
  readonly finishedAt: Date | null;

  /**
   * Property nextAllowedAt
   * @readonly
   *
   * @description
   * Earliest time of a manual refresh, `null` when one is allowed now.
   */
  readonly nextAllowedAt: Date | null;
  // #endregion
}

/**
 * Interface SeoAuditView
 * @interface SeoAuditView
 *
 * @description
 * Internal audit of the published content, computed on every read (no Google call).
 */
export interface SeoAuditView {
  // #region Properties
  /**
   * Property generatedAt
   * @readonly
   *
   * @description
   * Time of the audit.
   */
  readonly generatedAt: Date;

  /**
   * Property projects
   * @readonly
   *
   * @description
   * Audit of each published project, in display order.
   */
  readonly projects: readonly ProjectSeoAudit[];

  /**
   * Property sitemap
   * @readonly
   *
   * @description
   * Size of the sitemap the next site build writes: pages, and `<url>` entries (one per page and
   * locale).
   */
  readonly sitemap: { readonly pages: number; readonly urls: number };

  /**
   * Property totals
   * @readonly
   *
   * @description
   * Published and draft projects, and findings per severity.
   */
  readonly totals: {
    readonly published: number;
    readonly drafts: number;
    readonly issues: Readonly<Record<SeoAuditSeverity, number>>;
  };
  // #endregion
}

/**
 * Interface SeoDashboardView
 * @interface SeoDashboardView
 *
 * @description
 * The SEO dashboard of one range (D47).
 */
export interface SeoDashboardView {
  // #region Properties
  /**
   * Property range
   * @readonly
   *
   * @description
   * Report length of the Search Console and GA4 sections.
   */
  readonly range: SeoRange;

  /**
   * Property refresh
   * @readonly
   *
   * @description
   * Refresh state.
   */
  readonly refresh: SeoRefreshView;

  /**
   * Property searchConsole
   * @readonly
   *
   * @description
   * Google Search Console section.
   */
  readonly searchConsole: SeoSectionView<SearchConsoleData>;

  /**
   * Property analytics
   * @readonly
   *
   * @description
   * Google Analytics 4 section.
   */
  readonly analytics: SeoSectionView<AnalyticsData>;

  /**
   * Property webVitals
   * @readonly
   *
   * @description
   * Core Web Vitals section (PageSpeed Insights and CrUX).
   */
  readonly webVitals: SeoSectionView<WebVitalsReport>;

  /**
   * Property audit
   * @readonly
   *
   * @description
   * Internal audit.
   */
  readonly audit: SeoAuditView;
  // #endregion
}

/**
 * Function sectionOf
 *
 * @description
 * Derives the state of a section from its setup and its cache entry. A failure counts when it is
 * newer than the last report.
 *
 * @template T - Report data.
 * @template R - Reader type.
 * @param {SeoSourceSetup<R>} setup - Source setup.
 * @param {CachedSeoReport<T> | null} cached - Cache entry.
 * @returns {SeoSectionView<T>} Section state.
 */
function sectionOf<T, R>(
  setup: SeoSourceSetup<R>,
  cached: CachedSeoReport<T> | null,
): SeoSectionView<T> {
  if ('missing' in setup) return { status: 'not-configured', missing: setup.missing };
  if (cached === null) return { status: 'pending' };
  if (cached.failure === null && cached.data !== null && cached.fetchedAt !== null) {
    return { status: 'ok', fetchedAt: cached.fetchedAt, data: cached.data };
  }
  return {
    status: 'error',
    attemptedAt: cached.attemptedAt,
    failure: cached.failure ?? { code: 'unexpected', message: 'No report was stored.' },
    fetchedAt: cached.fetchedAt,
    data: cached.data,
  };
}

/**
 * Function refreshOf
 *
 * @description
 * Derives the refresh view from the stored state.
 *
 * @param {SeoRefreshState} state - Stored state.
 * @param {Date} now - Current time.
 * @returns {SeoRefreshView} View.
 */
function refreshOf(state: SeoRefreshState, now: Date): SeoRefreshView {
  const next: number | null =
    state.startedAt === null ? null : state.startedAt.getTime() + SEO_REFRESH_INTERVAL_MS;
  const unfinished: boolean =
    state.startedAt !== null &&
    (state.finishedAt === null || state.finishedAt.getTime() < state.startedAt.getTime());
  return {
    running: unfinished && next !== null && next > now.getTime(),
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
    nextAllowedAt: next !== null && next > now.getTime() ? new Date(next) : null,
  };
}

/**
 * Function auditOf
 *
 * @description
 * Audits the published projects in display order and counts the sitemap the next build writes.
 *
 * @param {readonly Project[]} projects - Stored projects, drafts included.
 * @param {Date} now - Audit time.
 * @returns {SeoAuditView} Audit.
 */
function auditOf(projects: readonly Project[], now: Date): SeoAuditView {
  const published: Project[] = projects
    .filter((project: Project): boolean => project.isPublished())
    .sort((a: Project, b: Project): number => a.position - b.position);
  const audits: ProjectSeoAudit[] = published.map(auditProjectSeo);
  const issues: Record<SeoAuditSeverity, number> = { error: 0, warning: 0, info: 0 };
  for (const issue of audits.flatMap(
    (audit: ProjectSeoAudit): readonly SeoAuditIssue[] => audit.issues,
  )) {
    issues[issue.severity] += 1;
  }
  return {
    generatedAt: now,
    projects: audits,
    sitemap: {
      pages: STATIC_PAGES + published.length,
      urls: STATIC_PAGES * LOCALES.length + published.length * PUBLISHED_LOCALES.length,
    },
    totals: { published: published.length, drafts: projects.length - published.length, issues },
  };
}

/**
 * Class GetSeoDashboard
 * @class GetSeoDashboard
 *
 * @description
 * Reads the SEO dashboard of one range: the cached Google sections (never a live call) and the
 * internal audit of the projects.
 */
export class GetSeoDashboard {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the cache, the source setups, the projects and the clock.
   *
   * @param {SeoReportStore} store - Report cache.
   * @param {SeoSources} sources - Google sources, for their configuration state.
   * @param {ProjectRepository} projects - Projects audited.
   * @param {Clock} clock - Time source.
   */
  public constructor(
    private readonly store: SeoReportStore,
    private readonly sources: SeoSources,
    private readonly projects: ProjectRepository,
    private readonly clock: Clock,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Builds the dashboard of a range.
   *
   * @param {SeoRange} range - Report length.
   * @returns {Promise<SeoDashboardView>} Dashboard.
   */
  public async execute(range: SeoRange): Promise<SeoDashboardView> {
    const [cache, projects]: [SeoDashboardCache, Project[]] = await Promise.all([
      this.store.load(range),
      this.projects.list(),
    ]);
    const now: Date = this.clock.now();
    return {
      range,
      refresh: refreshOf(cache.refresh, now),
      searchConsole: sectionOf(this.sources.searchConsole, cache.searchConsole),
      analytics: sectionOf(this.sources.analytics, cache.analytics),
      webVitals: sectionOf(this.sources.webVitals, cache.webVitals),
      audit: auditOf(projects, now),
    };
  }
  // #endregion
}
