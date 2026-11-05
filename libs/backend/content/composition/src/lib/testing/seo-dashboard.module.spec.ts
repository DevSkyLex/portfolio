import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Server } from 'node:http';
import { AdminAuthModule } from '@vfortin/backend-auth';
import { ObservabilityModule } from '@vfortin/backend-observability';
import {
  type ContentDatabaseHandle,
  GoogleAnalyticsReader,
  GoogleSearchConsoleReader,
  PageSpeedWebVitalsReader,
  migrateContentDatabase,
  seedContent,
} from '@vfortin/content-adapters-out';
import type {
  SearchConsoleReport,
  SearchMetrics,
  SeoSources,
  WebVitalsMeasure,
} from '@vfortin/content-application';
import type { ReportWindow } from '@vfortin/content-domain';
import { type JWK, SignJWT, exportJWK, generateKeyPair } from 'jose';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import {
  type ContentSeoOptions,
  ContentModule,
  seoSources,
} from '@internal/content-composition/lib/content.module';
import { configureContentHttp } from '@internal/content-composition/lib/http/content-http/content-http';

/**
 * Constant MIGRATIONS
 *
 * @description
 * Content-service migrations applied to the in-memory database.
 */
const MIGRATIONS: string = fileURLToPath(
  new URL('../../../../../../../apps/content-service/migrations', import.meta.url),
);

/**
 * Constant ISSUER
 *
 * @description
 * Issuer of the test administrator token.
 */
const ISSUER: string = 'https://exemple.fr/api/auth';

/**
 * Constant SEO
 *
 * @description
 * Settings without Google values; the tests supply their sources.
 */
const SEO: ContentSeoOptions = {
  siteOrigin: 'https://valentin-fortin.pro',
  credentialsPath: null,
  searchConsoleProperty: null,
  analyticsPropertyId: null,
  pageSpeedApiKey: null,
  webVitalsUrls: [],
};

/**
 * Interface DashboardBody
 *
 * @description
 * Fields of the dashboard response read by these tests (composition cannot import the contracts;
 * the HTTP adapter specs check them).
 */
interface DashboardBody {
  readonly refresh: { readonly running: boolean; readonly nextAllowedAt: string | null };
  readonly searchConsole: {
    readonly status: string;
    readonly data?: { readonly totals: { readonly clicks: number } };
  };
  readonly analytics: { readonly status: string; readonly missing?: readonly string[] };
  readonly webVitals: { readonly status: string };
  readonly audit: {
    readonly projects: readonly { readonly slug: string }[];
    readonly sitemap: { readonly pages: number; readonly urls: number };
  };
}

describe('ContentModule', (): void => {
  describe('SEO dashboard', (): void => {
    let app: INestApplication<Server>;
    let token: string;
    let mediaDirectory: string;
    const measured: string[] = [];
    const sources: SeoSources = {
      searchConsole: {
        reader: {
          report: async (window: ReportWindow): Promise<SearchConsoleReport> => {
            const totals: SearchMetrics = {
              clicks: window.range === '7d' ? 7 : 28,
              impressions: 100,
              ctr: 0.1,
              position: 3,
            };
            return { totals, previous: totals, daily: [], queries: [], pages: [], devices: [] };
          },
        },
      },
      analytics: { missing: ['SEO_GA4_PROPERTY_ID'] },
      webVitals: {
        reader: {
          measure: async (url: string): Promise<WebVitalsMeasure> => {
            measured.push(url);
            return { field: null, lab: { performanceScore: 99, lcpMs: 900, cls: 0, tbtMs: 0 } };
          },
        },
      },
    };

    beforeAll(async (): Promise<void> => {
      mediaDirectory = mkdtempSync(join(tmpdir(), 'content-seo-media-'));
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
        imports: [
          ObservabilityModule.forRoot({ service: 'content-test', level: 'silent', pretty: false }),
          AdminAuthModule.forRoot({ issuer: ISSUER, jwks: { keys: [jwk] } }),
          ContentModule.register({
            databaseUrl: 'pglite:memory',
            siteBuild: null,
            workers: false,
            mediaDirectory,
            siteBuildDispatcher: { dispatch: async (): Promise<void> => undefined },
            seo: { ...SEO, sources },
            prepare: async (database: ContentDatabaseHandle): Promise<void> => {
              await migrateContentDatabase(database, MIGRATIONS);
              await seedContent(database.db);
            },
          }),
        ],
      }).compile();
      const express: NestExpressApplication =
        moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false });
      configureContentHttp(express, { mediaDirectory, serveMedia: false });
      app = express as unknown as INestApplication<Server>;
      app.setGlobalPrefix('api', { exclude: ['health/live', 'health/ready'] });
      await app.init();
    });

    afterAll(async (): Promise<void> => {
      await app.close();
      rmSync(mediaDirectory, { recursive: true, force: true });
    });

    const dashboard = async (range: string = '28d'): Promise<DashboardBody> => {
      const response: request.Response = await request(app.getHttpServer())
        .get(`/api/content/admin/seo/dashboard?range=${range}`)
        .set('authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);
      return response.body as DashboardBody;
    };

    it('is reserved to the administrator', async (): Promise<void> => {
      expect(
        (await request(app.getHttpServer()).get('/api/content/admin/seo/dashboard')).status,
      ).toBe(401);
    });

    it('audits the seeded projects before any refresh', async (): Promise<void> => {
      const body: DashboardBody = await dashboard();
      expect(body.searchConsole.status).toBe('pending');
      expect(body.analytics).toEqual({
        status: 'not-configured',
        fetchedAt: null,
        missing: ['SEO_GA4_PROPERTY_ID'],
      });
      expect(body.audit.projects.map((project: { slug: string }): string => project.slug)).toEqual([
        'movah',
        'rdi-manager',
        'crm-kodoka',
        'iotplatform',
      ]);
      expect(body.audit.sitemap).toEqual({ pages: 7, urls: 14 });
    });

    it('refreshes in the background into the cache, then throttles', async (): Promise<void> => {
      const started: request.Response = await request(app.getHttpServer())
        .post('/api/content/admin/seo/dashboard/refresh')
        .set('authorization', `Bearer ${token}`);
      expect(started.status).toBe(202);
      await vi.waitFor(async (): Promise<void> => {
        const body: DashboardBody = await dashboard();
        expect(body.refresh.running).toBe(false);
        expect(body.webVitals.status).toBe('ok');
      });
      expect((await dashboard()).searchConsole).toMatchObject({
        status: 'ok',
        data: { totals: { clicks: 28 } },
      });
      expect((await dashboard('7d')).searchConsole).toMatchObject({
        data: { totals: { clicks: 7 } },
      });
      expect(measured).toContain('https://valentin-fortin.pro/fr/projects/movah');
      expect((await dashboard()).refresh.nextAllowedAt).not.toBeNull();

      const again: request.Response = await request(app.getHttpServer())
        .post('/api/content/admin/seo/dashboard/refresh')
        .set('authorization', `Bearer ${token}`);
      expect(again.status).toBe(429);
      expect(again.body.code).toBe('content.seo-refresh-too-soon');
      expect(again.headers['retry-after']).toMatch(/GMT$/);
    });
  });
});

describe('seoSources', (): void => {
  it('names the settings each unconfigured source lacks', (): void => {
    expect(seoSources(SEO)).toEqual({
      searchConsole: { missing: ['SEO_GOOGLE_CREDENTIALS_PATH', 'SEO_SEARCH_CONSOLE_PROPERTY'] },
      analytics: { missing: ['SEO_GOOGLE_CREDENTIALS_PATH', 'SEO_GA4_PROPERTY_ID'] },
      webVitals: { missing: ['SEO_PAGESPEED_API_KEY'] },
    });
    expect(
      seoSources({ ...SEO, credentialsPath: '/run/secrets/seo_google_credentials' }).analytics,
    ).toEqual({ missing: ['SEO_GA4_PROPERTY_ID'] });
  });

  it('wires the Google adapters of a complete configuration', (): void => {
    const sources: SeoSources = seoSources({
      ...SEO,
      credentialsPath: '/run/secrets/seo_google_credentials',
      searchConsoleProperty: 'sc-domain:valentin-fortin.pro',
      analyticsPropertyId: '123456789',
      pageSpeedApiKey: 'key',
    });
    expect('reader' in sources.searchConsole && sources.searchConsole.reader).toBeInstanceOf(
      GoogleSearchConsoleReader,
    );
    expect('reader' in sources.analytics && sources.analytics.reader).toBeInstanceOf(
      GoogleAnalyticsReader,
    );
    expect('reader' in sources.webVitals && sources.webVitals.reader).toBeInstanceOf(
      PageSpeedWebVitalsReader,
    );
  });
});
