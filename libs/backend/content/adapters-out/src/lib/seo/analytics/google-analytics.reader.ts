import type {
  AnalyticsReader,
  AnalyticsReport,
  AudienceDay,
  AudiencePage,
  AudienceShare,
  AudienceTotals,
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
const SERVICE: string = 'Google Analytics';

/**
 * Constant TOTAL_METRICS
 *
 * @description
 * Metrics of the period totals, in the order of `metricValues`.
 */
const TOTAL_METRICS: readonly string[] = [
  'activeUsers',
  'sessions',
  'screenPageViews',
  'engagementRate',
  'userEngagementDuration',
];

/**
 * Interface GoogleAnalyticsOptions
 * @interface GoogleAnalyticsOptions
 *
 * @description
 * Property and transport of the GA4 reader.
 */
export interface GoogleAnalyticsOptions {
  // #region Properties
  /**
   * Property propertyId
   * @readonly
   *
   * @description
   * Numeric GA4 property identifier (not the `G-` measurement id).
   */
  readonly propertyId: string;

  /**
   * Property tokens
   * @readonly
   *
   * @description
   * Access tokens of the service account, which the property lists as a Viewer.
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
   * API origin, `https://analyticsdata.googleapis.com` by default.
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
 * Interface ReportRequest
 *
 * @description
 * Part of a Data API `RunReportRequest` built by this reader.
 */
interface ReportRequest {
  // #region Properties
  /**
   * Property span
   * @readonly
   *
   * @description
   * Days reported.
   */
  readonly span: DateSpan;

  /**
   * Property dimensions
   * @readonly
   *
   * @description
   * Dimension names, none for the totals.
   */
  readonly dimensions: readonly string[];

  /**
   * Property metrics
   * @readonly
   *
   * @description
   * Metric names.
   */
  readonly metrics: readonly string[];

  /**
   * Property orderBy
   * @readonly
   *
   * @description
   * Metric sorted descending, or `date` for the daily series (ascending).
   */
  readonly orderBy?: string;

  /**
   * Property limit
   * @readonly
   *
   * @description
   * Most rows returned.
   */
  readonly limit?: number;
  // #endregion
}

/**
 * Interface ReportRow
 *
 * @description
 * One parsed response row: its dimension values and numeric metric values.
 */
interface ReportRow {
  // #region Properties
  /**
   * Property dimensions
   * @readonly
   *
   * @description
   * Dimension values in request order.
   */
  readonly dimensions: readonly string[];

  /**
   * Property metrics
   * @readonly
   *
   * @description
   * Metric values in request order.
   */
  readonly metrics: readonly number[];
  // #endregion
}

/**
 * Function valuesOf
 *
 * @description
 * Reads the `value` of each `{ value }` entry of a row.
 *
 * @param {unknown} row - Response row.
 * @param {string} key - `dimensionValues` or `metricValues`.
 * @returns {unknown[]} Values.
 */
function valuesOf(row: unknown, key: string): unknown[] {
  return list(row, key, SERVICE).map((entry: unknown): unknown => field(entry, 'value'));
}

/**
 * Function totalsOf
 *
 * @description
 * Converts the totals row (`TOTAL_METRICS` order) into audience figures; the average engagement time
 * is the engagement duration per active user, as GA4 shows it.
 *
 * @param {ReportRow | undefined} row - Totals row, absent without data.
 * @returns {AudienceTotals} Figures.
 */
function totalsOf(row: ReportRow | undefined): AudienceTotals {
  const [activeUsers = 0, sessions = 0, views = 0, engagementRate = 0, duration = 0] =
    row?.metrics ?? [];
  return {
    activeUsers: Math.round(activeUsers),
    sessions: Math.round(sessions),
    views: Math.round(views),
    engagementRate: Math.min(1, round(engagementRate, 4)),
    averageEngagementSeconds: activeUsers > 0 ? round(duration / activeUsers, 1) : 0,
  };
}

/**
 * Function shareOf
 *
 * @description
 * Converts a `[dimension] × [sessions, activeUsers]` row.
 *
 * @param {ReportRow} row - Row.
 * @returns {AudienceShare} Share.
 */
function shareOf(row: ReportRow): AudienceShare {
  return {
    key: row.dimensions[0] ?? '',
    sessions: Math.round(row.metrics[0] ?? 0),
    activeUsers: Math.round(row.metrics[1] ?? 0),
  };
}

/**
 * Class GoogleAnalyticsReader
 * @class GoogleAnalyticsReader
 *
 * @description
 * GA4 audience through the Data API `runReport`, six reports per window sent concurrently (under the
 * property's ten concurrent requests): totals of both periods, then the current period by day, page,
 * default channel group and country.
 */
export class GoogleAnalyticsReader implements AnalyticsReader {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores the property and the transport.
   *
   * @param {GoogleAnalyticsOptions} options - Reader settings.
   */
  public constructor(private readonly options: GoogleAnalyticsOptions) {}
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
   * @returns {Promise<AnalyticsReport>} Report.
   */
  public async report(window: ReportWindow): Promise<AnalyticsReport> {
    const current: DateSpan = window.current;
    const [totals, previous, days, pages, channels, countries]: [
      ReportRow[],
      ReportRow[],
      ReportRow[],
      ReportRow[],
      ReportRow[],
      ReportRow[],
    ] = await Promise.all([
      this.run({ span: current, dimensions: [], metrics: TOTAL_METRICS }),
      this.run({ span: window.previous, dimensions: [], metrics: TOTAL_METRICS }),
      this.run({
        span: current,
        dimensions: ['date'],
        metrics: ['activeUsers', 'sessions', 'screenPageViews'],
        orderBy: 'date',
        limit: 500,
      }),
      this.run({
        span: current,
        dimensions: ['pagePath'],
        metrics: ['screenPageViews', 'activeUsers'],
        orderBy: 'screenPageViews',
        limit: 20,
      }),
      this.run({
        span: current,
        dimensions: ['sessionDefaultChannelGroup'],
        metrics: ['sessions', 'activeUsers'],
        orderBy: 'sessions',
        limit: 25,
      }),
      this.run({
        span: current,
        dimensions: ['country'],
        metrics: ['sessions', 'activeUsers'],
        orderBy: 'sessions',
        limit: 10,
      }),
    ]);
    const byDay: Map<string, ReportRow> = new Map<string, ReportRow>(
      days.map((row: ReportRow): [string, ReportRow] => {
        const day: string = row.dimensions[0] ?? '';
        if (!/^\d{8}$/.test(day)) throw invalid(SERVICE, 'date');
        return [`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6)}`, row];
      }),
    );
    return {
      totals: totalsOf(totals[0]),
      previous: totalsOf(previous[0]),
      daily: spanDays(current).map((date: string): AudienceDay => {
        const row: ReportRow | undefined = byDay.get(date);
        return {
          date,
          activeUsers: Math.round(row?.metrics[0] ?? 0),
          sessions: Math.round(row?.metrics[1] ?? 0),
          views: Math.round(row?.metrics[2] ?? 0),
        };
      }),
      pages: pages.map((row: ReportRow): AudiencePage => ({
        path: row.dimensions[0] ?? '',
        views: Math.round(row.metrics[0] ?? 0),
        activeUsers: Math.round(row.metrics[1] ?? 0),
      })),
      channels: channels.map(shareOf),
      countries: countries.map(shareOf),
    };
  }

  /**
   * Method run
   * @method run
   *
   * @description
   * Sends one `runReport` request and parses its rows.
   *
   * @param {ReportRequest} request - Report definition.
   * @returns {Promise<ReportRow[]>} Rows, empty without data.
   */
  private async run(request: ReportRequest): Promise<ReportRow[]> {
    const token: string = await this.options.tokens.token();
    const base: string = this.options.baseUrl ?? 'https://analyticsdata.googleapis.com';
    const body: unknown = await googleJson(
      `${base}/v1beta/properties/${encodeURIComponent(this.options.propertyId)}:runReport`,
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: request.span.start, endDate: request.span.end }],
          dimensions: request.dimensions.map((name: string): { name: string } => ({ name })),
          metrics: request.metrics.map((name: string): { name: string } => ({ name })),
          ...(request.orderBy === undefined
            ? {}
            : {
                orderBys: [
                  request.orderBy === 'date'
                    ? { dimension: { dimensionName: 'date' } }
                    : { metric: { metricName: request.orderBy }, desc: true },
                ],
              }),
          ...(request.limit === undefined ? {} : { limit: request.limit }),
        }),
      },
      {
        service: SERVICE,
        fetcher: this.options.fetcher ?? fetch,
        timeoutMs: this.options.timeoutMs ?? 30_000,
        secrets: [token],
      },
    );
    return list(body, 'rows', SERVICE).map((row: unknown): ReportRow => ({
      dimensions: valuesOf(row, 'dimensionValues').map((value: unknown): string =>
        typeof value === 'string' ? value : '',
      ),
      metrics: valuesOf(row, 'metricValues').map((value: unknown): number =>
        finite(value, SERVICE, 'metric value'),
      ),
    }));
  }
  // #endregion
}
