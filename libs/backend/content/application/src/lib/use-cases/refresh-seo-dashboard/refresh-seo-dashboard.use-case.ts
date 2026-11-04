import {
  type Project,
  type ReportWindow,
  SEO_RANGES,
  type SeoRange,
  reportWindow,
} from '@vfortin/content-domain';
import {
  SeoRefreshTooSoonError,
  SeoSourceError,
} from '@internal/content-application/lib/errors/application-error';
import type {
  Clock,
  ProjectRepository,
} from '@internal/content-application/lib/ports/content/content.ports';
import {
  type AnalyticsReader,
  PAGE_SPEED_STRATEGIES,
  type PageSpeedStrategy,
  type SearchConsoleReader,
  type SeoRefreshState,
  type SeoReport,
  type SeoReportStore,
  type SeoSource,
  type SeoSourceFailure,
  type SeoSourceSetup,
  type SeoSources,
  type WebVitalsReader,
  type WebVitalsRow,
} from '@internal/content-application/lib/ports/seo-dashboard/seo-dashboard.ports';

/**
 * Constant SEO_REFRESH_INTERVAL_MS
 *
 * @description
 * Shortest time between the starts of two refreshes (10 minutes): a refresh calls Google about 40
 * times, and the data changes once a day.
 */
export const SEO_REFRESH_INTERVAL_MS: number = 10 * 60_000;

/**
 * Constant SEARCH_CONSOLE_LAG_DAYS
 *
 * @description
 * Days between today and the last reported Search Console day: its final figures arrive two to three
 * days late.
 */
export const SEARCH_CONSOLE_LAG_DAYS: number = 3;

/**
 * Constant ANALYTICS_LAG_DAYS
 *
 * @description
 * Days between today and the last reported GA4 day: today is incomplete, yesterday is processed
 * within the day.
 */
export const ANALYTICS_LAG_DAYS: number = 1;

/**
 * Interface SeoRefreshOptions
 * @interface SeoRefreshOptions
 *
 * @description
 * Public site settings of the refresh.
 */
export interface SeoRefreshOptions {
  // #region Properties
  /**
   * Property siteOrigin
   * @readonly
   *
   * @description
   * Public origin without a trailing slash (`https://valentin-fortin.pro`).
   */
  readonly siteOrigin: string;

  /**
   * Property webVitalsUrls
   * @readonly
   *
   * @description
   * Key URLs measured by PageSpeed Insights; empty for the default list (`defaultWebVitalsUrls`).
   */
  readonly webVitalsUrls: readonly string[];
  // #endregion
}

/**
 * Interface SeoRefreshFailure
 * @interface SeoRefreshFailure
 *
 * @description
 * Failure of one source and range during a refresh, for the operations log.
 */
export interface SeoRefreshFailure {
  // #region Properties
  /**
   * Property source
   * @readonly
   *
   * @description
   * Failed source.
   */
  readonly source: SeoSource;

  /**
   * Property range
   * @readonly
   *
   * @description
   * Range, `null` for the Web Vitals.
   */
  readonly range: SeoRange | null;

  /**
   * Property code
   * @readonly
   *
   * @description
   * Reason.
   */
  readonly code: SeoSourceFailure['code'];
  // #endregion
}

/**
 * Interface SeoRefreshSummary
 * @interface SeoRefreshSummary
 *
 * @description
 * Outcome of a completed refresh.
 */
export interface SeoRefreshSummary {
  // #region Properties
  /**
   * Property startedAt
   * @readonly
   *
   * @description
   * Start time.
   */
  readonly startedAt: Date;

  /**
   * Property finishedAt
   * @readonly
   *
   * @description
   * End time.
   */
  readonly finishedAt: Date;

  /**
   * Property refreshed
   * @readonly
   *
   * @description
   * Number of cache entries written with a fresh report.
   */
  readonly refreshed: number;

  /**
   * Property failures
   * @readonly
   *
   * @description
   * Entries whose attempt failed.
   */
  readonly failures: readonly SeoRefreshFailure[];
  // #endregion
}

/**
 * Interface SeoRefreshTicket
 * @interface SeoRefreshTicket
 *
 * @description
 * A started refresh: its start time and its completion, which the caller may await or leave running.
 */
export interface SeoRefreshTicket {
  // #region Properties
  /**
   * Property startedAt
   * @readonly
   *
   * @description
   * Start time.
   */
  readonly startedAt: Date;

  /**
   * Property completion
   * @readonly
   *
   * @description
   * Resolves once every configured source was fetched or failed; rejects only when the cache cannot
   * be written.
   */
  readonly completion: Promise<SeoRefreshSummary>;
  // #endregion
}

/**
 * Interface RefreshOutcome
 * @interface RefreshOutcome
 *
 * @description
 * Entries written and failures of one source during a refresh.
 */
interface RefreshOutcome {
  // #region Properties
  /**
   * Property refreshed
   *
   * @description
   * Entries written with a fresh report.
   */
  refreshed: number;

  /**
   * Property failures
   * @readonly
   *
   * @description
   * Failed entries.
   */
  readonly failures: SeoRefreshFailure[];
  // #endregion
}

/**
 * Function failureOf
 *
 * @description
 * Converts a thrown value into a stored failure: a `SeoSourceError` keeps its reason and message,
 * anything else becomes `unexpected` without its message, which an adapter did not vet.
 *
 * @param {unknown} error - Thrown value.
 * @returns {SeoSourceFailure} Failure safe to store and show.
 */
export function failureOf(error: unknown): SeoSourceFailure {
  return error instanceof SeoSourceError
    ? { code: error.reason, message: error.message }
    : { code: 'unexpected', message: 'The source failed unexpectedly.' };
}

/**
 * Function defaultWebVitalsUrls
 *
 * @description
 * Key URLs measured when none is configured: the French and English home pages and the French page
 * of the first published project (featured ones first, then by position).
 *
 * @param {string} origin - Public origin without a trailing slash.
 * @param {readonly Project[]} projects - Stored projects, drafts included.
 * @returns {string[]} Absolute URLs.
 */
export function defaultWebVitalsUrls(origin: string, projects: readonly Project[]): string[] {
  const [first] = projects
    .filter((project: Project): boolean => project.isPublished())
    .sort(
      (a: Project, b: Project): number =>
        Number(b.snapshot().featured) - Number(a.snapshot().featured) || a.position - b.position,
    );
  return [
    `${origin}/`,
    `${origin}/en/`,
    ...(first ? [`${origin}/projects/${encodeURIComponent(first.slug.value)}`] : []),
  ];
}

/**
 * Function readerOf
 *
 * @description
 * Returns the reader of a configured source.
 *
 * @template R - Reader type.
 * @param {SeoSourceSetup<R>} setup - Source setup.
 * @returns {R | null} Reader, or `null` when the source is not configured.
 */
function readerOf<R>(setup: SeoSourceSetup<R>): R | null {
  return 'reader' in setup ? setup.reader : null;
}

/**
 * Class RefreshSeoDashboard
 * @class RefreshSeoDashboard
 *
 * @description
 * Fetches every configured Google source into the cache (D47): Search Console and GA4 for each range
 * (one range after the other, within GA4's ten concurrent requests per property), PageSpeed Insights
 * for every key URL on mobile and desktop. A failure is stored per source and range, keeping the
 * report fetched before; it never stops the other sources.
 */
export class RefreshSeoDashboard {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the cache, the sources, the projects (default key URLs) and the clock.
   *
   * @param {SeoReportStore} store - Report cache.
   * @param {SeoSources} sources - Google sources.
   * @param {ProjectRepository} projects - Projects, for the default key URLs.
   * @param {Clock} clock - Time source.
   * @param {SeoRefreshOptions} options - Public site settings.
   */
  public constructor(
    private readonly store: SeoReportStore,
    private readonly sources: SeoSources,
    private readonly projects: ProjectRepository,
    private readonly clock: Clock,
    private readonly options: SeoRefreshOptions,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method start
   * @method start
   *
   * @description
   * Claims the refresh and starts it without waiting for Google (a refresh takes longer than the
   * edge's 30-second proxy timeout).
   *
   * @throws {SeoRefreshTooSoonError} When a refresh started less than `SEO_REFRESH_INTERVAL_MS` ago.
   * @returns {Promise<SeoRefreshTicket>} Start time and completion.
   */
  public async start(): Promise<SeoRefreshTicket> {
    const now: Date = this.clock.now();
    const claimed: boolean = await this.store.claimRefresh(
      now,
      new Date(now.getTime() - SEO_REFRESH_INTERVAL_MS),
    );
    if (!claimed) {
      const state: SeoRefreshState = await this.store.refreshState();
      const last: number = state.startedAt?.getTime() ?? now.getTime();
      throw new SeoRefreshTooSoonError(new Date(last + SEO_REFRESH_INTERVAL_MS));
    }
    return { startedAt: now, completion: this.run(now) };
  }

  /**
   * Method run
   * @method run
   *
   * @description
   * Fetches the three sources concurrently, then records the end of the refresh.
   *
   * @param {Date} startedAt - Start time.
   * @returns {Promise<SeoRefreshSummary>} Outcome.
   */
  private async run(startedAt: Date): Promise<SeoRefreshSummary> {
    const outcomes: RefreshOutcome[] = await Promise.all([
      this.byRange('search-console', SEARCH_CONSOLE_LAG_DAYS),
      this.byRange('analytics', ANALYTICS_LAG_DAYS),
      this.webVitals(),
    ]);
    const finishedAt: Date = this.clock.now();
    await this.store.finishRefresh(finishedAt);
    return {
      startedAt,
      finishedAt,
      refreshed: outcomes.reduce(
        (sum: number, outcome: RefreshOutcome): number => sum + outcome.refreshed,
        0,
      ),
      failures: outcomes.flatMap(
        (outcome: RefreshOutcome): SeoRefreshFailure[] => outcome.failures,
      ),
    };
  }

  /**
   * Method byRange
   * @method byRange
   *
   * @description
   * Fetches the report of every range of Search Console or GA4, one range after the other.
   *
   * @param {'search-console' | 'analytics'} source - Source to fetch.
   * @param {number} lagDays - Days between today and the last reported day.
   * @returns {Promise<RefreshOutcome>} Outcome.
   */
  private async byRange(
    source: 'search-console' | 'analytics',
    lagDays: number,
  ): Promise<RefreshOutcome> {
    const outcome: RefreshOutcome = { refreshed: 0, failures: [] };
    const fetch: ((window: ReportWindow) => Promise<SeoReport>) | null = this.fetcherOf(source);
    if (fetch === null) return outcome;
    for (const range of SEO_RANGES) {
      try {
        const report: SeoReport = await fetch(reportWindow(range, this.clock.now(), lagDays));
        await this.store.saveReport(report, this.clock.now());
        outcome.refreshed += 1;
      } catch (error: unknown) {
        const failure: SeoSourceFailure = failureOf(error);
        await this.store.saveFailure(source, range, failure, this.clock.now());
        outcome.failures.push({ source, range, code: failure.code });
      }
    }
    return outcome;
  }

  /**
   * Method fetcherOf
   * @method fetcherOf
   *
   * @description
   * Returns the function fetching one window of a configured source into a cache entry.
   *
   * @param {'search-console' | 'analytics'} source - Source.
   * @returns {((window: ReportWindow) => Promise<SeoReport>) | null} Fetcher, or `null` when the
   * source is not configured.
   */
  private fetcherOf(
    source: 'search-console' | 'analytics',
  ): ((window: ReportWindow) => Promise<SeoReport>) | null {
    if (source === 'search-console') {
      const reader: SearchConsoleReader | null = readerOf(this.sources.searchConsole);
      return reader === null
        ? null
        : async (window: ReportWindow): Promise<SeoReport> => ({
            source,
            range: window.range,
            data: { ...(await reader.report(window)), window },
          });
    }
    const reader: AnalyticsReader | null = readerOf(this.sources.analytics);
    return reader === null
      ? null
      : async (window: ReportWindow): Promise<SeoReport> => ({
          source,
          range: window.range,
          data: { ...(await reader.report(window)), window },
        });
  }

  /**
   * Method webVitals
   * @method webVitals
   *
   * @description
   * Measures every key URL on mobile and desktop concurrently. The report keeps the failed runs
   * beside the others; only when every run failed is the attempt stored as a failure (the first one).
   *
   * @returns {Promise<RefreshOutcome>} Outcome.
   */
  private async webVitals(): Promise<RefreshOutcome> {
    const reader: WebVitalsReader | null = readerOf(this.sources.webVitals);
    if (reader === null) return { refreshed: 0, failures: [] };
    const urls: readonly string[] =
      this.options.webVitalsUrls.length > 0
        ? this.options.webVitalsUrls
        : defaultWebVitalsUrls(this.options.siteOrigin, await this.projects.list());
    const rows: WebVitalsRow[] = await Promise.all(
      urls.flatMap((url: string): Promise<WebVitalsRow>[] =>
        PAGE_SPEED_STRATEGIES.map(async (strategy: PageSpeedStrategy): Promise<WebVitalsRow> => {
          try {
            return { url, strategy, measure: await reader.measure(url, strategy), failure: null };
          } catch (error: unknown) {
            return { url, strategy, measure: null, failure: failureOf(error) };
          }
        }),
      ),
    );
    const first: SeoSourceFailure | null =
      rows.find((row: WebVitalsRow): boolean => row.measure !== null) === undefined
        ? (rows[0]?.failure ?? null)
        : null;
    if (first !== null) {
      await this.store.saveFailure('web-vitals', null, first, this.clock.now());
      return { refreshed: 0, failures: [{ source: 'web-vitals', range: null, code: first.code }] };
    }
    await this.store.saveReport(
      { source: 'web-vitals', range: null, data: { rows } },
      this.clock.now(),
    );
    return { refreshed: 1, failures: [] };
  }
  // #endregion
}
