import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Server } from 'node:http';
import { AdminAuthModule } from '@vfortin/backend-auth';
import { ObservabilityModule } from '@vfortin/backend-observability';
import {
  type ContentDatabaseHandle,
  migrateContentDatabase,
  seedContent,
} from '@vfortin/content-adapters-out';
import { DispatchSiteBuild, MEDIA_GRACE_MS, PurgeMedia } from '@vfortin/content-application';
import { type JWK, SignJWT, exportJWK, generateKeyPair } from 'jose';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';
import request from 'supertest';
import { ContentModule } from '@internal/content-composition/lib/content.module';
import { configureContentHttp } from '@internal/content-composition/lib/http/content-http/content-http';

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
 * Interface AdminProject
 *
 * @description
 * Fields of an administrator project response read by these tests (composition cannot import the
 * contracts; the HTTP adapter specs check them).
 */
interface AdminProject {
  readonly id: string;
  readonly slug: string;
  readonly version: number;
  readonly position: number;
  readonly title: { readonly fr: string; readonly en?: string };
  readonly missing: readonly string[];
  readonly media: readonly Media[];
  readonly cover: unknown;
  readonly seo: {
    readonly title: { readonly fr?: string; readonly en?: string };
    readonly description: { readonly fr?: string; readonly en?: string };
    readonly keywords: { readonly fr: readonly string[]; readonly en?: readonly string[] };
  };
}

/**
 * Interface Media
 *
 * @description
 * Media response read by these tests.
 */
interface Media {
  readonly id: string;
  readonly src: string;
  readonly width: number;
  readonly height: number;
}

/**
 * Function solidPng
 *
 * @description
 * Encodes a plain blue RGB PNG without an image library (sharp stays confined to the adapters).
 *
 * @param {number} width - Width in pixels.
 * @param {number} height - Height in pixels.
 * @returns {Buffer} PNG file.
 */
function solidPng(width: number, height: number): Buffer {
  const chunk = (type: string, data: Buffer): Buffer => {
    const body: Buffer = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const framed: Buffer = Buffer.alloc(body.length + 8);
    framed.writeUInt32BE(data.length, 0);
    body.copy(framed, 4);
    framed.writeUInt32BE(crc32(body), body.length + 4);
    return framed;
  };
  const header: Buffer = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  // Each row: filter byte 0, then RGB pixels.
  const row: Buffer = Buffer.alloc(1 + width * 3);
  for (let x: number = 0; x < width; x++) row.set([10, 80, 160], 1 + x * 3);
  const pixels: Buffer = Buffer.concat(Array.from({ length: height }, (): Buffer => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

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
  let mediaDirectory: string;
  const dispatched: number[] = [];
  const clock: { current: Date; now(): Date } = {
    current: new Date('2026-11-02T10:00:00Z'),
    now(): Date {
      return this.current;
    },
  };

  beforeAll(async (): Promise<void> => {
    mediaDirectory = mkdtempSync(join(tmpdir(), 'content-module-media-'));
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
          mediaDirectory,
          clock,
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
    const express: NestExpressApplication = moduleRef.createNestApplication<NestExpressApplication>(
      {
        bodyParser: false,
      },
    );
    configureContentHttp(express, { mediaDirectory, serveMedia: true });
    app = express as unknown as INestApplication<Server>;
    app.setGlobalPrefix('api', { exclude: ['health/live', 'health/ready'] });
    await app.init();
  });

  afterAll(async (): Promise<void> => {
    await app.close();
    rmSync(mediaDirectory, { recursive: true, force: true });
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
    expect(response.body.projects[0].article.content[0]).toEqual({
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Contexte' }],
    });
    expect(response.body.projects[0].cover).toBeNull();
  });

  it('serves the English snapshot', async (): Promise<void> => {
    const response: request.Response = await request(app.getHttpServer()).get(
      '/api/content/snapshot?locale=en',
    );
    expect(response.status).toBe(200);
    expect(response.body.locale).toBe('en');
    expect(response.body.skills[0].domain).toBe('Front end');
    expect(response.body.projects[0].article.content[0].content[0].text).toBe('Context');
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

    it('lists every seeded project, complete and matching the contract', async (): Promise<void> => {
      const response: request.Response = await admin().get('/api/content/admin/projects').set(auth);
      expect(response.status).toBe(200);
      expect(response.body.totalItems).toBe(4);
      for (const member of response.body.member) {
        expect(member).toMatchObject({
          version: 1,
          missing: [],
          media: [],
          cover: null,
        });
      }
      expect(response.body.member[0].slug).toBe('movah');
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
      const current: AdminProject = (
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

    it('answers 413 http.413 for a JSON body above 1 MB, as problem+json', async (): Promise<void> => {
      const current: AdminProject = (
        await admin().get('/api/content/admin/projects/project-crm-kodoka').set(auth)
      ).body;
      const response: request.Response = await admin()
        .put('/api/content/admin/projects/project-crm-kodoka')
        .set(auth)
        .set('if-match', `"${current.version}"`)
        .send({ ...current, padding: 'x'.repeat(1024 * 1024) });
      expect(response.status).toBe(413);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.body.code).toBe('http.413');
    });

    it('saves the search texts and publishes them per locale, without fallback', async (): Promise<void> => {
      const current: AdminProject = (
        await admin().get('/api/content/admin/projects/project-crm-kodoka').set(auth)
      ).body;
      expect(current.seo).toEqual({ title: {}, description: {}, keywords: { fr: [] } });
      const seo: AdminProject['seo'] = {
        title: { fr: 'CRM Kodoka, un outil sur mesure' },
        description: { en: 'A custom CRM built for Kodoka.' },
        keywords: { fr: ['CRM', 'outil métier'], en: ['custom CRM'] },
      };
      const saved: request.Response = await admin()
        .put('/api/content/admin/projects/project-crm-kodoka')
        .set(auth)
        .set('if-match', `"${current.version}"`)
        .send({ ...current, seo });
      expect(saved.status).toBe(200);
      expect(saved.body.seo).toEqual(seo);
      const kodoka = async (locale: string): Promise<unknown> =>
        (
          (await admin().get(`/api/content/snapshot?locale=${locale}`)).body as {
            projects: { slug: string; seo: unknown }[];
          }
        ).projects.find((p): boolean => p.slug === 'crm-kodoka')?.seo;
      await expect(kodoka('fr')).resolves.toEqual({
        title: 'CRM Kodoka, un outil sur mesure',
        description: null,
        keywords: ['CRM', 'outil métier'],
      });
      await expect(kodoka('en')).resolves.toEqual({
        title: null,
        description: 'A custom CRM built for Kodoka.',
        keywords: ['custom CRM'],
      });
    });

    describe('media', (): void => {
      let uploaded: Media;

      it('uploads an image, re-encoded and stored under its id', async (): Promise<void> => {
        const png: Buffer = solidPng(1600, 900);
        const response: request.Response = await admin()
          .post('/api/content/admin/media')
          .set(auth)
          .attach('file', png, 'cover.png');
        expect(response.status).toBe(201);
        uploaded = response.body;
        expect(uploaded).toEqual({
          id: expect.stringMatching(/^[0-9a-f-]{36}$/),
          src: `/media/${uploaded.id}.webp`,
          width: 1600,
          height: 900,
        });
        expect(readdirSync(mediaDirectory).sort()).toEqual([
          `${uploaded.id}-960.webp`,
          `${uploaded.id}.webp`,
        ]);
        const again: request.Response = await admin()
          .post('/api/content/admin/media')
          .set(auth)
          .attach('file', png, 'same.png');
        expect(again.body.id).toBe(uploaded.id);
      });

      it('refuses a file that is not an image (415) and an anonymous upload (401)', async (): Promise<void> => {
        const svg: Buffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>');
        const refused: request.Response = await admin()
          .post('/api/content/admin/media')
          .set(auth)
          .attach('file', svg, 'image.svg');
        expect(refused.status).toBe(415);
        expect(refused.body.code).toBe('content.media-unsupported');
        const anonymous: request.Response = await admin()
          .post('/api/content/admin/media')
          .attach('file', svg, 'image.svg');
        expect(anonymous.status).toBe(401);
      });

      it('serves the files with an immutable cache and nosniff, and nothing else', async (): Promise<void> => {
        const full: request.Response = await admin().get(uploaded.src);
        expect(full.status).toBe(200);
        expect(full.headers['content-type']).toBe('image/webp');
        expect(full.headers['cache-control']).toBe('public, max-age=31536000, immutable');
        expect(full.headers['x-content-type-options']).toBe('nosniff');
        expect((await admin().get(`/media/${uploaded.id}-960.webp`)).status).toBe(200);
        for (const path of [
          `/media/${uploaded.id}.webp.tmp`,
          '/media/0b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e.webp',
          '/media/',
          '/media/../package.json',
        ]) {
          const missing: request.Response = await admin().get(path);
          expect(missing.status).toBe(404);
          expect(missing.headers['content-type']).toContain('application/problem+json');
        }
      });

      it('saves a cover, lists the media, then refuses an unknown one (422)', async (): Promise<void> => {
        const current: AdminProject = (
          await admin().get('/api/content/admin/projects/project-iotplatform').set(auth)
        ).body;
        const saved: request.Response = await admin()
          .put('/api/content/admin/projects/project-iotplatform')
          .set(auth)
          .set('if-match', `"${current.version}"`)
          .send({ ...current, cover: { media: uploaded.id, alt: { fr: 'Tableau', en: 'Board' } } });
        expect(saved.status).toBe(200);
        expect(saved.body.media).toEqual([uploaded]);
        const snapshot: { projects: { slug: string; cover: unknown }[] } = (
          await admin().get('/api/content/snapshot?locale=en')
        ).body;
        expect(snapshot.projects.find((p): boolean => p.slug === 'iotplatform')?.cover).toEqual({
          src: uploaded.src,
          small: `/media/${uploaded.id}-960.webp`,
          width: 1600,
          height: 900,
          alt: 'Board',
        });

        const unknown: string = '0b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e';
        const refused: request.Response = await admin()
          .put('/api/content/admin/projects/project-iotplatform')
          .set(auth)
          .set('if-match', `"${saved.body.version}"`)
          .send({
            ...current,
            cover: { media: unknown, alt: { fr: 'Tableau', en: 'Board' } },
          });
        expect(refused.status).toBe(422);
        expect(refused.body).toMatchObject({ code: 'content.media-not-found', details: [unknown] });
      });

      it('purges a media seven days after its last reference was removed', async (): Promise<void> => {
        const current: AdminProject = (
          await admin().get('/api/content/admin/projects/project-iotplatform').set(auth)
        ).body;
        const cleared: request.Response = await admin()
          .put('/api/content/admin/projects/project-iotplatform')
          .set(auth)
          .set('if-match', `"${current.version}"`)
          .send({ ...current, cover: null });
        expect(cleared.body.media).toEqual([]);
        const purge: PurgeMedia = app.get<PurgeMedia>(PurgeMedia);
        await expect(purge.execute()).resolves.toEqual({ purged: [] });
        clock.current = new Date(clock.current.getTime() + MEDIA_GRACE_MS + 1);
        await expect(purge.execute()).resolves.toEqual({ purged: [uploaded.id] });
        expect(existsSync(join(mediaDirectory, `${uploaded.id}.webp`))).toBe(false);
        expect(readdirSync(mediaDirectory)).toEqual([]);
      });
    });

    it('accepts every seeded project back unchanged through the revision contract', async (): Promise<void> => {
      const list: { member: AdminProject[] } = (
        await admin().get('/api/content/admin/projects').set(auth)
      ).body;
      for (const project of list.member) {
        const response: request.Response = await admin()
          .put(`/api/content/admin/projects/${project.id}`)
          .set(auth)
          .set('if-match', `"${project.version}"`)
          .send(project);
        expect([project.slug, response.status]).toEqual([project.slug, 200]);
      }
    });

    it('creates a draft after the last project, with a free slug from its French title', async (): Promise<void> => {
      const list: { member: AdminProject[] } = (
        await admin().get('/api/content/admin/projects').set(auth)
      ).body;
      const source: AdminProject | undefined = list.member.find(
        (project: AdminProject): boolean => project.slug === 'movah',
      );
      if (!source) throw new Error('movah missing');
      const created: request.Response = await admin()
        .post('/api/content/admin/projects')
        .set(auth)
        .send({ ...source, title: { fr: 'Movah', en: 'Movah' } });
      expect(created.status).toBe(201);
      expect(created.headers['etag']).toBe('"1"');
      expect(created.body).toMatchObject({ slug: 'movah-2', status: 'draft', version: 1 });
      expect(created.body.position).toBeGreaterThan(
        Math.max(...list.member.map((project: AdminProject): number => project.position)),
      );
      const read: request.Response = await admin()
        .get(`/api/content/admin/projects/${created.body.id}`)
        .set(auth);
      expect(read.status).toBe(200);
      expect(read.body.title).toEqual({ fr: 'Movah', en: 'Movah' });
      expect((await admin().post('/api/content/admin/projects').send(source)).status).toBe(401);
    });

    describe('timeline', (): void => {
      const base: string = '/api/content/admin/timeline';
      const body: Record<string, unknown> = {
        title: { fr: 'Stage, Atelier', en: 'Internship, Atelier' },
        place: { fr: 'Blois', en: 'Blois' },
        description: { fr: 'Outils internes.', en: 'Internal tools.' },
        start: { year: 2025, month: 2 },
        end: null,
        techs: ['vue'],
      };

      it('refuses an anonymous call before its body (401)', async (): Promise<void> => {
        const response: request.Response = await admin()
          .post(`${base}/experience/entries`)
          .send({ title: 1 });
        expect(response.status).toBe(401);
      });

      it('creates, edits, moves and deletes an experience, each time queueing a rebuild', async (): Promise<void> => {
        const before: number = dispatched.length;
        const list: request.Response = await admin().get(`${base}/experience/entries`).set(auth);
        expect(list.status).toBe(200);
        expect(list.body.member.map((e: { id: string }): string => e.id)).toEqual([
          'utopia',
          'kodoka',
          'object-as-a-service',
        ]);
        const listVersion: string = list.headers['etag'] as string;

        const created: request.Response = await admin()
          .post(`${base}/experience/entries`)
          .set(auth)
          .send(body);
        expect(created.status).toBe(201);
        expect(created.headers['etag']).toBe('"1"');
        expect(created.body).toMatchObject({ kind: 'experience', position: 3, end: null });
        const id: string = created.body.id;

        // The creation changed the list: the version read before it is stale.
        const stale: request.Response = await admin()
          .put(`${base}/experience/order`)
          .set(auth)
          .set('if-match', listVersion)
          .send({ ids: [id, 'utopia', 'kodoka', 'object-as-a-service'] });
        expect(stale.status).toBe(412);

        const revised: request.Response = await admin()
          .put(`${base}/experience/entries/${id}`)
          .set(auth)
          .set('if-match', '"1"')
          .send({ ...body, end: { year: 2025, month: 7 } });
        expect(revised.status).toBe(200);
        expect(revised.headers['etag']).toBe('"2"');

        const current: request.Response = await admin().get(`${base}/experience/entries`).set(auth);
        const moved: request.Response = await admin()
          .put(`${base}/experience/order`)
          .set(auth)
          .set('if-match', current.headers['etag'] as string)
          .send({ ids: [id, 'utopia', 'kodoka', 'object-as-a-service'] });
        expect(moved.status).toBe(200);
        expect(moved.body.member[0]).toMatchObject({ id, position: 0, version: 2 });

        // The snapshot follows the dates, not the position just written (D36).
        const snapshot: request.Response = await admin().get('/api/content/snapshot?locale=en');
        expect(
          snapshot.body.timeline
            .filter((e: { kind: string }): boolean => e.kind === 'experience')
            .map((e: { title: string }): string => e.title),
        ).toEqual([
          'Front-end web developer, Utopia',
          'Full-stack web developer, Kodoka',
          'Full-stack web developer, Object as a Service',
          'Internship, Atelier',
        ]);

        expect(
          (
            await admin()
              .delete(`${base}/experience/entries/${id}`)
              .set(auth)
              .set('if-match', '"1"')
          ).status,
        ).toBe(412);
        const deleted: request.Response = await admin()
          .delete(`${base}/experience/entries/${id}`)
          .set(auth)
          .set('if-match', '"2"');
        expect(deleted.status).toBe(200);
        expect(deleted.body.member.map((e: { position: number }): number => e.position)).toEqual([
          0, 1, 2,
        ]);
        expect((await admin().get(`${base}/experience/entries/${id}`).set(auth)).status).toBe(404);

        await app.get<DispatchSiteBuild>(DispatchSiteBuild).execute();
        expect(dispatched.length).toBe(before + 1);
      });

      it('refuses an entry without English (422) and an entry of the other kind (404)', async (): Promise<void> => {
        const incomplete: request.Response = await admin()
          .post(`${base}/education/entries`)
          .set(auth)
          .send({ ...body, title: { fr: 'Licence' } });
        expect(incomplete.status).toBe(422);
        expect(incomplete.body.errors).toEqual([
          { field: 'title.en', message: expect.any(String) },
        ]);
        expect((await admin().get(`${base}/education/entries/kodoka`).set(auth)).status).toBe(404);
      });

      it('accepts every seeded entry back unchanged through the request contract', async (): Promise<void> => {
        for (const kind of ['education', 'experience']) {
          const list: { member: (Record<string, unknown> & { id: string; version: number })[] } = (
            await admin().get(`${base}/${kind}/entries`).set(auth)
          ).body;
          for (const { id, version, title, place, description, start, end, techs } of list.member) {
            const response: request.Response = await admin()
              .put(`${base}/${kind}/entries/${id}`)
              .set(auth)
              .set('if-match', `"${version}"`)
              .send({ title, place, description, start, end, techs });
            expect([id, response.status]).toEqual([id, 200]);
          }
        }
      });
    });

    describe('site texts', (): void => {
      it('refuses an anonymous call before its body (401)', async (): Promise<void> => {
        expect((await admin().put('/api/content/admin/profile').send({ facts: 1 })).status).toBe(
          401,
        );
        expect((await admin().get('/api/content/admin/legal/notice')).status).toBe(401);
      });

      it('accepts the seeded profile back, then publishes a new link', async (): Promise<void> => {
        const before: number = dispatched.length;
        const loaded: request.Response = await admin().get('/api/content/admin/profile').set(auth);
        expect(loaded.status).toBe(200);
        const { version, ...profile } = loaded.body as Record<string, unknown> & {
          version: number;
          links: unknown[];
        };
        expect(loaded.headers['etag']).toBe(`"${version}"`);
        const saved: request.Response = await admin()
          .put('/api/content/admin/profile')
          .set(auth)
          .set('if-match', `"${version}"`)
          .send({
            ...profile,
            links: [
              ...profile.links,
              { kind: 'malt', url: 'https://www.malt.fr/profile/valentin', label: null },
            ],
          });
        expect(saved.status).toBe(200);
        expect(saved.headers['etag']).toBe(`"${version + 1}"`);
        const stale: request.Response = await admin()
          .put('/api/content/admin/profile')
          .set(auth)
          .set('if-match', `"${version}"`)
          .send(profile);
        expect(stale.status).toBe(412);
        const snapshot: request.Response = await admin().get('/api/content/snapshot?locale=fr');
        expect(
          snapshot.body.profile.links.map((link: { kind: string }): string => link.kind),
        ).toEqual(['email', 'github', 'linkedin', 'malt']);
        await app.get<DispatchSiteBuild>(DispatchSiteBuild).execute();
        expect(dispatched.length).toBe(before + 1);
      });

      it('accepts each seeded legal document back, dated by the save', async (): Promise<void> => {
        for (const kind of ['notice', 'privacy']) {
          const loaded: request.Response = await admin()
            .get(`/api/content/admin/legal/${kind}`)
            .set(auth);
          expect(loaded.status).toBe(200);
          const saved: request.Response = await admin()
            .put(`/api/content/admin/legal/${kind}`)
            .set(auth)
            .set('if-match', loaded.headers['etag'] as string)
            .send({ body: loaded.body.body });
          expect([kind, saved.status]).toEqual([kind, 200]);
          expect(saved.body.version).toBe(loaded.body.version + 1);
        }
        const snapshot: request.Response = await admin().get('/api/content/snapshot?locale=en');
        expect(snapshot.body.legal.privacy.updatedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(snapshot.body.legal.notice.document.content[0]).toEqual({
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Publisher' }],
        });
      });

      it('refuses an empty English document (422 on body.en)', async (): Promise<void> => {
        const loaded: request.Response = await admin()
          .get('/api/content/admin/legal/privacy')
          .set(auth);
        const response: request.Response = await admin()
          .put('/api/content/admin/legal/privacy')
          .set(auth)
          .set('if-match', loaded.headers['etag'] as string)
          .send({
            body: {
              fr: loaded.body.body.fr,
              en: { type: 'doc', content: [{ type: 'paragraph' }] },
            },
          });
        expect(response.status).toBe(422);
        expect(response.body.errors).toEqual([{ field: 'body.en', message: expect.any(String) }]);
      });
    });
  });
});
