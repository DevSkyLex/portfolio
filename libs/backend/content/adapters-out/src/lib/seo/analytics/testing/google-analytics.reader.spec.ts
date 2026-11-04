import type { AnalyticsReport } from '@vfortin/content-application';
import { type ReportWindow, reportWindow } from '@vfortin/content-domain';
import { GoogleAnalyticsReader } from '@internal/content-adapters-out/lib/seo/analytics/google-analytics.reader';
import {
  FAKE_TOKEN,
  type FakeReply,
  FakeGoogleServer,
  type RecordedRequest,
  fakeTokens,
} from '@internal/content-adapters-out/lib/seo/testing/fake-google.fakes';

/**
 * Constant WINDOW
 *
 * @description
 * Seven days ending on 3 November 2026.
 */
const WINDOW: ReportWindow = reportWindow('7d', new Date('2026-11-04T05:30:00Z'), 1);

/**
 * Interface RunReportBody
 *
 * @description
 * Fields of a `runReport` body read by the fake server.
 */
interface RunReportBody {
  readonly dateRanges: { startDate: string; endDate: string }[];
  readonly dimensions: { name: string }[];
}

/**
 * Function row
 *
 * @description
 * Builds a Data API row.
 *
 * @param {readonly string[]} dimensions - Dimension values.
 * @param {readonly string[]} metrics - Metric values, as GA4 sends them (strings).
 * @returns {unknown} Row.
 */
function row(dimensions: readonly string[], metrics: readonly string[]): unknown {
  return {
    dimensionValues: dimensions.map((value: string): { value: string } => ({ value })),
    metricValues: metrics.map((value: string): { value: string } => ({ value })),
  };
}

/**
 * Function reportFor
 *
 * @description
 * Answers each report according to its dimension and period.
 *
 * @param {RecordedRequest} request - Received request.
 * @returns {FakeReply} Reply.
 */
function reportFor(request: RecordedRequest): FakeReply {
  const body: RunReportBody = request.body as RunReportBody;
  switch (body.dimensions[0]?.name) {
    case undefined:
      return body.dateRanges[0]?.startDate === WINDOW.current.start
        ? { json: { rows: [row([], ['40', '52', '130', '0.615384', '2981'])] } }
        : { json: { rowCount: 0 } };
    case 'date':
      return { json: { rows: [row(['20261029'], ['5', '6', '14'])] } };
    case 'pagePath':
      return { json: { rows: [row(['/'], ['80', '33'])] } };
    case 'sessionDefaultChannelGroup':
      return {
        json: { rows: [row(['Organic Search'], ['30', '25']), row(['Direct'], ['22', '20'])] },
      };
    default:
      return { json: { rows: [row(['France'], ['45', '35'])] } };
  }
}

describe('GoogleAnalyticsReader', (): void => {
  const server: FakeGoogleServer = new FakeGoogleServer();
  let reader: GoogleAnalyticsReader;

  beforeAll(async (): Promise<void> => {
    reader = new GoogleAnalyticsReader({
      propertyId: '123456789',
      tokens: fakeTokens,
      baseUrl: await server.start(),
    });
  });

  afterAll(async (): Promise<void> => {
    await server.stop();
  });

  beforeEach((): void => {
    server.requests.length = 0;
    server.handler = reportFor;
  });

  it('runs the six reports of a window and converts them', async (): Promise<void> => {
    const report: AnalyticsReport = await reader.report(WINDOW);
    expect(server.requests).toHaveLength(6);
    expect(new Set(server.requests.map((request: RecordedRequest): string => request.url))).toEqual(
      new Set(['/v1beta/properties/123456789:runReport']),
    );
    expect(server.requests[0]?.headers.authorization).toBe(`Bearer ${FAKE_TOKEN}`);
    expect(server.requests[0]?.body).toEqual({
      dateRanges: [{ startDate: '2026-10-28', endDate: '2026-11-03' }],
      dimensions: [],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'engagementRate' },
        { name: 'userEngagementDuration' },
      ],
    });
    expect(server.requests[2]?.body).toMatchObject({
      dimensions: [{ name: 'date' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
      limit: 500,
    });
    expect(server.requests[5]?.body).toMatchObject({
      dimensions: [{ name: 'country' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    });
    expect(report.totals).toEqual({
      activeUsers: 40,
      sessions: 52,
      views: 130,
      engagementRate: 0.6154,
      averageEngagementSeconds: 74.5,
    });
    expect(report.previous).toEqual({
      activeUsers: 0,
      sessions: 0,
      views: 0,
      engagementRate: 0,
      averageEngagementSeconds: 0,
    });
    expect(report.daily).toHaveLength(7);
    expect(report.daily[1]).toEqual({ date: '2026-10-29', activeUsers: 5, sessions: 6, views: 14 });
    expect(report.daily[0]).toEqual({ date: '2026-10-28', activeUsers: 0, sessions: 0, views: 0 });
    expect(report.pages).toEqual([{ path: '/', views: 80, activeUsers: 33 }]);
    expect(report.channels).toEqual([
      { key: 'Organic Search', sessions: 30, activeUsers: 25 },
      { key: 'Direct', sessions: 22, activeUsers: 20 },
    ]);
    expect(report.countries).toEqual([{ key: 'France', sessions: 45, activeUsers: 35 }]);
  });

  it('refuses a malformed date or metric', async (): Promise<void> => {
    server.handler = (request: RecordedRequest): FakeReply =>
      (request.body as RunReportBody).dimensions[0]?.name === 'date'
        ? { json: { rows: [row(['2026-10-29'], ['1', '1', '1'])] } }
        : reportFor(request);
    await expect(reader.report(WINDOW)).rejects.toMatchObject({
      reason: 'invalid-response',
      message: 'Google Analytics answered an unexpected date.',
    });
    server.handler = (): FakeReply => ({ json: { rows: [row([], ['many'])] } });
    await expect(reader.report(WINDOW)).rejects.toMatchObject({ reason: 'invalid-response' });
  });

  it('calls the production API by default and tolerates short rows', async (): Promise<void> => {
    const urls: string[] = [];
    const stub: typeof fetch = async (
      input: string | URL | Request,
      init?: RequestInit,
    ): Promise<Response> => {
      urls.push(String(input));
      const dimension: string | undefined = (JSON.parse(String(init?.body)) as RunReportBody)
        .dimensions[0]?.name;
      const rows: unknown[] =
        dimension === 'pagePath'
          ? [
              { dimensionValues: [{ value: 7 }], metricValues: [] },
              { metricValues: [{ value: '3' }] },
            ]
          : dimension === 'date'
            ? [{ dimensionValues: [{ value: '20261029' }], metricValues: [] }]
            : [];
      return new Response(JSON.stringify({ rows }));
    };
    const report: AnalyticsReport = await new GoogleAnalyticsReader({
      propertyId: '123456789',
      tokens: fakeTokens,
      fetcher: stub,
    }).report(WINDOW);
    expect(new Set(urls)).toEqual(
      new Set(['https://analyticsdata.googleapis.com/v1beta/properties/123456789:runReport']),
    );
    expect(report.pages).toEqual([
      { path: '', views: 0, activeUsers: 0 },
      { path: '', views: 3, activeUsers: 0 },
    ]);
    expect(report.daily[1]).toEqual({ date: '2026-10-29', activeUsers: 0, sessions: 0, views: 0 });
    expect(report.totals.averageEngagementSeconds).toBe(0);
  });

  it('reports a disabled API as a missing permission', async (): Promise<void> => {
    server.handler = (): FakeReply => ({
      status: 403,
      json: {
        error: {
          status: 'PERMISSION_DENIED',
          message:
            'Google Analytics Data API has not been used in project 42 before or it is disabled.',
        },
      },
    });
    await expect(reader.report(WINDOW)).rejects.toMatchObject({
      reason: 'permission-denied',
      message:
        'Google Analytics refused the request (HTTP 403): PERMISSION_DENIED: Google Analytics Data API has not been used in project 42 before or it is disabled.',
    });
  });
});
