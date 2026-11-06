import { SeoSourceError, type SearchConsoleReport } from '@vfortin/content-application';
import { type ReportWindow, reportWindow } from '@vfortin/content-domain';
import { GoogleSearchConsoleReader } from '@internal/content-adapters-out/lib/seo/search-console/search-console.reader';
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
 * Seven days ending on 1 November 2026.
 */
const WINDOW: ReportWindow = reportWindow('7d', new Date('2026-11-04T05:30:00Z'), 3);

/**
 * Function rowsFor
 *
 * @description
 * Answers each Search Console query according to its dimensions.
 *
 * @param {RecordedRequest} request - Received query.
 * @returns {FakeReply} Reply.
 */
function rowsFor(request: RecordedRequest): FakeReply {
  const body: { startDate: string; dimensions: string[] } = request.body as {
    startDate: string;
    dimensions: string[];
  };
  switch (body.dimensions[0]) {
    case undefined:
      return body.startDate === WINDOW.current.start
        ? { json: { rows: [{ clicks: 12, impressions: 400, ctr: 0.03, position: 9.256 }] } }
        : { json: {} };
    case 'date':
      return {
        json: {
          rows: [{ keys: ['2026-10-27'], clicks: 3, impressions: 50, ctr: 0.06, position: 8 }],
        },
      };
    case 'query':
      return {
        json: {
          rows: [
            { keys: ['morgan exemple'], clicks: 9, impressions: 20, ctr: 0.45, position: 1.2 },
          ],
        },
      };
    default:
      return {
        json: {
          rows: [{ keys: ['MOBILE'], clicks: 4, impressions: 100, ctr: 0.04, position: 11 }],
        },
      };
  }
}

describe('GoogleSearchConsoleReader', (): void => {
  const server: FakeGoogleServer = new FakeGoogleServer();
  let origin: string;

  beforeAll(async (): Promise<void> => {
    origin = await server.start();
  });

  afterAll(async (): Promise<void> => {
    await server.stop();
  });

  beforeEach((): void => {
    server.requests.length = 0;
    server.handler = rowsFor;
  });

  const reader = (timeoutMs?: number): GoogleSearchConsoleReader =>
    new GoogleSearchConsoleReader({
      property: 'sc-domain:valentin-fortin.pro',
      tokens: fakeTokens,
      baseUrl: origin,
      ...(timeoutMs === undefined ? {} : { timeoutMs }),
    });

  it('queries both periods and the current one by day, query, page and device', async (): Promise<void> => {
    const report: SearchConsoleReport = await reader().report(WINDOW);
    expect(server.requests).toHaveLength(6);
    for (const request of server.requests) {
      expect(request.method).toBe('POST');
      expect(request.url).toBe(
        '/webmasters/v3/sites/sc-domain%3Avalentin-fortin.pro/searchAnalytics/query',
      );
      expect(request.headers.authorization).toBe(`Bearer ${FAKE_TOKEN}`);
    }
    expect(server.requests.map((request: RecordedRequest): unknown => request.body)).toEqual([
      {
        startDate: '2026-10-26',
        endDate: '2026-11-01',
        dimensions: [],
        type: 'web',
        dataState: 'final',
        rowLimit: 1,
      },
      expect.objectContaining({ startDate: '2026-10-19', endDate: '2026-10-25', dimensions: [] }),
      expect.objectContaining({ dimensions: ['date'], rowLimit: 500 }),
      expect.objectContaining({ dimensions: ['query'], rowLimit: 20 }),
      expect.objectContaining({ dimensions: ['page'], rowLimit: 20 }),
      expect.objectContaining({ dimensions: ['device'], rowLimit: 10 }),
    ]);
    expect(report.totals).toEqual({ clicks: 12, impressions: 400, ctr: 0.03, position: 9.26 });
    // No row for the previous period: zeros.
    expect(report.previous).toEqual({ clicks: 0, impressions: 0, ctr: 0, position: 0 });
    expect(report.daily).toHaveLength(7);
    expect(report.daily[0]).toEqual({
      date: '2026-10-26',
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    });
    expect(report.daily[1]).toEqual({
      date: '2026-10-27',
      clicks: 3,
      impressions: 50,
      ctr: 0.06,
      position: 8,
    });
    expect(report.queries).toEqual([
      { key: 'morgan exemple', clicks: 9, impressions: 20, ctr: 0.45, position: 1.2 },
    ]);
    expect(report.devices[0]?.key).toBe('MOBILE');
  });

  it('reports a refusal with Google message but without the token', async (): Promise<void> => {
    server.handler = (): FakeReply => ({
      status: 403,
      json: {
        error: {
          code: 403,
          status: 'PERMISSION_DENIED',
          message: `User does not have sufficient permission for site sc-domain:valentin-fortin.pro (token ${FAKE_TOKEN}).`,
        },
      },
    });
    const error: unknown = await reader()
      .report(WINDOW)
      .catch((rejection: unknown): unknown => rejection);
    expect(error).toBeInstanceOf(SeoSourceError);
    expect((error as SeoSourceError).reason).toBe('permission-denied');
    expect((error as SeoSourceError).message).toBe(
      'Search Console refused the request (HTTP 403): PERMISSION_DENIED: User does not have sufficient permission for site sc-domain:valentin-fortin.pro (token [redacted]).',
    );
  });

  it.each([
    [404, 'not-found'],
    [429, 'quota-exceeded'],
    [503, 'upstream'],
    [400, 'bad-request'],
    [401, 'credentials-rejected'],
    [418, 'unexpected'],
  ])('maps HTTP %i to %s', async (status: number, reason: string): Promise<void> => {
    server.handler = (): FakeReply => ({ status, raw: 'not json' });
    await expect(reader().report(WINDOW)).rejects.toMatchObject({
      reason,
      message: `Search Console refused the request (HTTP ${status}).`,
    });
  });

  it('reports invalid JSON, unexpected rows and a timeout', async (): Promise<void> => {
    server.handler = (): FakeReply => ({ raw: '<html>' });
    await expect(reader().report(WINDOW)).rejects.toMatchObject({
      reason: 'invalid-response',
      message: 'Search Console answered with invalid JSON.',
    });
    server.handler = (): FakeReply => ({ json: { rows: 'none' } });
    await expect(reader().report(WINDOW)).rejects.toMatchObject({ reason: 'invalid-response' });
    server.handler = (): FakeReply => ({ json: { rows: [{ keys: [1], clicks: 1 }] } });
    await expect(reader().report(WINDOW)).rejects.toMatchObject({ reason: 'invalid-response' });
    server.handler = (): FakeReply => ({ json: {}, delayMs: 300 });
    await expect(reader(50).report(WINDOW)).rejects.toMatchObject({
      reason: 'timeout',
      message: 'Search Console did not answer within 1 s.',
    });
  });

  it('calls the production API by default', async (): Promise<void> => {
    const urls: string[] = [];
    const stub: typeof fetch = async (input: string | URL | Request): Promise<Response> => {
      urls.push(String(input));
      return new Response('{}');
    };
    const report: SearchConsoleReport = await new GoogleSearchConsoleReader({
      property: 'https://valentin-fortin.pro/',
      tokens: fakeTokens,
      fetcher: stub,
    }).report(WINDOW);
    expect(new Set(urls)).toEqual(
      new Set([
        'https://searchconsole.googleapis.com/webmasters/v3/sites/https%3A%2F%2Fvalentin-fortin.pro%2F/searchAnalytics/query',
      ]),
    );
    expect(report.queries).toEqual([]);
  });

  it('reports an unreachable API', async (): Promise<void> => {
    const offline: GoogleSearchConsoleReader = new GoogleSearchConsoleReader({
      property: 'https://valentin-fortin.pro/',
      tokens: fakeTokens,
      baseUrl: 'http://127.0.0.1:9',
    });
    await expect(offline.report(WINDOW)).rejects.toMatchObject({
      reason: 'network',
      message: 'Search Console could not be reached.',
    });
  });
});
