import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { SeoDashboardDto } from '@vfortin/content-contracts';
import type { SeoDashboard } from '@internal/content-web-data-access/lib/admin/models/seo-dashboard/seo-dashboard.type';
import type { SeoRefreshOutcome } from '@internal/content-web-data-access/lib/admin/models/seo-refresh-outcome/seo-refresh-outcome.type';
import {
  AdminSeoDashboardStore,
  type AdminSeoDashboardStoreType,
} from '@internal/content-web-data-access/lib/admin/state/admin-seo-dashboard/admin-seo-dashboard.store';

/**
 * Constant URL
 *
 * @description
 * Dashboard endpoint of the API.
 *
 * @type {string}
 */
const URL: string = '/api/content/admin/seo/dashboard';

/**
 * Function dto
 *
 * @description
 * Dashboard of a window without any Google source configured.
 *
 * @param {SeoDashboardDto['range']} range - Window.
 * @param {boolean} running - Whether a refresh runs.
 *
 * @returns {SeoDashboardDto} Dashboard.
 */
const dto = (range: SeoDashboardDto['range'], running: boolean = false): SeoDashboardDto => ({
  range,
  demo: false,
  refresh: {
    running,
    startedAt: running ? '2026-11-04T10:00:00.000Z' : null,
    finishedAt: null,
    nextAllowedAt: running ? '2026-11-04T10:10:00.000Z' : null,
  },
  searchConsole: {
    status: 'not-configured',
    fetchedAt: null,
    missing: ['SEO_GOOGLE_CREDENTIALS_PATH'],
  },
  analytics: { status: 'pending', fetchedAt: null },
  webVitals: { status: 'pending', fetchedAt: null },
  audit: {
    generatedAt: '2026-11-04T10:00:00.000Z',
    projects: [],
    sitemap: { pages: 4, urls: 8 },
    totals: { published: 0, drafts: 0, issues: { error: 0, warning: 0, info: 0 } },
  },
});

/**
 * Function setup
 *
 * @description
 * Creates the store and the HTTP testing backend.
 *
 * @returns {{ store: AdminSeoDashboardStoreType; backend: HttpTestingController }} Harness.
 */
function setup(): { store: AdminSeoDashboardStoreType; backend: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), AdminSeoDashboardStore],
  });
  return {
    store: TestBed.inject<AdminSeoDashboardStoreType>(AdminSeoDashboardStore),
    backend: TestBed.inject<HttpTestingController>(HttpTestingController),
  };
}

describe('AdminSeoDashboardStore', (): void => {
  afterEach((): void => {
    vi.useRealTimers();
    TestBed.inject<HttpTestingController>(HttpTestingController).verify();
  });

  it('reads a window and ignores a read answered after a newer one', async (): Promise<void> => {
    const { store, backend } = setup();
    const first: Promise<SeoDashboard | null> = store.load('7d');
    const second: Promise<SeoDashboard | null> = store.load('90d');
    expect(store.loading()).toBe(true);
    const requests: TestRequest[] = backend.match(
      (request) => request.url === URL && request.method === 'GET',
    );
    expect(requests.map((request: TestRequest) => request.request.params.get('range'))).toEqual([
      '7d',
      '90d',
    ]);
    requests[1]?.flush(dto('90d'));
    requests[0]?.flush(dto('7d'));
    expect(await first).toBeNull();
    expect((await second)?.range).toBe('90d');
    expect(store.dashboard()?.range).toBe('90d');
    expect(store.range()).toBe('90d');
    expect(store.loadCallState().status).toBe('success');
  });

  it('keeps a failed read as its call state', async (): Promise<void> => {
    const { store, backend } = setup();
    const loading: Promise<SeoDashboard | null> = store.load('28d');
    backend
      .expectOne(`${URL}?range=28d`)
      .flush(null, { status: 503, statusText: 'Service Unavailable' });
    expect(await loading).toBeNull();
    expect(store.loadCallState().error?.status).toBe(503);
  });

  it('starts a refresh, then polls the window until it is over', async (): Promise<void> => {
    vi.useFakeTimers();
    const { store, backend } = setup();
    const loading: Promise<SeoDashboard | null> = store.load('28d');
    backend.expectOne(`${URL}?range=28d`).flush(dto('28d'));
    await loading;
    const refreshing: Promise<SeoRefreshOutcome | null> = store.refresh();
    expect(store.refreshing()).toBe(true);
    const post: TestRequest = backend.expectOne(`${URL}/refresh`);
    expect(post.request.method).toBe('POST');
    post.flush(
      { startedAt: '2026-11-04T10:00:00.000Z', nextAllowedAt: '2026-11-04T10:10:00.000Z' },
      { status: 202, statusText: 'Accepted' },
    );
    expect(await refreshing).toEqual({ status: 'started' });
    expect(store.dashboard()?.refresh.running).toBe(true);
    expect(store.refreshing()).toBe(true);
    expect(store.nextAllowedAt()).toBe('2026-11-04T10:10:00.000Z');
    // A second request while one runs sends nothing.
    expect(await store.refresh()).toBeNull();

    await vi.advanceTimersByTimeAsync(2999);
    backend.expectNone(`${URL}?range=28d`);
    await vi.advanceTimersByTimeAsync(1);
    backend.expectOne(`${URL}?range=28d`).flush(dto('28d', true));
    await vi.advanceTimersByTimeAsync(3000);
    backend.expectOne(`${URL}?range=28d`).flush(dto('28d'));
    await vi.advanceTimersByTimeAsync(0);
    expect(store.refreshing()).toBe(false);
    expect(store.pollCallState().status).toBe('success');
    await vi.advanceTimersByTimeAsync(9000);
    backend.expectNone(`${URL}?range=28d`);
  });

  it('polls when a read finds a refresh running, and stops with the store', async (): Promise<void> => {
    vi.useFakeTimers();
    const { store, backend } = setup();
    const loading: Promise<SeoDashboard | null> = store.load('7d');
    backend.expectOne(`${URL}?range=7d`).flush(dto('7d', true));
    await loading;
    await vi.advanceTimersByTimeAsync(3000);
    backend.expectOne(`${URL}?range=7d`).flush(dto('7d', true));
    await vi.advanceTimersByTimeAsync(0);
    store.stop();
    await vi.advanceTimersByTimeAsync(6000);
    backend.expectNone(`${URL}?range=7d`);
  });

  it('gives back the retry time of a refresh asked too soon', async (): Promise<void> => {
    const { store, backend } = setup();
    const refreshing: Promise<SeoRefreshOutcome | null> = store.refresh();
    backend.expectOne(`${URL}/refresh`).flush(
      {
        type: 'about:blank',
        title: 'Too Many Requests',
        status: 429,
        code: 'content.seo-refresh-too-soon',
        details: ['2026-11-04T10:10:00.000Z'],
      },
      {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'Retry-After': 'Wed, 04 Nov 2026 10:10:00 GMT' },
      },
    );
    expect(await refreshing).toEqual({ status: 'too-soon', retryAt: '2026-11-04T10:10:00.000Z' });
    expect(store.retryAt()).toBe('2026-11-04T10:10:00.000Z');
    expect(store.nextAllowedAt()).toBe('2026-11-04T10:10:00.000Z');
    expect(store.refreshing()).toBe(false);
  });

  it('reads the Retry-After date without details, and reports another failure', async (): Promise<void> => {
    const { store, backend } = setup();
    const tooSoon: Promise<SeoRefreshOutcome | null> = store.refresh();
    backend.expectOne(`${URL}/refresh`).flush(
      { status: 429, code: 'content.seo-refresh-too-soon' },
      {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'Retry-After': 'Wed, 04 Nov 2026 10:12:00 GMT' },
      },
    );
    expect(await tooSoon).toEqual({ status: 'too-soon', retryAt: '2026-11-04T10:12:00.000Z' });
    const failing: Promise<SeoRefreshOutcome | null> = store.refresh();
    backend
      .expectOne(`${URL}/refresh`)
      .flush(null, { status: 500, statusText: 'Internal Server Error' });
    const outcome: SeoRefreshOutcome | null = await failing;
    expect(outcome?.status).toBe('failed');
    expect(store.refreshCallState().error?.status).toBe(500);
  });
});
