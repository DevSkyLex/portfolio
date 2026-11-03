import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Server } from 'node:http';
import { AdminAuthModule } from '@vfortin/backend-auth';
import { ObservabilityModule } from '@vfortin/backend-observability';
import {
  type ContentDatabaseHandle,
  migrateContentDatabase,
  seedContent,
} from '@vfortin/content-adapters-out';
import { DispatchSiteBuild } from '@vfortin/content-application';
import { type JWK, SignJWT, exportJWK, generateKeyPair } from 'jose';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { ContentModule } from '@internal/content-composition/lib/content.module';

/**
 * Constant MIGRATIONS
 *
 * @description
 * Absolute path to the content-service migration folder used to prepare the in-memory database.
 */
const MIGRATIONS: string = fileURLToPath(
  new URL('../../../../../../../apps/content-service/migrations', import.meta.url),
);

/**
 * Constant ISSUER
 *
 * @description
 * Issuer configured for the signed administrator token used by protected-route checks.
 */
const ISSUER: string = 'https://exemple.fr/api/auth';

describe('ContentModule', (): void => {
  let app: INestApplication<Server>;
  let adminToken: string;
  const dispatched: number[] = [];

  beforeAll(async (): Promise<void> => {
    const { publicKey, privateKey } = await generateKeyPair('EdDSA', { crv: 'Ed25519' });
    const jwk: JWK = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'EdDSA' };
    adminToken = await new SignJWT({ role: 'admin', sid: 'f1' })
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
          siteBuildDispatcher: {
            dispatch: async (revision: number): Promise<undefined> =>
              void dispatched.push(revision),
          },
          prepare: async (database: ContentDatabaseHandle): Promise<void> => {
            await migrateContentDatabase(database, MIGRATIONS);
            await seedContent(database.db);
          },
        }),
      ],
    }).compile();
    app = moduleRef.createNestApplication<INestApplication<Server>>();
    app.setGlobalPrefix('api', { exclude: ['health/live', 'health/ready'] });
    await app.init();
  });

  afterAll(async (): Promise<void> => {
    await app.close();
  });

  it('serves the French snapshot matching the contract', async (): Promise<void> => {
    const response: request.Response = await request(app.getHttpServer())
      .get('/api/content/snapshot?locale=fr')
      .set('x-request-id', 'test-1234abcd');
    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBe('test-1234abcd');

    // Contract conformity is checked by the presenter (adapters-in) before sending.
    expect(response.body.locale).toBe('fr');
    expect(response.body.projects.map((p: { slug: string }): string => p.slug)).toEqual([
      'movah',
      'rdi-manager',
      'crm-kodoka',
      'iotplatform',
    ]);
  });

  it('serves the English snapshot', async (): Promise<void> => {
    const response: request.Response = await request(app.getHttpServer()).get(
      '/api/content/snapshot?locale=en',
    );
    expect(response.status).toBe(200);
    expect(response.body.locale).toBe('en');
    expect(response.body.skills[0].domain).toBe('Front end');
  });

  it('rejects an unknown locale as problem+json', async (): Promise<void> => {
    const response: request.Response = await request(app.getHttpServer()).get(
      '/api/content/snapshot?locale=de',
    );
    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body.code).toBe('request.invalid');
    expect(response.body.errors[0].field).toBe('locale');
  });

  it('exposes the database readiness', async (): Promise<void> => {
    const response: request.Response = await request(app.getHttpServer()).get('/health/ready');
    expect(response.status).toBe(200);
    expect(response.body.info.database.status).toBe('up');
  });

  describe('administration', (): void => {
    const admin = (): ReturnType<typeof request> => request(app.getHttpServer());
    const auth: { authorization: string } = { authorization: '' };
    beforeAll((): void => {
      auth.authorization = `Bearer ${adminToken}`;
    });

    it('requires an administrator token', async (): Promise<void> => {
      expect((await admin().get('/api/content/admin/projects')).status).toBe(401);
    });

    it('lists every project with its version', async (): Promise<void> => {
      const response: request.Response = await admin().get('/api/content/admin/projects').set(auth);
      expect(response.status).toBe(200);
      expect(response.body.totalItems).toBe(4);
      expect(response.body.member[0]).toMatchObject({ slug: 'movah', version: 1, missing: [] });
    });

    it('requires If-Match, then rejects a stale version', async (): Promise<void> => {
      const path: string = '/api/content/admin/projects/project-movah/unpublish';
      expect((await admin().post(path).set(auth)).status).toBe(428);
      expect((await admin().post(path).set(auth).set('if-match', '"9"')).status).toBe(412);
    });

    it('unpublishes, returns the new version and requests a site rebuild', async (): Promise<void> => {
      const response: request.Response = await admin()
        .post('/api/content/admin/projects/project-movah/unpublish')
        .set(auth)
        .set('if-match', '"1"');
      expect(response.status).toBe(200);
      expect(response.headers['etag']).toBe('"2"');
      expect(response.body.status).toBe('draft');
      await expect(app.get<DispatchSiteBuild>(DispatchSiteBuild).execute()).resolves.toEqual({
        dispatched: 2,
      });
      expect(dispatched).toEqual([2]);
    });

    it('refuses to empty the English text of a published project', async (): Promise<void> => {
      const current: { readonly version: number; readonly title: { readonly fr: string } } = (
        await admin().get('/api/content/admin/projects/project-rdi-manager').set(auth)
      ).body;
      const response: request.Response = await admin()
        .put('/api/content/admin/projects/project-rdi-manager')
        .set(auth)
        .set('if-match', `"${current.version}"`)
        .send({ ...current, title: { fr: current.title.fr } });
      expect(response.status).toBe(422);
      expect(response.body.details).toContain('title.en');
    });
  });
});
