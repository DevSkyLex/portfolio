import type { WebVitalsMeasure } from '@vfortin/content-application';
import { PageSpeedWebVitalsReader } from '@internal/content-adapters-out/lib/seo/page-speed/page-speed.reader';
import {
  type FakeReply,
  FakeGoogleServer,
} from '@internal/content-adapters-out/lib/seo/testing/fake-google.fakes';

/**
 * Constant KEY
 *
 * @description
 * API key of the tests, shaped like a Google one.
 */
const KEY: string = 'AIzaSyFakeKeyForTheDashboardTests0000';

/**
 * Constant LIGHTHOUSE
 *
 * @description
 * Lighthouse part of a PageSpeed Insights response.
 */
const LIGHTHOUSE: unknown = {
  categories: { performance: { score: 0.914 } },
  audits: {
    'largest-contentful-paint': { numericValue: 2381.6 },
    'cumulative-layout-shift': { numericValue: 0.00412 },
    'total-blocking-time': { numericValue: 118.2 },
  },
};

describe('PageSpeedWebVitalsReader', (): void => {
  const server: FakeGoogleServer = new FakeGoogleServer();
  let reader: PageSpeedWebVitalsReader;

  beforeAll(async (): Promise<void> => {
    reader = new PageSpeedWebVitalsReader({ apiKey: KEY, baseUrl: await server.start() });
  });

  afterAll(async (): Promise<void> => {
    await server.stop();
  });

  beforeEach((): void => {
    server.requests.length = 0;
  });

  it('reads the URL field data and the Lighthouse run', async (): Promise<void> => {
    server.handler = (): FakeReply => ({
      json: {
        loadingExperience: {
          metrics: {
            LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2100, category: 'FAST' },
            INTERACTION_TO_NEXT_PAINT: { percentile: 260, category: 'AVERAGE' },
            CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 31, category: 'SLOW' },
          },
        },
        lighthouseResult: LIGHTHOUSE,
      },
    });
    const measure: WebVitalsMeasure = await reader.measure(
      'https://valentin-fortin.pro/',
      'mobile',
    );
    const url: URL = new URL(server.requests[0]?.url ?? '', 'http://localhost');
    expect(url.pathname).toBe('/pagespeedonline/v5/runPagespeed');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      url: 'https://valentin-fortin.pro/',
      strategy: 'mobile',
      category: 'performance',
      key: KEY,
    });
    expect(measure).toEqual({
      field: {
        scope: 'url',
        lcp: { p75: 2100, category: 'good' },
        inp: { p75: 260, category: 'needs-improvement' },
        cls: { p75: 0.31, category: 'poor' },
      },
      lab: { performanceScore: 91, lcpMs: 2382, cls: 0.004, tbtMs: 118 },
    });
  });

  it('falls back on the origin data and computes missing categories', async (): Promise<void> => {
    server.handler = (): FakeReply => ({
      json: {
        loadingExperience: { id: 'https://valentin-fortin.pro/en/', initial_url: 'x' },
        originLoadingExperience: {
          metrics: {
            LARGEST_CONTENTFUL_PAINT_MS: { percentile: 4100 },
            CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 5 },
          },
        },
        lighthouseResult: { categories: { performance: { score: null } }, audits: {} },
      },
    });
    expect(await reader.measure('https://valentin-fortin.pro/en/', 'desktop')).toEqual({
      field: {
        scope: 'origin',
        lcp: { p75: 4100, category: 'poor' },
        inp: null,
        cls: { p75: 0.05, category: 'good' },
      },
      lab: { performanceScore: null, lcpMs: null, cls: null, tbtMs: null },
    });
    server.handler = (): FakeReply => ({
      json: {
        loadingExperience: {
          origin_fallback: true,
          metrics: { INTERACTION_TO_NEXT_PAINT: { percentile: 350 } },
        },
        lighthouseResult: LIGHTHOUSE,
      },
    });
    expect((await reader.measure('https://valentin-fortin.pro/', 'mobile')).field).toEqual({
      scope: 'origin',
      lcp: null,
      inp: { p75: 350, category: 'needs-improvement' },
      cls: null,
    });
  });

  it('reports no field data for a URL CrUX does not know', async (): Promise<void> => {
    server.handler = (): FakeReply => ({ json: { lighthouseResult: LIGHTHOUSE } });
    expect(
      (await reader.measure('https://valentin-fortin.pro/projects/library-trails', 'mobile')).field,
    ).toBeNull();
  });

  it('calls the production API by default', async (): Promise<void> => {
    const urls: string[] = [];
    const stub: typeof fetch = async (input: string | URL | Request): Promise<Response> => {
      urls.push(String(input));
      return new Response(
        JSON.stringify({ lighthouseResult: { categories: { performance: { score: 1 } } } }),
      );
    };
    const measure: WebVitalsMeasure = await new PageSpeedWebVitalsReader({
      apiKey: KEY,
      fetcher: stub,
    }).measure('https://valentin-fortin.pro/', 'desktop');
    expect(
      urls[0]?.startsWith('https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url='),
    ).toBe(true);
    expect(measure.lab.performanceScore).toBe(100);
  });

  it('never shows the key in a failure', async (): Promise<void> => {
    server.handler = (): FakeReply => ({
      status: 400,
      json: {
        error: {
          status: 'INVALID_ARGUMENT',
          message: `API key not valid. Please pass a valid API key. (key=${KEY})`,
        },
      },
    });
    const failure: unknown = await reader
      .measure('https://valentin-fortin.pro/', 'mobile')
      .catch((error: unknown): unknown => error);
    expect(failure).toMatchObject({ reason: 'credentials-rejected' });
    expect((failure as Error).message).not.toContain(KEY);
    expect((failure as Error).message).toContain('API key not valid');
  });
});
