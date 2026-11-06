import {
  LocalizedText,
  Project,
  ProjectPeriod,
  ProjectSeo,
  type ReportWindow,
  Slug,
} from '@vfortin/content-domain';
import {
  SeoRefreshTooSoonError,
  SeoSourceError,
} from '@internal/content-application/lib/errors/application-error';
import type { ProjectRepository } from '@internal/content-application/lib/ports/content/content.ports';
import type {
  AnalyticsReader,
  AnalyticsReport,
  PageSpeedStrategy,
  SearchConsoleReader,
  SearchConsoleReport,
  SearchMetrics,
  SeoSources,
  WebVitalsMeasure,
  WebVitalsReader,
  WebVitalsReport,
} from '@internal/content-application/lib/ports/seo-dashboard/seo-dashboard.ports';
import {
  GetSeoDashboard,
  type SeoDashboardView,
} from '@internal/content-application/lib/use-cases/get-seo-dashboard/get-seo-dashboard.use-case';
import {
  RefreshSeoDashboard,
  SEO_REFRESH_INTERVAL_MS,
  type SeoRefreshSummary,
  type SeoRefreshTicket,
  defaultWebVitalsUrls,
  failureOf,
} from '@internal/content-application/lib/use-cases/refresh-seo-dashboard/refresh-seo-dashboard.use-case';
import {
  FixedClock,
  InMemorySeoReportStore,
  articleDoc,
} from '@internal/content-application/lib/testing/content.fakes';

/**
 * Constant ORIGIN
 *
 * @description
 * Public origin of the fixtures.
 */
const ORIGIN: string = 'https://valentin-fortin.pro';

/**
 * Function text
 *
 * @description
 * Creates a bilingual value.
 *
 * @param {string} value - French and English text.
 * @returns {LocalizedText} Value.
 */
const text = (value: string): LocalizedText => LocalizedText.of('t', { fr: value, en: value });

/**
 * Function project
 *
 * @description
 * Builds a project with empty search texts.
 *
 * @param {string} slug - Slug and identifier.
 * @param {{ position: number; published: boolean; featured?: boolean }} options - Order and state.
 * @returns {Project} Project.
 */
function project(
  slug: string,
  options: { position: number; published: boolean; featured?: boolean },
): Project {
  return Project.rehydrate({
    id: slug,
    slug: Slug.of(slug),
    title: text(slug),
    summary: text('Résumé du projet'),
    lead: text('Intro'),
    period: ProjectPeriod.of({ start: { year: 2025, month: null }, end: null }),
    client: text('Client'),
    role: text('Rôle'),
    place: text('Lieu'),
    siteUrl: null,
    techs: ['angular'],
    featured: options.featured ?? false,
    position: options.position,
    status: options.published ? 'published' : 'draft',
    version: 1,
    article: { fr: articleDoc('Texte'), en: articleDoc('Text') },
    cover: null,
    seo: ProjectSeo.empty(),
  });
}

/**
 * Constant PROJECTS
 *
 * @description
 * Two published projects (the featured one later in the list) and a draft.
 */
const PROJECTS: readonly Project[] = [
  project('neighborhood-atlas', { position: 0, published: true }),
  project('library-trails', { position: 1, published: true, featured: true }),
  project('brouillon', { position: 2, published: false, featured: true }),
];

/**
 * Constant repository
 *
 * @description
 * Read-only project repository over `PROJECTS`.
 */
const repository: ProjectRepository = {
  list: async (): Promise<Project[]> => [...PROJECTS],
  get: async (): Promise<Project | null> => null,
  save: async (): Promise<number> => 1,
  insert: async (): Promise<void> => undefined,
};

/**
 * Function searchReport
 *
 * @description
 * Builds a Search Console report whose clicks name the window it was asked for.
 *
 * @param {ReportWindow} window - Requested window.
 * @returns {SearchConsoleReport} Report.
 */
function searchReport(window: ReportWindow): SearchConsoleReport {
  const totals: SearchMetrics = {
    clicks: Number(window.current.end.slice(-2)),
    impressions: 10,
    ctr: 0.1,
    position: 4,
  };
  return { totals, previous: totals, daily: [], queries: [], pages: [], devices: [] };
}

/**
 * Constant AUDIENCE
 *
 * @description
 * GA4 report of the fixtures.
 */
const AUDIENCE: AnalyticsReport = {
  totals: {
    activeUsers: 3,
    sessions: 4,
    views: 9,
    engagementRate: 0.5,
    averageEngagementSeconds: 30,
  },
  previous: {
    activeUsers: 1,
    sessions: 1,
    views: 2,
    engagementRate: 1,
    averageEngagementSeconds: 12,
  },
  daily: [],
  pages: [],
  channels: [],
  countries: [],
};

/**
 * Constant MEASURE
 *
 * @description
 * PageSpeed Insights measure of the fixtures.
 */
const MEASURE: WebVitalsMeasure = {
  field: null,
  lab: { performanceScore: 98, lcpMs: 1200, cls: 0, tbtMs: 10 },
};

describe('RefreshSeoDashboard', (): void => {
  let store: InMemorySeoReportStore;
  let clock: FixedClock;
  let searchConsole: { report: ReturnType<typeof vi.fn<SearchConsoleReader['report']>> };
  let analytics: { report: ReturnType<typeof vi.fn<AnalyticsReader['report']>> };
  let webVitals: { measure: ReturnType<typeof vi.fn<WebVitalsReader['measure']>> };
  let sources: SeoSources;

  beforeEach((): void => {
    store = new InMemorySeoReportStore();
    clock = new FixedClock(new Date('2026-11-04T05:30:00Z'));
    searchConsole = {
      report: vi.fn<SearchConsoleReader['report']>(async (window: ReportWindow) =>
        searchReport(window),
      ),
    };
    analytics = { report: vi.fn<AnalyticsReader['report']>(async () => AUDIENCE) };
    webVitals = { measure: vi.fn<WebVitalsReader['measure']>(async () => MEASURE) };
    sources = {
      searchConsole: { reader: searchConsole },
      analytics: { reader: analytics },
      webVitals: { reader: webVitals },
    };
  });

  const refresh = (
    overrides: Partial<SeoSources> = {},
    urls: readonly string[] = [],
  ): RefreshSeoDashboard =>
    new RefreshSeoDashboard(store, { ...sources, ...overrides }, repository, clock, {
      siteOrigin: ORIGIN,
      webVitalsUrls: urls,
    });

  it('fetches every range and key URL into the cache, then records the end', async (): Promise<void> => {
    const ticket: SeoRefreshTicket = await refresh().start();
    expect(ticket.startedAt).toEqual(clock.current);
    const summary: SeoRefreshSummary = await ticket.completion;
    expect(summary).toEqual({
      startedAt: clock.current,
      finishedAt: clock.current,
      refreshed: 7,
      failures: [],
    });
    // Search Console ends three days back, GA4 the day before.
    expect(
      searchConsole.report.mock.calls.map(([window]: [ReportWindow]) => window.current),
    ).toEqual([
      { start: '2026-10-26', end: '2026-11-01' },
      { start: '2026-10-05', end: '2026-11-01' },
      { start: '2026-08-04', end: '2026-11-01' },
    ]);
    expect(analytics.report.mock.calls[0]?.[0].current).toEqual({
      start: '2026-10-28',
      end: '2026-11-03',
    });
    expect(
      webVitals.measure.mock.calls.map(
        ([url, strategy]: [string, PageSpeedStrategy]) => `${strategy} ${url}`,
      ),
    ).toEqual([
      `mobile ${ORIGIN}/fr/`,
      `desktop ${ORIGIN}/fr/`,
      `mobile ${ORIGIN}/en/`,
      `desktop ${ORIGIN}/en/`,
      `mobile ${ORIGIN}/fr/projects/library-trails`,
      `desktop ${ORIGIN}/fr/projects/library-trails`,
    ]);
    expect(store.entries.get('search-console:28d')).toMatchObject({
      failure: null,
      fetchedAt: clock.current,
      data: { totals: { clicks: 1 }, window: { range: '28d' } },
    });
    const vitals: WebVitalsReport = store.entries.get('web-vitals:all')?.data as WebVitalsReport;
    expect(vitals.rows).toHaveLength(6);
    expect(vitals.rows[0]).toEqual({
      url: `${ORIGIN}/fr/`,
      strategy: 'mobile',
      measure: MEASURE,
      failure: null,
    });
    expect(store.state).toEqual({ startedAt: clock.current, finishedAt: clock.current });
  });

  it('refuses a second refresh within 10 minutes', async (): Promise<void> => {
    await (
      await refresh().start()
    ).completion;
    clock.current = new Date(clock.current.getTime() + SEO_REFRESH_INTERVAL_MS - 1);
    const refused: unknown = await refresh()
      .start()
      .catch((error: unknown): unknown => error);
    expect(refused).toBeInstanceOf(SeoRefreshTooSoonError);
    expect((refused as SeoRefreshTooSoonError).retryAt).toEqual(new Date('2026-11-04T05:40:00Z'));
    clock.current = new Date('2026-11-04T05:40:00Z');
    await expect(refresh().start()).resolves.toMatchObject({ startedAt: clock.current });
  });

  it('stores each failure beside the report fetched before', async (): Promise<void> => {
    await (
      await refresh().start()
    ).completion;
    const first: Date = clock.current;
    clock.current = new Date('2026-11-05T05:30:00Z');
    searchConsole.report.mockImplementation(
      async (window: ReportWindow): Promise<SearchConsoleReport> => {
        if (window.range === '7d')
          throw new SeoSourceError('permission-denied', 'No access to the property.');
        return searchReport(window);
      },
    );
    analytics.report.mockRejectedValue(new Error('token abc123 leaked'));
    const summary: SeoRefreshSummary = await (await refresh().start()).completion;
    expect(summary.refreshed).toBe(3);
    expect(summary.failures).toEqual([
      { source: 'search-console', range: '7d', code: 'permission-denied' },
      { source: 'analytics', range: '7d', code: 'unexpected' },
      { source: 'analytics', range: '28d', code: 'unexpected' },
      { source: 'analytics', range: '90d', code: 'unexpected' },
    ]);
    expect(store.entries.get('search-console:7d')).toEqual({
      data: expect.objectContaining({ window: expect.objectContaining({ range: '7d' }) }),
      fetchedAt: first,
      failure: { code: 'permission-denied', message: 'No access to the property.' },
      attemptedAt: clock.current,
    });
    // An unvetted message is never stored.
    expect(store.entries.get('analytics:90d')?.failure).toEqual({
      code: 'unexpected',
      message: 'The source failed unexpectedly.',
    });
  });

  it('skips the sources that are not configured', async (): Promise<void> => {
    const summary: SeoRefreshSummary = await (
      await refresh({
        searchConsole: { missing: ['SEO_SEARCH_CONSOLE_PROPERTY'] },
        analytics: { missing: ['SEO_GA4_PROPERTY_ID'] },
        webVitals: { missing: ['SEO_PAGESPEED_API_KEY'] },
      }).start()
    ).completion;
    expect(summary.refreshed).toBe(0);
    expect(store.entries.size).toBe(0);
    expect(store.state.finishedAt).toEqual(clock.current);
  });

  it('keeps failed runs in the Web Vitals report unless every run failed', async (): Promise<void> => {
    const urls: string[] = [`${ORIGIN}/projects/library-trails`];
    webVitals.measure.mockImplementation(
      async (_url: string, strategy: PageSpeedStrategy): Promise<WebVitalsMeasure> => {
        if (strategy === 'desktop')
          throw new SeoSourceError('timeout', 'PageSpeed Insights did not answer in time.');
        return MEASURE;
      },
    );
    await (
      await refresh({}, urls).start()
    ).completion;
    expect(store.entries.get('web-vitals:all')?.data).toEqual({
      rows: [
        { url: urls[0], strategy: 'mobile', measure: MEASURE, failure: null },
        {
          url: urls[0],
          strategy: 'desktop',
          measure: null,
          failure: { code: 'timeout', message: 'PageSpeed Insights did not answer in time.' },
        },
      ],
    });

    clock.current = new Date('2026-11-05T05:30:00Z');
    webVitals.measure.mockRejectedValue(new SeoSourceError('quota-exceeded', 'Quota exceeded.'));
    const summary: SeoRefreshSummary = await (await refresh({}, urls).start()).completion;
    expect(summary.failures).toEqual([
      { source: 'web-vitals', range: null, code: 'quota-exceeded' },
    ]);
    expect(store.entries.get('web-vitals:all')).toMatchObject({
      failure: { code: 'quota-exceeded' },
      fetchedAt: new Date('2026-11-04T05:30:00Z'),
    });
  });
});

describe('defaultWebVitalsUrls', (): void => {
  it('measures the home pages alone without a published project', (): void => {
    expect(defaultWebVitalsUrls(ORIGIN, [PROJECTS[2] as Project])).toEqual([
      `${ORIGIN}/fr/`,
      `${ORIGIN}/en/`,
    ]);
  });

  it('prefers the first project by position among equally featured ones', (): void => {
    expect(
      defaultWebVitalsUrls(ORIGIN, [
        PROJECTS[0] as Project,
        project('iot', { position: 0, published: true }),
      ]),
    ).toEqual([`${ORIGIN}/fr/`, `${ORIGIN}/en/`, `${ORIGIN}/fr/projects/neighborhood-atlas`]);
  });
});

describe('failureOf', (): void => {
  it('keeps the reason of a source error only', (): void => {
    expect(failureOf(new SeoSourceError('network', 'Google is unreachable.'))).toEqual({
      code: 'network',
      message: 'Google is unreachable.',
    });
    expect(failureOf('boom')).toEqual({
      code: 'unexpected',
      message: 'The source failed unexpectedly.',
    });
  });
});

describe('GetSeoDashboard', (): void => {
  let store: InMemorySeoReportStore;
  let clock: FixedClock;
  const sources: SeoSources = {
    searchConsole: { reader: { report: async (window: ReportWindow) => searchReport(window) } },
    analytics: { missing: ['SEO_GA4_PROPERTY_ID'] },
    webVitals: { reader: { measure: async () => MEASURE } },
  };

  beforeEach((): void => {
    store = new InMemorySeoReportStore();
    clock = new FixedClock(new Date('2026-11-04T08:00:00Z'));
  });

  const dashboard = (): Promise<SeoDashboardView> =>
    new GetSeoDashboard(store, sources, repository, clock).execute('28d');

  it('announces demonstration figures when a source is a demo stand-in', async (): Promise<void> => {
    const view: SeoDashboardView = await new GetSeoDashboard(
      store,
      { ...sources, analytics: { reader: { report: async () => AUDIENCE }, demo: true } },
      repository,
      clock,
    ).execute('28d');
    expect(view.demo).toBe(true);
    expect(view.analytics).toEqual({ status: 'pending' });
  });

  it('shows unconfigured and never fetched sections and the audit', async (): Promise<void> => {
    const view: SeoDashboardView = await dashboard();
    expect(view.range).toBe('28d');
    expect(view.demo).toBe(false);
    expect(view.searchConsole).toEqual({ status: 'pending' });
    expect(view.analytics).toEqual({ status: 'not-configured', missing: ['SEO_GA4_PROPERTY_ID'] });
    expect(view.refresh).toEqual({
      running: false,
      startedAt: null,
      finishedAt: null,
      nextAllowedAt: null,
    });
    expect(view.audit.projects.map((audit) => audit.slug)).toEqual([
      'neighborhood-atlas',
      'library-trails',
    ]);
    expect(view.audit.sitemap).toEqual({ pages: 5, urls: 10 });
    expect(view.audit.totals.published).toBe(2);
    expect(view.audit.totals.drafts).toBe(1);
    expect(view.audit.totals.issues.warning).toBeGreaterThan(0);
    expect(view.audit.generatedAt).toEqual(clock.current);
  });

  it('shows the cached reports, and a newer failure with the report before it', async (): Promise<void> => {
    await (
      await new RefreshSeoDashboard(store, sources, repository, clock, {
        siteOrigin: ORIGIN,
        webVitalsUrls: [],
      }).start()
    ).completion;
    const fetchedAt: Date = clock.current;
    clock.current = new Date('2026-11-04T08:05:00Z');
    await store.saveFailure(
      'web-vitals',
      null,
      { code: 'timeout', message: 'Too slow.' },
      clock.current,
    );
    await store.saveFailure(
      'search-console',
      '7d',
      { code: 'network', message: 'Offline.' },
      clock.current,
    );

    const view: SeoDashboardView = await dashboard();
    expect(view.searchConsole).toMatchObject({
      status: 'ok',
      fetchedAt,
      data: { window: { range: '28d' } },
    });
    expect(view.webVitals).toMatchObject({
      status: 'error',
      attemptedAt: clock.current,
      failure: { code: 'timeout', message: 'Too slow.' },
      fetchedAt,
    });
    expect(view.refresh).toEqual({
      running: false,
      startedAt: fetchedAt,
      finishedAt: fetchedAt,
      nextAllowedAt: new Date('2026-11-04T08:10:00Z'),
    });
    const week: SeoDashboardView = await new GetSeoDashboard(
      store,
      sources,
      repository,
      clock,
    ).execute('7d');
    expect(week.searchConsole).toMatchObject({ status: 'error', failure: { code: 'network' } });
  });

  it('shows a refresh in progress until the interval ends', async (): Promise<void> => {
    store.state = {
      startedAt: new Date('2026-11-04T07:55:00Z'),
      finishedAt: new Date('2026-11-03T05:30:00Z'),
    };
    expect((await dashboard()).refresh).toMatchObject({
      running: true,
      nextAllowedAt: new Date('2026-11-04T08:05:00Z'),
    });
    clock.current = new Date('2026-11-04T08:05:00Z');
    // An interrupted refresh no longer counts as running.
    expect((await dashboard()).refresh).toMatchObject({ running: false, nextAllowedAt: null });
  });

  it('reports an entry that failed before any report', async (): Promise<void> => {
    await store.saveFailure(
      'search-console',
      '28d',
      { code: 'credentials-missing', message: 'Empty file.' },
      clock.current,
    );
    expect((await dashboard()).searchConsole).toEqual({
      status: 'error',
      attemptedAt: clock.current,
      failure: { code: 'credentials-missing', message: 'Empty file.' },
      fetchedAt: null,
      data: null,
    });
    store.entries.set('search-console:28d', {
      data: null,
      fetchedAt: null,
      failure: null,
      attemptedAt: clock.current,
    });
    expect((await dashboard()).searchConsole).toMatchObject({
      status: 'error',
      failure: { code: 'unexpected', message: 'No report was stored.' },
    });
  });
});
