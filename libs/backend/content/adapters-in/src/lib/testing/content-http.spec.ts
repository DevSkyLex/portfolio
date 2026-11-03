import { type INestApplication, Logger } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Server } from 'node:http';
import type { Mock } from 'vitest';
import { AdminAuthModule } from '@vfortin/backend-auth';
import { PROBLEM_MAPPER, ProblemDetailsFilter } from '@vfortin/backend-http';
import {
  DispatchSiteBuild,
  GetAdminProject,
  GetPublishedContent,
  ListAdminProjects,
  NotFoundError,
  PublishProject,
  type PublishedContent,
  ReviseProject,
  UnpublishProject,
  VersionMismatchError,
} from '@vfortin/content-application';
import {
  AdminProjectDtoSchema,
  ContentSnapshotSchema,
  type ProjectRevisionRequest,
  type ContentSnapshot,
} from '@vfortin/content-contracts';
import {
  DomainError,
  LocalizedText,
  Period,
  Project,
  type ProjectRevision,
  Slug,
} from '@vfortin/content-domain';
import { type JWK, SignJWT, exportJWK, generateKeyPair } from 'jose';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import { AdminContentController } from '@internal/content-adapters-in/lib/http/controllers/admin-content/admin-content.controller';
import {
  toAdminProjectDto,
  toProjectRevision,
} from '@internal/content-adapters-in/lib/http/presenters/admin-project/admin-project.presenter';
import { contentProblemMapper } from '@internal/content-adapters-in/lib/http/mappers/content-problem/content-problem.mapper';
import { ContentController } from '@internal/content-adapters-in/lib/http/controllers/content/content.controller';
import { SiteBuildJobs } from '@internal/content-adapters-in/lib/jobs/site-build/site-build.jobs';

/**
 * Constant ISSUER
 *
 * @description
 * Issuer claim used by the test JWT and the configured admin authentication module.
 */
const ISSUER: string = 'https://exemple.fr/api/auth';

/**
 * Constant FIXTURE
 *
 * @description
 * Contract fixture used by content contract tests and this HTTP adapter test, converted into a domain project.
 */
const FIXTURE: ProjectRevisionRequest & {
  id: string;
  slug: string;
  status: 'draft' | 'published';
} = JSON.parse(
  readFileSync(
    new URL(
      '../../../../../../contracts/content/src/lib/testing/admin-project.fixture.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as ProjectRevisionRequest & { id: string; slug: string; status: 'draft' | 'published' };

/**
 * Function projectFromFixture
 *
 * @description
 * Builds a valid project aggregate from the shared request fixture with a chosen persistence version.
 *
 * @param {number} version - Version stored on the generated aggregate; defaults to 3.
 * @returns {Project} Rehydrated project used by HTTP adapter tests.
 */
function projectFromFixture(version: number = 3): Project {
  return Project.rehydrate({
    ...toProjectRevision(FIXTURE),
    id: FIXTURE.id,
    slug: Slug.of(FIXTURE.slug),
    status: FIXTURE.status,
    position: 0,
    version,
  });
}

/**
 * Constant t
 *
 * @description
 * Creates localized domain text for HTTP presenter test fixtures.
 *
 * @param {string} fr - French source text.
 * @param {string} en - Optional English translation.
 * @returns {LocalizedText} Normalized localized value.
 */
const t: (fr: string, en?: string) => LocalizedText = (fr: string, en?: string): LocalizedText =>
  LocalizedText.of('t', en === undefined ? { fr } : { fr, en });

/**
 * Constant published
 *
 * @description
 * Public content fixture used to exercise locale conversion and response contracts.
 */
const published: PublishedContent = {
  revision: 4,
  profile: {
    heroIntro: t('Bonjour', 'Hello'),
    aboutStatement: t('A'),
    aboutLead: t('L'),
    facts: [{ label: t('Basé à', 'Based in'), value: t('Blois') }],
  },
  projects: [projectFromFixture()],
  timeline: [
    {
      id: 'bts',
      kind: 'education',
      title: t('BTS'),
      place: t('Tours'),
      description: t('Lycée'),
      period: Period.of({ year: 2021, month: 9 }, { year: 2023, month: 6 }),
      techs: ['php'],
    },
  ],
  skills: [
    {
      id: 'front',
      domain: t('Front'),
      techs: [{ key: 'angular', language: null }],
      usage: t('Interfaces'),
      position: 0,
    },
  ],
};

describe('ContentController and AdminContentController', (): void => {
  let app: INestApplication<Server>;
  let token: string;
  const useCases = {
    published: { execute: vi.fn<GetPublishedContent['execute']>() },
    list: { execute: vi.fn<ListAdminProjects['execute']>() },
    get: { execute: vi.fn<GetAdminProject['execute']>() },
    revise: { execute: vi.fn<ReviseProject['execute']>() },
    publish: { execute: vi.fn<PublishProject['execute']>() },
    unpublish: { execute: vi.fn<UnpublishProject['execute']>() },
  } satisfies {
    published: Pick<GetPublishedContent, 'execute'>;
    list: Pick<ListAdminProjects, 'execute'>;
    get: Pick<GetAdminProject, 'execute'>;
    revise: Pick<ReviseProject, 'execute'>;
    publish: Pick<PublishProject, 'execute'>;
    unpublish: Pick<UnpublishProject, 'execute'>;
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
      controllers: [ContentController, AdminContentController],
      providers: [
        { provide: GetPublishedContent, useValue: useCases.published },
        { provide: ListAdminProjects, useValue: useCases.list },
        { provide: GetAdminProject, useValue: useCases.get },
        { provide: ReviseProject, useValue: useCases.revise },
        { provide: PublishProject, useValue: useCases.publish },
        { provide: UnpublishProject, useValue: useCases.unpublish },
        { provide: PROBLEM_MAPPER, useValue: contentProblemMapper },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
    }).compile();
    app = moduleRef.createNestApplication<INestApplication<Server>>();
    await app.init();
  });

  afterAll(async (): Promise<void> => {
    await app.close();
  });

  beforeEach((): void => {
    vi.clearAllMocks();
  });

  const server = (): ReturnType<typeof request> => request(app.getHttpServer());
  const admin: (call: request.Test) => request.Test = (call: request.Test): request.Test =>
    call.set('authorization', `Bearer ${token}`);

  describe('public snapshot', (): void => {
    it('serves the content in the requested locale, matching the contract', async (): Promise<void> => {
      useCases.published.execute.mockResolvedValue(published);
      const response: request.Response = await server().get('/content/snapshot?locale=en');
      expect(response.status).toBe(200);
      expect(response.headers['cache-control']).toBe('no-store');
      const snapshot: ContentSnapshot = ContentSnapshotSchema.parse(response.body);
      expect(snapshot).toMatchObject({ locale: 'en', revision: 4 });
      expect(snapshot.profile.heroIntro).toBe('Hello');

      // Untranslated text falls back to French.
      expect(snapshot.profile.facts[0]).toEqual({ label: 'Based in', value: 'Blois' });
      expect(snapshot.timeline[0]).toMatchObject({ start: { year: 2021, month: 9 } });
    });

    it('rejects an unknown locale as problem+json', async (): Promise<void> => {
      const response: request.Response = await server().get('/content/snapshot?locale=de');
      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.body.errors[0].field).toBe('locale');
      expect(useCases.published.execute).not.toHaveBeenCalled();
    });
  });

  describe('administration', (): void => {
    it('requires an administrator token', async (): Promise<void> => {
      const response: request.Response = await server().get('/content/admin/projects');
      expect(response.status).toBe(401);
      expect(response.body.code).toBe('auth.unauthorized');
    });

    it('lists the projects with their version', async (): Promise<void> => {
      useCases.list.execute.mockResolvedValue([projectFromFixture()]);
      const response: request.Response = await admin(server().get('/content/admin/projects'));
      expect(response.status).toBe(200);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.body).toMatchObject({
        totalItems: 1,
        member: [{ id: 'project-movah', version: 3 }],
      });
    });

    it('serves a project with its version as ETag', async (): Promise<void> => {
      useCases.get.execute.mockResolvedValue(projectFromFixture());
      const response: request.Response = await admin(
        server().get('/content/admin/projects/project-movah'),
      );
      expect(response.status).toBe(200);
      expect(response.headers['etag']).toBe('"3"');
      expect(AdminProjectDtoSchema.parse(response.body)).toEqual(
        AdminProjectDtoSchema.parse(FIXTURE),
      );
      expect(useCases.get.execute).toHaveBeenCalledWith('project-movah');
    });

    it('revises a project with the version read, and returns the new ETag', async (): Promise<void> => {
      useCases.revise.execute.mockResolvedValue({
        project: projectFromFixture(),
        version: 4,
        revision: 5,
      });
      const response: request.Response = await admin(
        server().put('/content/admin/projects/project-movah').set('if-match', '"3"').send(FIXTURE),
      );
      expect(response.status).toBe(200);
      expect(response.headers['etag']).toBe('"4"');
      expect(response.body.version).toBe(4);
      const [id, version, revision] = useCases.revise.execute.mock.calls[0] ?? [];
      expect([id, version]).toEqual(['project-movah', 3]);
      expect(revision?.title.en).toBe('Movah');
    });

    it('requires If-Match before any change (428)', async (): Promise<void> => {
      const response: request.Response = await admin(
        server().post('/content/admin/projects/project-movah/publish'),
      );
      expect(response.status).toBe(428);
      expect(response.body.code).toBe('request.precondition-required');
      expect(useCases.publish.execute).not.toHaveBeenCalled();
    });

    it('rejects a malformed revision (400) before reaching the use case', async (): Promise<void> => {
      const response: request.Response = await admin(
        server()
          .put('/content/admin/projects/project-movah')
          .set('if-match', '"3"')
          .send({ ...FIXTURE, techs: ['Vue.js'] }),
      );
      expect(response.status).toBe(400);
      expect(response.body.errors[0].field).toBe('techs.0');
      expect(useCases.revise.execute).not.toHaveBeenCalled();
    });

    it.each([
      ['publish', 'publish'],
      ['unpublish', 'unpublish'],
    ] as const)('%ss with optimistic locking', async (path, useCase): Promise<void> => {
      useCases[useCase].execute.mockResolvedValue({
        project: projectFromFixture(),
        version: 8,
        revision: 9,
      });
      const response: request.Response = await admin(
        server().post(`/content/admin/projects/project-movah/${path}`).set('if-match', 'W/"7"'),
      );
      expect(response.status).toBe(200);
      expect(response.headers['etag']).toBe('"8"');
      expect(useCases[useCase].execute).toHaveBeenCalledWith('project-movah', 7);
    });

    it.each([
      [new VersionMismatchError(), 412, 'content.version-mismatch'],
      [new NotFoundError('Project'), 404, 'content.not-found'],
      [
        new DomainError('content.project-incomplete', 'Incomplete.', ['title.en']),
        422,
        'content.project-incomplete',
      ],
    ])('maps %s to problem+json', async (error, status, code): Promise<void> => {
      useCases.publish.execute.mockRejectedValue(error);
      const response: request.Response = await admin(
        server().post('/content/admin/projects/project-movah/publish').set('if-match', '"1"'),
      );
      expect(response.status).toBe(status);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.body.code).toBe(code);
    });
  });
});

describe('toAdminProjectDto, toProjectRevision and contentProblemMapper', (): void => {
  it('lists the fields missing before publication', (): void => {
    const draft: Project = Project.rehydrate({
      ...projectFromFixture().snapshot(),
      title: t('Movah'),
      status: 'draft',
    });
    expect(toAdminProjectDto(draft).missing).toEqual(['title.en', 'article.lessons.en']);
  });

  it('keeps a missing translation absent in the revision', (): void => {
    const revision: ProjectRevision = toProjectRevision({ ...FIXTURE, title: { fr: 'Movah' } });
    expect(revision.title.toProps()).toEqual({ fr: 'Movah' });
  });

  it('leaves unknown errors to the filter', (): void => {
    expect(contentProblemMapper(new Error('other'))).toBeNull();
  });
});

describe('SiteBuildJobs', (): void => {
  const run: Mock<DispatchSiteBuild['execute']> = vi.fn<DispatchSiteBuild['execute']>();
  const jobs: SiteBuildJobs = new SiteBuildJobs({ execute: run } as unknown as DispatchSiteBuild);

  beforeEach((): void => {
    run.mockReset();
    vi.spyOn(Logger.prototype, 'log').mockImplementation((): undefined => undefined);
    vi.spyOn(Logger.prototype, 'warn').mockImplementation((): undefined => undefined);
  });

  afterEach((): void => {
    vi.restoreAllMocks();
  });

  it('logs a triggered rebuild, and nothing when there is none', async (): Promise<void> => {
    run.mockResolvedValueOnce({ dispatched: 4 }).mockResolvedValueOnce({ dispatched: null });
    await jobs.dispatchPending();
    await jobs.dispatchPending();
    expect(Logger.prototype.log).toHaveBeenCalledOnce();
    expect(Logger.prototype.log).toHaveBeenCalledWith('Site rebuild triggered (revision 4)');
  });

  it('keeps running after a failure, one run at a time', async (): Promise<void> => {
    let release: () => void = (): undefined => undefined;
    run.mockImplementationOnce(
      (): Promise<{ dispatched: number | null }> =>
        new Promise<{ dispatched: number | null }>(
          (
            _resolve: (
              value: { dispatched: number | null } | PromiseLike<{ dispatched: number | null }>,
            ) => void,
            reject,
          ): (() => void) => (release = (): void => reject(new Error('GitHub 502'))),
        ),
    );
    const first: Promise<void> = jobs.dispatchPending();
    await jobs.dispatchPending();
    expect(run).toHaveBeenCalledOnce();
    release();
    await first;
    expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining('GitHub 502'));
    run.mockResolvedValueOnce({ dispatched: null });
    await jobs.dispatchPending();
    expect(run).toHaveBeenCalledTimes(2);
  });
});
