import type {
  SearchConsoleReader,
  SearchConsoleReport,
  SearchDay,
  SearchMetrics,
  SearchRow,
} from '@vfortin/content-application';
import { type DateSpan, type ReportWindow, spanDays } from '@vfortin/content-domain';
import type { GoogleAccessTokens } from '@internal/content-adapters-out/lib/seo/google-credentials/google-service-account';
import {
  field,
  finite,
  googleJson,
  invalid,
  list,
  round,
} from '@internal/content-adapters-out/lib/seo/google-http/google-http';

/**
 * Constant SERVICE
 *
 * @description
 * Service name of the failure messages.
 */
const SERVICE: string = 'Search Console';

/**
 * Constant TOP_ROWS
 *
 * @description
 * Queries and pages listed by the dashboard.
 */
const TOP_ROWS: number = 20;

/**
 * Interface GoogleSearchConsoleOptions
 * @interface GoogleSearchConsoleOptions
 *
 * @description
 * Property and transport of the Search Console reader.
 */
export interface GoogleSearchConsoleOptions {
  // #region Properties
  /**
   * Property property
   * @readonly
   *
   * @description
   * Search Console property: `sc-domain:<domain>` or a URL prefix ending with `/`.
   */
  readonly property: string;

  /**
   * Property tokens
   * @readonly
   *
   * @description
   * Access tokens of the service account, which the property lists as a user.
   */
  readonly tokens: GoogleAccessTokens;

  /**
   * Property fetcher
   * @readonly
   *
   * @description
   * HTTP implementation, the global `fetch` by default.
   */
  readonly fetcher?: typeof fetch;

  /**
   * Property baseUrl
   * @readonly
   *
   * @description
   * API origin, `https://searchconsole.googleapis.com` by default.
   */
  readonly baseUrl?: string;

  /**
   * Property timeoutMs
   * @readonly
   *
   * @description
   * Longest wait per request, 30 seconds by default.
   */
  readonly timeoutMs?: number;
  // #endregion
}

/**
 * Type Dimension
 *
 * @description
 * Search Console grouping dimension used by the dashboard.
 */
type Dimension = 'date' | 'query' | 'page' | 'device';

/**
 * Type Rows
 *
 * @description
 * Rows of one response.
 */
type Rows = readonly unknown[];

/**
 * Function metricsOf
 *
 * @description
 * Reads the figures of one response row; CTR is bounded to 1 and figures are rounded.
 *
 * @param {unknown} row - Response row.
 * @returns {SearchMetrics} Figures.
 */
function metricsOf(row: unknown): SearchMetrics {
  return {
    clicks: Math.round(finite(field(row, 'clicks'), SERVICE, 'clicks')),
    impressions: Math.round(finite(field(row, 'impressions'), SERVICE, 'impressions')),
    ctr: Math.min(1, round(finite(field(row, 'ctr'), SERVICE, 'ctr'), 4)),
    position: round(finite(field(row, 'position'), SERVICE, 'position'), 2),
  };
}

/**
 * Function keyOf
 *
 * @description
 * Reads the first dimension value of a row.
 *
 * @param {unknown} row - Response row.
 * @returns {string} Dimension value.
 */
function keyOf(row: unknown): string {
  const [key] = list(row, 'keys', SERVICE);
  if (typeof key !== 'string') throw invalid(SERVICE, 'row key');
  return key;
}

/**
 * Constant NO_METRICS
 *
 * @description
 * Figures of a period or day without data.
 */
const NO_METRICS: SearchMetrics = { clicks: 0, impressions: 0, ctr: 0, position: 0 };

/**
 * Class GoogleSearchConsoleReader
 * @class GoogleSearchConsoleReader
 *
 * @description
 * Search Console performance through `searchAnalytics.query` (web search, final data), six queries per
 * window sent concurrently: totals of both periods, then the current period by day, query, page and
 * device.
 */
export class GoogleSearchConsoleReader implements SearchConsoleReader {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores the property and the transport.
   *
   * @param {GoogleSearchConsoleOptions} options - Reader settings.
   */
  public constructor(private readonly options: GoogleSearchConsoleOptions) {}
  // #endregion

  // #region Methods
  /**
   * Method report
   * @method report
   *
   * @description
   * Fetches the report of a window; days without data appear as zeros.
   *
   * @param {ReportWindow} window - Reported days and the period before.
   * @returns {Promise<SearchConsoleReport>} Report.
   */
  public async report(window: ReportWindow): Promise<SearchConsoleReport> {
    const [totals, previous, days, queries, pages, devices]: [Rows, Rows, Rows, Rows, Rows, Rows] =
      await Promise.all([
        this.query(window.current, [], 1),
        this.query(window.previous, [], 1),
        this.query(window.current, ['date'], 500),
        this.query(window.current, ['query'], TOP_ROWS),
        this.query(window.current, ['page'], TOP_ROWS),
        this.query(window.current, ['device'], 10),
      ]);
    const byDay: Map<string, SearchMetrics> = new Map<string, SearchMetrics>(
      days.map((row: unknown): [string, SearchMetrics] => [keyOf(row), metricsOf(row)]),
    );
    const rows = (source: Rows): SearchRow[] =>
      source.map((row: unknown): SearchRow => ({ key: keyOf(row), ...metricsOf(row) }));
    return {
      totals: totals[0] === undefined ? NO_METRICS : metricsOf(totals[0]),
      previous: previous[0] === undefined ? NO_METRICS : metricsOf(previous[0]),
      daily: spanDays(window.current).map((date: string): SearchDay => ({
        date,
        ...(byDay.get(date) ?? NO_METRICS),
      })),
      queries: rows(queries),
      pages: rows(pages),
      devices: rows(devices),
    };
  }

  /**
   * Method query
   * @method query
   *
   * @description
   * Sends one `searchAnalytics.query` request.
   *
   * @param {DateSpan} span - Days queried.
   * @param {readonly Dimension[]} dimensions - Grouping, none for the totals.
   * @param {number} rowLimit - Most rows returned (sorted by clicks).
   * @returns {Promise<Rows>} Response rows, empty without data.
   */
  private async query(
    span: DateSpan,
    dimensions: readonly Dimension[],
    rowLimit: number,
  ): Promise<Rows> {
    const token: string = await this.options.tokens.token();
    const base: string = this.options.baseUrl ?? 'https://searchconsole.googleapis.com';
    const body: unknown = await googleJson(
      `${base}/webmasters/v3/sites/${encodeURIComponent(this.options.property)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          startDate: span.start,
          endDate: span.end,
          dimensions,
          type: 'web',
          dataState: 'final',
          rowLimit,
        }),
      },
      {
        service: SERVICE,
        fetcher: this.options.fetcher ?? fetch,
        timeoutMs: this.options.timeoutMs ?? 30_000,
        secrets: [token],
      },
    );
    return list(body, 'rows', SERVICE);
  }
  // #endregion
}
