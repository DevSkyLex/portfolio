import { type INestApplication, Logger } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Server } from 'node:http';
import { AdminAuthModule } from '@vfortin/backend-auth';
import { PROBLEM_MAPPER, ProblemDetailsFilter } from '@vfortin/backend-http';
import {
  GetSeoDashboard,
  RefreshSeoDashboard,
  type SearchConsoleData,
  type SeoDashboardView,
  SeoRefreshTooSoonError,
  type SeoRefreshSummary,
} from '@vfortin/content-application';
import { type SeoDashboardDto, SeoDashboardDtoSchema } from '@vfortin/content-contracts';
import {
  LocalizedText,
  Project,
  ProjectPeriod,
  ProjectSeo,
  Slug,
  ArticleDocument,
  auditProjectSeo,
  reportWindow,
} from '@vfortin/content-domain';
import { type JWK, SignJWT, exportJWK, generateKeyPair } from 'jose';
import request from 'supertest';
import type { Mock, MockInstance } from 'vitest';
import { AdminSeoDashboardController } from '@internal/content-adapters-in/lib/http/controllers/admin-seo-dashboard/admin-seo-dashboard.controller';
import { contentProblemMapper } from '@internal/content-adapters-in/lib/http/mappers/content-problem/content-problem.mapper';
import { summaryLine } from '@internal/content-adapters-in/lib/http/presenters/seo-dashboard/seo-dashboard.presenter';
import { SeoDashboardJobs } from '@internal/content-adapters-in/lib/jobs/seo-dashboard/seo-dashboard.jobs';

/**
 * Constant ISSUER
 *
 * @description
 * Issuer of the test administrator token.
 */
const ISSUER: string = 'https://exemple.fr/api/auth';

/**
 * Constant FETCHED
 *
 * @description
 * Time of the cached reports.
 */
const FETCHED: Date = new Date('2026-11-04T05:30:12Z');

/**
 * Function text
 *
 * @description
 * Creates a bilingual value.
 *
 * @param {string} value - Text in both languages.
 * @returns {LocalizedText} Value.
 */
const text = (value: string): LocalizedText => LocalizedText.of('t', { fr: value, en: value });

/**
 * Constant PROJECT
 *
 * @description
 * Published project audited by the dashboard fixture.
 */
const PROJECT: Project = Project.rehydrate({
  id: 'library-trails',
  slug: Slug.of('library-trails'),
  title: text('Atlas'),
  summary: text('Application mobile de suivi de séries.'),
  lead: text('Intro'),
  period: ProjectPeriod.of({ start: { year: 2026, month: null }, end: null }),
  client: text('Personnel'),
  role: text('Conception'),
  place: text('Mobile'),
  siteUrl: null,
  techs: ['flutter'],
  featured: true,
  position: 0,
  status: 'published',
  version: 1,
  article: {
    fr: ArticleDocument.of('a', {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Texte' }] }],
    }),
    en: ArticleDocument.of('a', {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Text' }] }],
    }),
  },
  cover: null,
  seo: ProjectSeo.empty(),
});

/**
 * Constant SEARCH
 *
 * @description
 * Cached Search Console report.
 */
const SEARCH: SearchConsoleData = {
  window: reportWindow('28d', FETCHED, 3),
  totals: { clicks: 42, impressions: 1830, ctr: 0.0229, position: 18.4 },
  previous: { clicks: 30, impressions: 1402, ctr: 0.0214, position: 21.9 },
  daily: [{ date: '2026-10-05', clicks: 2, impressions: 61, ctr: 0.0328, position: 17.2 }],
  queries: [{ key: 'morgan exemple', clicks: 21, impressions: 64, ctr: 0.3281, position: 1.3 }],
  pages: [],
  devices: [{ key: 'MOBILE', clicks: 17, impressions: 730, ctr: 0.0233, position: 20.8 }],
};

/**
 * Function view
 *
 * @description
 * Builds a dashboard view: Search Console cached, GA4 not configured, Web Vitals failed after a
 * first report.
 *
 * @returns {SeoDashboardView} View.
 */
function view(): SeoDashboardView {
  return {
    range: '28d',
    demo: false,
    refresh: { running: false, startedAt: FETCHED, finishedAt: FETCHED, nextAllowedAt: null },
    searchConsole: { status: 'ok', fetchedAt: FETCHED, data: SEARCH },
    analytics: { status: 'not-configured', missing: ['SEO_GA4_PROPERTY_ID'] },
    webVitals: {
      status: 'error',
      attemptedAt: FETCHED,
      failure: { code: 'quota-exceeded', message: 'Quota exceeded.' },
      fetchedAt: new Date('2026-11-03T05:30:00Z'),
      data: {
        rows: [
          {
            url: 'https://valentin-fortin.pro/',
            strategy: 'mobile',
            measure: { field: null, lab: { performanceScore: 95, lcpMs: 1800, cls: 0, tbtMs: 40 } },
            failure: null,
          },
          {
            url: 'https://valentin-fortin.pro/',
            strategy: 'desktop',
            measure: null,
            failure: { code: 'timeout', message: 'Too slow.' },
          },
        ],
      },
    },
    audit: {
      generatedAt: FETCHED,
      projects: [auditProjectSeo(PROJECT)],
      sitemap: { pages: 4, urls: 8 },
      totals: { published: 1, drafts: 0, issues: { error: 0, warning: 3, info: 6 } },
    },
  };
}

describe('AdminSeoDashboardController', (): void => {
  let app: INestApplication<Server>;
  let token: string;
  const dashboard: { execute: Mock<GetSeoDashboard['execute']> } = {
    execute: vi.fn<GetSeoDashboard['execute']>(),
  };
  const refresh: { start: Mock<RefreshSeoDashboard['start']> } = {
    start: vi.fn<RefreshSeoDashboard['start']>(),
  };

  beforeAll(async (): Promise<void> => {
    const { publicKey, privateKey } = await generateKeyPair('EdDSA', { crv: 'Ed25519' });
    const jwk: JWK = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'EdDSA' };
    token = await new SignJWT({ role: 'admin', sid: 'f1' })
      .setProtectedHeader({ alg: 'EdDSA', kid: 'k1', typ: 'at+jwt' })
      .setSubject('a1')
      .setIssuer(ISSUER)
      .setAudience('portfolio-admin')
      .setIssuedAt()
      .setNotBefore(new Date())
      .setJti('j1')
      .setExpirationTime('5m')
      .sign(privateKey);
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AdminAuthModule.forRoot({ issuer: ISSUER, jwks: { keys: [jwk] } })],
      controllers: [AdminSeoDashboardController],
      providers: [
        { provide: GetSeoDashboard, useValue: dashboard },
        { provide: RefreshSeoDashboard, useValue: refresh },
        { provide: PROBLEM_MAPPER, useValue: contentProblemMapper },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
    }).compile();
    app = moduleRef.createNestApplication<INestApplication<Server>>({ logger: false });
    await app.init();
  });

  afterAll(async (): Promise<void> => {
    await app.close();
  });

  beforeEach((): void => {
    vi.clearAllMocks();
  });

  const server = (): ReturnType<typeof request> => request(app.getHttpServer());

  it('answers 401 to an anonymous read or refresh', async (): Promise<void> => {
    expect((await server().get('/content/admin/seo/dashboard?range=nope')).status).toBe(401);
    expect((await server().post('/content/admin/seo/dashboard/refresh')).status).toBe(401);
    expect(dashboard.execute).not.toHaveBeenCalled();
    expect(refresh.start).not.toHaveBeenCalled();
  });

  it('serves the 28-day dashboard by default, matching the contract', async (): Promise<void> => {
    dashboard.execute.mockResolvedValue(view());
    const response: request.Response = await server()
      .get('/content/admin/seo/dashboard')
      .set('authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(dashboard.execute).toHaveBeenCalledWith('28d');
    const dto: SeoDashboardDto = SeoDashboardDtoSchema.parse(response.body);
    expect(dto.searchConsole).toEqual({
      status: 'ok',
      fetchedAt: '2026-11-04T05:30:12.000Z',
      data: SEARCH,
    });
    expect(dto.analytics).toEqual({
      status: 'not-configured',
      fetchedAt: null,
      missing: ['SEO_GA4_PROPERTY_ID'],
    });
    expect(dto.webVitals).toMatchObject({
      status: 'error',
      fetchedAt: '2026-11-03T05:30:00.000Z',
      attemptedAt: '2026-11-04T05:30:12.000Z',
      error: { code: 'quota-exceeded', message: 'Quota exceeded.' },
      data: {
        rows: [
          { error: null },
          { measure: null, error: { code: 'timeout', message: 'Too slow.' } },
        ],
      },
    });
    expect(dto.audit.projects[0]).toMatchObject({ id: 'library-trails', slug: 'library-trails' });
    expect(dto.audit.projects[0]?.issues).toContainEqual({
      code: 'search-title-too-short',
      severity: 'warning',
      locale: 'fr',
      length: 23,
      limit: 30,
    });
    expect(dto.refresh).toEqual({
      running: false,
      startedAt: '2026-11-04T05:30:12.000Z',
      finishedAt: '2026-11-04T05:30:12.000Z',
      nextAllowedAt: null,
    });
  });

  it('serves the requested range and refuses an unknown one', async (): Promise<void> => {
    dashboard.execute.mockResolvedValue({
      ...view(),
      range: '90d',
      searchConsole: { status: 'pending' },
    });
    const week: request.Response = await server()
      .get('/content/admin/seo/dashboard?range=90d')
      .set('authorization', `Bearer ${token}`);
    expect(week.status).toBe(200);
    expect(dashboard.execute).toHaveBeenCalledWith('90d');
    expect(week.body.searchConsole).toEqual({ status: 'pending', fetchedAt: null });
    const invalid: request.Response = await server()
      .get('/content/admin/seo/dashboard?range=30d')
      .set('authorization', `Bearer ${token}`);
    expect(invalid.status).toBe(400);
    expect(invalid.body.code).toBe('request.invalid');
  });

  it('serves reports beside failures, with or without an earlier report', async (): Promise<void> => {
    dashboard.execute.mockResolvedValue({
      ...view(),
      searchConsole: {
        status: 'error',
        attemptedAt: FETCHED,
        failure: { code: 'network', message: 'Offline.' },
        fetchedAt: null,
        data: null,
      },
      analytics: {
        status: 'ok',
        fetchedAt: FETCHED,
        data: {
          window: reportWindow('28d', FETCHED, 1),
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
          daily: [{ date: '2026-10-07', activeUsers: 1, sessions: 1, views: 2 }],
          pages: [{ path: '/', views: 9, activeUsers: 3 }],
          channels: [{ key: 'Direct', sessions: 4, activeUsers: 3 }],
          countries: [{ key: 'France', sessions: 4, activeUsers: 3 }],
        },
      },
      refresh: {
        running: true,
        startedAt: FETCHED,
        finishedAt: null,
        nextAllowedAt: new Date('2026-11-04T05:40:12Z'),
      },
    });
    const dto: SeoDashboardDto = SeoDashboardDtoSchema.parse(
      (await server().get('/content/admin/seo/dashboard').set('authorization', `Bearer ${token}`))
        .body,
    );
    expect(dto.searchConsole).toEqual({
      status: 'error',
      fetchedAt: null,
      attemptedAt: '2026-11-04T05:30:12.000Z',
      error: { code: 'network', message: 'Offline.' },
      data: null,
    });
    expect(dto.analytics).toMatchObject({ status: 'ok', data: { countries: [{ key: 'France' }] } });
    expect(dto.refresh).toEqual({
      running: true,
      startedAt: '2026-11-04T05:30:12.000Z',
      finishedAt: null,
      nextAllowedAt: '2026-11-04T05:40:12.000Z',
    });
  });

  it('answers 500 when the refresh cannot start', async (): Promise<void> => {
    const error: MockInstance = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation((): void => undefined);
    refresh.start.mockRejectedValue(new Error('database down'));
    const response: request.Response = await server()
      .post('/content/admin/seo/dashboard/refresh')
      .set('authorization', `Bearer ${token}`);
    expect(response.status).toBe(500);
    expect(response.headers['retry-after']).toBeUndefined();
    error.mockRestore();
  });

  it('starts a refresh in the background and answers 202', async (): Promise<void> => {
    const log: MockInstance = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation((): void => undefined);
    const summary: SeoRefreshSummary = {
      startedAt: FETCHED,
      finishedAt: FETCHED,
      refreshed: 6,
      failures: [{ source: 'web-vitals', range: null, code: 'timeout' }],
    };
    refresh.start.mockResolvedValue({ startedAt: FETCHED, completion: Promise.resolve(summary) });
    const response: request.Response = await server()
      .post('/content/admin/seo/dashboard/refresh')
      .set('authorization', `Bearer ${token}`);
    expect(response.status).toBe(202);
    expect(response.body).toEqual({
      startedAt: '2026-11-04T05:30:12.000Z',
      nextAllowedAt: '2026-11-04T05:40:12.000Z',
    });
    await vi.waitFor((): void => {
      expect(log).toHaveBeenCalledWith(summaryLine(summary));
    });
    log.mockRestore();
  });

  it('logs a refresh whose cache write failed', async (): Promise<void> => {
    const error: MockInstance = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation((): void => undefined);
    refresh.start.mockResolvedValue({
      startedAt: FETCHED,
      // Rejected after the controller attached its handlers, as a real failing write would be.
      completion: new Promise<SeoRefreshSummary>(
        (_resolve: unknown, reject: (error: unknown) => void): void => {
          setTimeout((): void => reject('database down'), 10);
        },
      ),
    });
    expect(
      (
        await server()
          .post('/content/admin/seo/dashboard/refresh')
          .set('authorization', `Bearer ${token}`)
      ).status,
    ).toBe(202);
    await vi.waitFor((): void => {
      expect(error).toHaveBeenCalledWith('database down');
    });
    error.mockRestore();
  });

  it('answers 429 with Retry-After within 10 minutes of the previous refresh', async (): Promise<void> => {
    refresh.start.mockRejectedValue(new SeoRefreshTooSoonError(new Date('2026-11-04T05:40:12Z')));
    const response: request.Response = await server()
      .post('/content/admin/seo/dashboard/refresh')
      .set('authorization', `Bearer ${token}`);
    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBe('Wed, 04 Nov 2026 05:40:12 GMT');
    expect(response.body).toMatchObject({
      code: 'content.seo-refresh-too-soon',
      details: ['2026-11-04T05:40:12.000Z'],
    });
  });
});

describe('SeoDashboardJobs', (): void => {
  it('runs the refresh to its end and logs it, a skip and a failure', async (): Promise<void> => {
    const log: MockInstance = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation((): void => undefined);
    const error: MockInstance = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation((): void => undefined);
    const start: Mock<RefreshSeoDashboard['start']> = vi.fn<RefreshSeoDashboard['start']>();
    const jobs: SeoDashboardJobs = new SeoDashboardJobs({
      start,
    } as unknown as RefreshSeoDashboard);
    const summary: SeoRefreshSummary = {
      startedAt: FETCHED,
      finishedAt: FETCHED,
      refreshed: 7,
      failures: [],
    };
    start.mockResolvedValueOnce({ startedAt: FETCHED, completion: Promise.resolve(summary) });
    await jobs.refreshDaily();
    expect(log).toHaveBeenCalledWith('SEO dashboard refreshed: 7 report(s) stored, 0 failure(s).');
    start.mockRejectedValueOnce(new SeoRefreshTooSoonError(FETCHED));
    await jobs.refreshDaily();
    expect(log).toHaveBeenCalledWith(
      'SEO dashboard refresh skipped: one ran less than 10 minutes ago.',
    );
    start.mockRejectedValueOnce('store down');
    await jobs.refreshDaily();
    expect(error).toHaveBeenCalledWith('store down');
    start.mockRejectedValueOnce(new Error('pool closed'));
    await jobs.refreshDaily();
    expect(error).toHaveBeenCalledWith(expect.stringContaining('pool closed'));
    log.mockRestore();
    error.mockRestore();
  });
});

describe('summaryLine', (): void => {
  it('lists the failed sources and reasons', (): void => {
    expect(
      summaryLine({
        startedAt: FETCHED,
        finishedAt: FETCHED,
        refreshed: 5,
        failures: [
          { source: 'analytics', range: '7d', code: 'permission-denied' },
          { source: 'web-vitals', range: null, code: 'timeout' },
        ],
      }),
    ).toBe(
      'SEO dashboard refreshed: 5 report(s) stored, 2 failure(s) (analytics/7d: permission-denied, web-vitals/all: timeout).',
    );
  });
});
