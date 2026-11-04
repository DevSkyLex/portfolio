import type {
  AnalyticsData,
  SearchConsoleData,
  SearchMetrics,
  SeoDashboardCache,
  WebVitalsReport,
} from '@vfortin/content-application';
import { type ReportWindow, reportWindow } from '@vfortin/content-domain';
import { fileURLToPath } from 'node:url';
import {
  type ContentDatabaseHandle,
  migrateContentDatabase,
  openContentDatabase,
} from '@internal/content-adapters-out/lib/persistence/database/content-database';
import { DrizzleSeoReportStore } from '@internal/content-adapters-out/lib/persistence/repositories/seo-dashboard/drizzle-seo-dashboard.repositories';

/**
 * Constant MIGRATIONS
 *
 * @description
 * Absolute content-service migration directory used to prepare the in-memory database.
 */
const MIGRATIONS: string = fileURLToPath(
  new URL('../../../../../../../../../../apps/content-service/migrations', import.meta.url),
);

/**
 * Constant now
 *
 * @description
 * Fixed instant of the writes.
 */
const now: Date = new Date('2026-11-04T05:30:00Z');

/**
 * Function later
 *
 * @description
 * Returns an instant some minutes after `now`.
 *
 * @param {number} minutes - Minutes added.
 * @returns {Date} Instant.
 */
const later = (minutes: number): Date => new Date(now.getTime() + minutes * 60_000);

/**
 * Function searchData
 *
 * @description
 * Builds a Search Console report of one window.
 *
 * @param {ReportWindow} window - Window.
 * @param {number} clicks - Total clicks.
 * @returns {SearchConsoleData} Report.
 */
function searchData(window: ReportWindow, clicks: number): SearchConsoleData {
  const totals: SearchMetrics = { clicks, impressions: 100, ctr: clicks / 100, position: 7.5 };
  return { window, totals, previous: totals, daily: [], queries: [], pages: [], devices: [] };
}

describe('DrizzleSeoReportStore (Postgres via PGlite)', (): void => {
  let handle: ContentDatabaseHandle;
  let store: DrizzleSeoReportStore;

  beforeEach(async (): Promise<void> => {
    handle = await openContentDatabase('pglite:memory');
    await migrateContentDatabase(handle, MIGRATIONS);
    store = new DrizzleSeoReportStore(handle.db);
  });

  afterEach(async (): Promise<void> => {
    await handle.close();
  });

  it('starts empty', async (): Promise<void> => {
    expect(await store.load('28d')).toEqual({
      searchConsole: null,
      analytics: null,
      webVitals: null,
      refresh: { startedAt: null, finishedAt: null },
    } satisfies SeoDashboardCache);
  });

  it('reads the entries of the requested range and the Web Vitals', async (): Promise<void> => {
    const week: ReportWindow = reportWindow('7d', now, 3);
    const month: ReportWindow = reportWindow('28d', now, 3);
    const audience: AnalyticsData = {
      window: reportWindow('28d', now, 1),
      totals: {
        activeUsers: 1,
        sessions: 1,
        views: 2,
        engagementRate: 1,
        averageEngagementSeconds: 4,
      },
      previous: {
        activeUsers: 0,
        sessions: 0,
        views: 0,
        engagementRate: 0,
        averageEngagementSeconds: 0,
      },
      daily: [],
      pages: [],
      channels: [],
      countries: [],
    };
    const vitals: WebVitalsReport = {
      rows: [
        {
          url: 'https://valentin-fortin.pro/',
          strategy: 'mobile',
          measure: { field: null, lab: { performanceScore: 97, lcpMs: 1500, cls: 0, tbtMs: 30 } },
          failure: null,
        },
      ],
    };
    await store.saveReport(
      { source: 'search-console', range: '7d', data: searchData(week, 3) },
      now,
    );
    await store.saveReport(
      { source: 'search-console', range: '28d', data: searchData(month, 9) },
      now,
    );
    await store.saveReport({ source: 'analytics', range: '28d', data: audience }, now);
    await store.saveReport({ source: 'web-vitals', range: null, data: vitals }, now);

    const cache: SeoDashboardCache = await store.load('28d');
    expect(cache.searchConsole).toEqual({
      data: searchData(month, 9),
      fetchedAt: now,
      failure: null,
      attemptedAt: now,
    });
    expect(cache.analytics?.data).toEqual(audience);
    expect(cache.webVitals?.data).toEqual(vitals);
    expect((await store.load('7d')).searchConsole?.data?.totals.clicks).toBe(3);
    expect((await store.load('90d')).searchConsole).toBeNull();
  });

  it('keeps the last report when an attempt fails, and replaces both on success', async (): Promise<void> => {
    const month: ReportWindow = reportWindow('28d', now, 3);
    await store.saveFailure('analytics', '28d', { code: 'network', message: 'Offline.' }, now);
    expect((await store.load('28d')).analytics).toEqual({
      data: null,
      fetchedAt: null,
      failure: { code: 'network', message: 'Offline.' },
      attemptedAt: now,
    });
    await store.saveReport(
      { source: 'search-console', range: '28d', data: searchData(month, 5) },
      now,
    );
    await store.saveFailure(
      'search-console',
      '28d',
      { code: 'permission-denied', message: 'No access.' },
      later(60),
    );
    expect((await store.load('28d')).searchConsole).toEqual({
      data: searchData(month, 5),
      fetchedAt: now,
      failure: { code: 'permission-denied', message: 'No access.' },
      attemptedAt: later(60),
    });
    await store.saveReport(
      { source: 'search-console', range: '28d', data: searchData(month, 6) },
      later(120),
    );
    expect((await store.load('28d')).searchConsole).toMatchObject({
      failure: null,
      fetchedAt: later(120),
      data: { totals: { clicks: 6 } },
    });
    await store.saveFailure('web-vitals', null, { code: 'timeout', message: 'Slow.' }, now);
    expect((await store.load('7d')).webVitals?.failure?.code).toBe('timeout');
  });

  it('claims one refresh per interval and records its end', async (): Promise<void> => {
    expect(await store.claimRefresh(now, later(-10))).toBe(true);
    expect(await store.refreshState()).toEqual({ startedAt: now, finishedAt: null });
    // A second claim within the interval (the previous start is after `notBefore`) is refused.
    expect(await store.claimRefresh(later(5), later(-5))).toBe(false);
    expect((await store.refreshState()).startedAt).toEqual(now);
    await store.finishRefresh(later(1));
    expect(await store.claimRefresh(later(10), now)).toBe(true);
    expect(await store.refreshState()).toEqual({ startedAt: later(10), finishedAt: later(1) });
  });
});
