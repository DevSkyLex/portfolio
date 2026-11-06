import type { ReportWindow, SeoRange } from '@vfortin/content-domain';

/**
 * Interface SearchMetrics
 * @interface SearchMetrics
 *
 * @description
 * Google Search Console performance figures: clicks, impressions, click-through rate (0 to 1) and
 * average position (1 is the top result; 0 when there was no impression).
 */
export interface SearchMetrics {
  // #region Properties
  /**
   * Property clicks
   * @readonly
   *
   * @description
   * Clicks from Google Search results.
   */
  readonly clicks: number;

  /**
   * Property impressions
   * @readonly
   *
   * @description
   * Times a link to the site appeared in a result.
   */
  readonly impressions: number;

  /**
   * Property ctr
   * @readonly
   *
   * @description
   * Clicks divided by impressions, between 0 and 1.
   */
  readonly ctr: number;

  /**
   * Property position
   * @readonly
   *
   * @description
   * Average topmost position of the site in the results.
   */
  readonly position: number;
  // #endregion
}

/**
 * Interface SearchDay
 * @interface SearchDay
 *
 * @description
 * Search figures of one day.
 */
export interface SearchDay extends SearchMetrics {
  // #region Properties
  /**
   * Property date
   * @readonly
   *
   * @description
   * Day as `YYYY-MM-DD`.
   */
  readonly date: string;
  // #endregion
}

/**
 * Interface SearchRow
 * @interface SearchRow
 *
 * @description
 * Search figures of one query, page or device.
 */
export interface SearchRow extends SearchMetrics {
  // #region Properties
  /**
   * Property key
   * @readonly
   *
   * @description
   * Query text, absolute page URL or device (`DESKTOP`, `MOBILE`, `TABLET`).
   */
  readonly key: string;
  // #endregion
}

/**
 * Interface SearchConsoleReport
 * @interface SearchConsoleReport
 *
 * @description
 * Search Console performance of one report window (`searchanalytics.query`, web search).
 */
export interface SearchConsoleReport {
  // #region Properties
  /**
   * Property totals
   * @readonly
   *
   * @description
   * Figures of the reported days, aggregated by property.
   */
  readonly totals: SearchMetrics;

  /**
   * Property previous
   * @readonly
   *
   * @description
   * Figures of the period before, for the deltas.
   */
  readonly previous: SearchMetrics;

  /**
   * Property daily
   * @readonly
   *
   * @description
   * One entry per reported day in order, zeros for a day without data.
   */
  readonly daily: readonly SearchDay[];

  /**
   * Property queries
   * @readonly
   *
   * @description
   * Top 20 queries by clicks (anonymized queries are not listed by Google).
   */
  readonly queries: readonly SearchRow[];

  /**
   * Property pages
   * @readonly
   *
   * @description
   * Top 20 pages by clicks.
   */
  readonly pages: readonly SearchRow[];

  /**
   * Property devices
   * @readonly
   *
   * @description
   * Figures per device type.
   */
  readonly devices: readonly SearchRow[];
  // #endregion
}

/**
 * Interface SearchConsoleReader
 * @interface SearchConsoleReader
 *
 * @description
 * Reads the Search Console performance of the configured property.
 */
export interface SearchConsoleReader {
  // #region Methods
  /**
   * Method report
   * @method report
   *
   * @description
   * Fetches the report of one window.
   *
   * @param {ReportWindow} window - Reported days and the period before.
   * @throws {SeoSourceError} On any failure, with a message free of credentials.
   * @returns {Promise<SearchConsoleReport>} Report.
   */
  report(window: ReportWindow): Promise<SearchConsoleReport>;
  // #endregion
}

/**
 * Interface AudienceTotals
 * @interface AudienceTotals
 *
 * @description
 * Google Analytics 4 audience figures of a period.
 */
export interface AudienceTotals {
  // #region Properties
  /**
   * Property activeUsers
   * @readonly
   *
   * @description
   * Distinct engaged users (`activeUsers`).
   */
  readonly activeUsers: number;

  /**
   * Property sessions
   * @readonly
   *
   * @description
   * Sessions started.
   */
  readonly sessions: number;

  /**
   * Property views
   * @readonly
   *
   * @description
   * Page views (`screenPageViews`).
   */
  readonly views: number;

  /**
   * Property engagementRate
   * @readonly
   *
   * @description
   * Engaged sessions divided by sessions, between 0 and 1.
   */
  readonly engagementRate: number;

  /**
   * Property averageEngagementSeconds
   * @readonly
   *
   * @description
   * Engagement time per active user in seconds (`userEngagementDuration / activeUsers`, the GA4
   * « average engagement time »), 0 without users.
   */
  readonly averageEngagementSeconds: number;
  // #endregion
}

/**
 * Interface AudienceDay
 * @interface AudienceDay
 *
 * @description
 * Audience figures of one day.
 */
export interface AudienceDay {
  // #region Properties
  /**
   * Property date
   * @readonly
   *
   * @description
   * Day as `YYYY-MM-DD`.
   */
  readonly date: string;

  /**
   * Property activeUsers
   * @readonly
   *
   * @description
   * Active users that day.
   */
  readonly activeUsers: number;

  /**
   * Property sessions
   * @readonly
   *
   * @description
   * Sessions that day.
   */
  readonly sessions: number;

  /**
   * Property views
   * @readonly
   *
   * @description
   * Page views that day.
   */
  readonly views: number;
  // #endregion
}

/**
 * Interface AudiencePage
 * @interface AudiencePage
 *
 * @description
 * Audience of one page path.
 */
export interface AudiencePage {
  // #region Properties
  /**
   * Property path
   * @readonly
   *
   * @description
   * Page path (`pagePath`), without the origin.
   */
  readonly path: string;

  /**
   * Property views
   * @readonly
   *
   * @description
   * Page views.
   */
  readonly views: number;

  /**
   * Property activeUsers
   * @readonly
   *
   * @description
   * Active users who viewed it.
   */
  readonly activeUsers: number;
  // #endregion
}

/**
 * Interface AudienceShare
 * @interface AudienceShare
 *
 * @description
 * Sessions and active users of one channel group or country.
 */
export interface AudienceShare {
  // #region Properties
  /**
   * Property key
   * @readonly
   *
   * @description
   * Default channel group (`Organic Search`, `Direct`…) or country name as GA4 reports it.
   */
  readonly key: string;

  /**
   * Property sessions
   * @readonly
   *
   * @description
   * Sessions.
   */
  readonly sessions: number;

  /**
   * Property activeUsers
   * @readonly
   *
   * @description
   * Active users.
   */
  readonly activeUsers: number;
  // #endregion
}

/**
 * Interface AnalyticsReport
 * @interface AnalyticsReport
 *
 * @description
 * GA4 audience of one report window (Data API `runReport`).
 */
export interface AnalyticsReport {
  // #region Properties
  /**
   * Property totals
   * @readonly
   *
   * @description
   * Figures of the reported days.
   */
  readonly totals: AudienceTotals;

  /**
   * Property previous
   * @readonly
   *
   * @description
   * Figures of the period before, for the deltas.
   */
  readonly previous: AudienceTotals;

  /**
   * Property daily
   * @readonly
   *
   * @description
   * One entry per reported day in order, zeros for a day without data.
   */
  readonly daily: readonly AudienceDay[];

  /**
   * Property pages
   * @readonly
   *
   * @description
   * Top 20 pages by views.
   */
  readonly pages: readonly AudiencePage[];

  /**
   * Property channels
   * @readonly
   *
   * @description
   * Sessions by default channel group, most first.
   */
  readonly channels: readonly AudienceShare[];

  /**
   * Property countries
   * @readonly
   *
   * @description
   * Top 10 countries by sessions.
   */
  readonly countries: readonly AudienceShare[];
  // #endregion
}

/**
 * Interface AnalyticsReader
 * @interface AnalyticsReader
 *
 * @description
 * Reads the GA4 audience of the configured property.
 */
export interface AnalyticsReader {
  // #region Methods
  /**
   * Method report
   * @method report
   *
   * @description
   * Fetches the report of one window.
   *
   * @param {ReportWindow} window - Reported days and the period before.
   * @throws {SeoSourceError} On any failure, with a message free of credentials.
   * @returns {Promise<AnalyticsReport>} Report.
   */
  report(window: ReportWindow): Promise<AnalyticsReport>;
  // #endregion
}

/**
 * Type PageSpeedStrategy
 * @type PageSpeedStrategy
 *
 * @description
 * Device emulated by PageSpeed Insights and selecting the CrUX form factor.
 */
export type PageSpeedStrategy = 'mobile' | 'desktop';

/**
 * Constant PAGE_SPEED_STRATEGIES
 *
 * @description
 * Strategies measured for every key URL.
 */
export const PAGE_SPEED_STRATEGIES: readonly PageSpeedStrategy[] = ['mobile', 'desktop'];

/**
 * Type VitalCategory
 * @type VitalCategory
 *
 * @description
 * Core Web Vitals assessment of a 75th percentile (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 are good;
 * 4 s, 500 ms and 0.25 separate « needs improvement » from poor).
 */
export type VitalCategory = 'good' | 'needs-improvement' | 'poor';

/**
 * Interface FieldVital
 * @interface FieldVital
 *
 * @description
 * One Core Web Vital measured on real Chrome users (CrUX).
 */
export interface FieldVital {
  // #region Properties
  /**
   * Property p75
   * @readonly
   *
   * @description
   * 75th percentile: milliseconds for LCP and INP, unitless for CLS (0.05, not CrUX's 5).
   */
  readonly p75: number;

  /**
   * Property category
   * @readonly
   *
   * @description
   * Assessment of the percentile.
   */
  readonly category: VitalCategory;
  // #endregion
}

/**
 * Interface FieldVitals
 * @interface FieldVitals
 *
 * @description
 * CrUX field data of a URL over the last 28 days, `null` metrics when CrUX has too few samples.
 */
export interface FieldVitals {
  // #region Properties
  /**
   * Property scope
   * @readonly
   *
   * @description
   * `url` for the page's own data, `origin` when CrUX fell back to the whole origin.
   */
  readonly scope: 'url' | 'origin';

  /**
   * Property lcp
   * @readonly
   *
   * @description
   * Largest Contentful Paint.
   */
  readonly lcp: FieldVital | null;

  /**
   * Property inp
   * @readonly
   *
   * @description
   * Interaction to Next Paint.
   */
  readonly inp: FieldVital | null;

  /**
   * Property cls
   * @readonly
   *
   * @description
   * Cumulative Layout Shift.
   */
  readonly cls: FieldVital | null;
  // #endregion
}

/**
 * Interface LabVitals
 * @interface LabVitals
 *
 * @description
 * Lighthouse measures of one PageSpeed Insights run, `null` where Lighthouse reported none.
 */
export interface LabVitals {
  // #region Properties
  /**
   * Property performanceScore
   * @readonly
   *
   * @description
   * Performance score from 0 to 100.
   */
  readonly performanceScore: number | null;

  /**
   * Property lcpMs
   * @readonly
   *
   * @description
   * Largest Contentful Paint in milliseconds.
   */
  readonly lcpMs: number | null;

  /**
   * Property cls
   * @readonly
   *
   * @description
   * Cumulative Layout Shift.
   */
  readonly cls: number | null;

  /**
   * Property tbtMs
   * @readonly
   *
   * @description
   * Total Blocking Time in milliseconds, the lab stand-in for INP.
   */
  readonly tbtMs: number | null;
  // #endregion
}

/**
 * Interface WebVitalsMeasure
 * @interface WebVitalsMeasure
 *
 * @description
 * Field and lab measures of one URL with one strategy.
 */
export interface WebVitalsMeasure {
  // #region Properties
  /**
   * Property field
   * @readonly
   *
   * @description
   * CrUX field data, `null` when CrUX has none for the URL or its origin.
   */
  readonly field: FieldVitals | null;

  /**
   * Property lab
   * @readonly
   *
   * @description
   * Lighthouse measures.
   */
  readonly lab: LabVitals;
  // #endregion
}

/**
 * Interface WebVitalsReader
 * @interface WebVitalsReader
 *
 * @description
 * Measures pages with PageSpeed Insights.
 */
export interface WebVitalsReader {
  // #region Methods
  /**
   * Method measure
   * @method measure
   *
   * @description
   * Runs PageSpeed Insights (performance category) on one URL.
   *
   * @param {string} url - Absolute page URL.
   * @param {PageSpeedStrategy} strategy - Emulated device.
   * @throws {SeoSourceError} On any failure, with a message free of the API key.
   * @returns {Promise<WebVitalsMeasure>} Measures.
   */
  measure(url: string, strategy: PageSpeedStrategy): Promise<WebVitalsMeasure>;
  // #endregion
}

/**
 * Type SeoSourceErrorCode
 * @type SeoSourceErrorCode
 *
 * @description
 * Stable reason of a source failure, which the dashboard explains to the owner.
 */
export type SeoSourceErrorCode =
  | 'credentials-missing'
  | 'credentials-invalid'
  | 'credentials-rejected'
  | 'permission-denied'
  | 'not-found'
  | 'bad-request'
  | 'quota-exceeded'
  | 'timeout'
  | 'network'
  | 'upstream'
  | 'invalid-response'
  | 'unexpected';

/**
 * Interface SeoSourceFailure
 * @interface SeoSourceFailure
 *
 * @description
 * Stored failure of one source: its reason and a message that never carries a token or a key.
 */
export interface SeoSourceFailure {
  // #region Properties
  /**
   * Property code
   * @readonly
   *
   * @description
   * Reason.
   */
  readonly code: SeoSourceErrorCode;

  /**
   * Property message
   * @readonly
   *
   * @description
   * English detail, at most 300 characters.
   */
  readonly message: string;
  // #endregion
}

/**
 * Interface WebVitalsRow
 * @interface WebVitalsRow
 *
 * @description
 * Measures of one key URL with one strategy, or why they failed.
 */
export interface WebVitalsRow {
  // #region Properties
  /**
   * Property url
   * @readonly
   *
   * @description
   * Measured URL.
   */
  readonly url: string;

  /**
   * Property strategy
   * @readonly
   *
   * @description
   * Emulated device.
   */
  readonly strategy: PageSpeedStrategy;

  /**
   * Property measure
   * @readonly
   *
   * @description
   * Measures, `null` when this run failed.
   */
  readonly measure: WebVitalsMeasure | null;

  /**
   * Property failure
   * @readonly
   *
   * @description
   * Failure of this run, `null` when it succeeded.
   */
  readonly failure: SeoSourceFailure | null;
  // #endregion
}

/**
 * Interface WebVitalsReport
 * @interface WebVitalsReport
 *
 * @description
 * Measures of every key URL, mobile then desktop for each.
 */
export interface WebVitalsReport {
  // #region Properties
  /**
   * Property rows
   * @readonly
   *
   * @description
   * One row per URL and strategy.
   */
  readonly rows: readonly WebVitalsRow[];
  // #endregion
}

/**
 * Type SearchConsoleData
 * @type SearchConsoleData
 *
 * @description
 * Stored Search Console report with the window it covers.
 */
export type SearchConsoleData = SearchConsoleReport & { readonly window: ReportWindow };

/**
 * Type AnalyticsData
 * @type AnalyticsData
 *
 * @description
 * Stored GA4 report with the window it covers.
 */
export type AnalyticsData = AnalyticsReport & { readonly window: ReportWindow };

/**
 * Type SeoSource
 * @type SeoSource
 *
 * @description
 * Google source cached by the SEO dashboard.
 */
export type SeoSource = 'search-console' | 'analytics' | 'web-vitals';

/**
 * Type SeoReport
 * @type SeoReport
 *
 * @description
 * Report written to the cache: Search Console and GA4 per range, the Web Vitals once (they cover
 * CrUX's own 28 days).
 */
export type SeoReport =
  | {
      readonly source: 'search-console';
      readonly range: SeoRange;
      readonly data: SearchConsoleData;
    }
  | { readonly source: 'analytics'; readonly range: SeoRange; readonly data: AnalyticsData }
  | { readonly source: 'web-vitals'; readonly range: null; readonly data: WebVitalsReport };

/**
 * Interface CachedSeoReport
 * @interface CachedSeoReport
 * @template T - Report data.
 *
 * @description
 * Cache entry of one source and range: the last report fetched and the outcome of the last attempt.
 */
export interface CachedSeoReport<T> {
  // #region Properties
  /**
   * Property data
   * @readonly
   *
   * @description
   * Last report fetched, kept when a later attempt fails; `null` when none ever succeeded.
   */
  readonly data: T | null;

  /**
   * Property fetchedAt
   * @readonly
   *
   * @description
   * Time `data` was fetched.
   */
  readonly fetchedAt: Date | null;

  /**
   * Property failure
   * @readonly
   *
   * @description
   * Failure of the last attempt, `null` when it succeeded.
   */
  readonly failure: SeoSourceFailure | null;

  /**
   * Property attemptedAt
   * @readonly
   *
   * @description
   * Time of the last attempt.
   */
  readonly attemptedAt: Date;
  // #endregion
}

/**
 * Interface SeoRefreshState
 * @interface SeoRefreshState
 *
 * @description
 * Start and end of the last refresh; a start after the end is a refresh in progress (or interrupted).
 */
export interface SeoRefreshState {
  // #region Properties
  /**
   * Property startedAt
   * @readonly
   *
   * @description
   * Start of the last refresh, `null` before the first one.
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
  // #endregion
}

/**
 * Interface SeoDashboardCache
 * @interface SeoDashboardCache
 *
 * @description
 * Cache entries read by the dashboard for one range.
 */
export interface SeoDashboardCache {
  // #region Properties
  /**
   * Property searchConsole
   * @readonly
   *
   * @description
   * Search Console entry of the range, `null` before its first attempt.
   */
  readonly searchConsole: CachedSeoReport<SearchConsoleData> | null;

  /**
   * Property analytics
   * @readonly
   *
   * @description
   * GA4 entry of the range, `null` before its first attempt.
   */
  readonly analytics: CachedSeoReport<AnalyticsData> | null;

  /**
   * Property webVitals
   * @readonly
   *
   * @description
   * Web Vitals entry, `null` before its first attempt.
   */
  readonly webVitals: CachedSeoReport<WebVitalsReport> | null;

  /**
   * Property refresh
   * @readonly
   *
   * @description
   * State of the refreshes.
   */
  readonly refresh: SeoRefreshState;
  // #endregion
}

/**
 * Interface SeoReportStore
 * @interface SeoReportStore
 *
 * @description
 * Cache of the Google reports (D47): the dashboard reads it, the refresh writes it, so a page view
 * never calls Google.
 */
export interface SeoReportStore {
  // #region Methods
  /**
   * Method load
   * @method load
   *
   * @description
   * Reads the entries of one range and the refresh state.
   *
   * @param {SeoRange} range - Range of the Search Console and GA4 entries.
   * @returns {Promise<SeoDashboardCache>} Entries.
   */
  load(range: SeoRange): Promise<SeoDashboardCache>;

  /**
   * Method saveReport
   * @method saveReport
   *
   * @description
   * Replaces the entry of a source and range with a fetched report and clears its failure.
   *
   * @param {SeoReport} report - Fetched report.
   * @param {Date} at - Fetch time.
   * @returns {Promise<void>} Completion after the write.
   */
  saveReport(report: SeoReport, at: Date): Promise<void>;

  /**
   * Method saveFailure
   * @method saveFailure
   *
   * @description
   * Records the failure of an attempt, keeping the report fetched before.
   *
   * @param {SeoSource} source - Failed source.
   * @param {SeoRange | null} range - Range, `null` for the Web Vitals.
   * @param {SeoSourceFailure} failure - Failure.
   * @param {Date} at - Attempt time.
   * @returns {Promise<void>} Completion after the write.
   */
  saveFailure(
    source: SeoSource,
    range: SeoRange | null,
    failure: SeoSourceFailure,
    at: Date,
  ): Promise<void>;

  /**
   * Method claimRefresh
   * @method claimRefresh
   *
   * @description
   * Atomically records `now` as the start of a refresh, only if no refresh started after
   * `notBefore`, so concurrent requests (several clicks, the daily job) start one refresh.
   *
   * @param {Date} now - Start time.
   * @param {Date} notBefore - Latest start that still allows a new refresh.
   * @returns {Promise<boolean>} Whether this caller started the refresh.
   */
  claimRefresh(now: Date, notBefore: Date): Promise<boolean>;

  /**
   * Method finishRefresh
   * @method finishRefresh
   *
   * @description
   * Records the end of the refresh in progress.
   *
   * @param {Date} at - End time.
   * @returns {Promise<void>} Completion after the write.
   */
  finishRefresh(at: Date): Promise<void>;

  /**
   * Method refreshState
   * @method refreshState
   *
   * @description
   * Reads the start and end of the last refresh.
   *
   * @returns {Promise<SeoRefreshState>} State.
   */
  refreshState(): Promise<SeoRefreshState>;
  // #endregion
}

/**
 * Type SeoSourceSetup
 * @type SeoSourceSetup
 * @template R - Reader of the source.
 *
 * @description
 * A configured source with its reader, or the settings still to provide (environment variable
 * names, shown to the owner as `not-configured`). `demo` marks a stand-in reader of demonstration
 * figures (D52), which the dashboard announces.
 */
export type SeoSourceSetup<R> =
  { readonly reader: R; readonly demo?: boolean } | { readonly missing: readonly string[] };

/**
 * Interface SeoSources
 * @interface SeoSources
 *
 * @description
 * The three Google sources of the dashboard, each optional.
 */
export interface SeoSources {
  // #region Properties
  /**
   * Property searchConsole
   * @readonly
   *
   * @description
   * Google Search Console.
   */
  readonly searchConsole: SeoSourceSetup<SearchConsoleReader>;

  /**
   * Property analytics
   * @readonly
   *
   * @description
   * Google Analytics 4 Data API.
   */
  readonly analytics: SeoSourceSetup<AnalyticsReader>;

  /**
   * Property webVitals
   * @readonly
   *
   * @description
   * PageSpeed Insights with its CrUX field data.
   */
  readonly webVitals: SeoSourceSetup<WebVitalsReader>;
  // #endregion
}
