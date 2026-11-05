import { type ExecutionContext, type INestApplication, Logger } from '@nestjs/common';
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
  MediaMissingError,
  MediaNotFoundError,
  type MediaRecord,
  MediaTooLargeError,
  NotFoundError,
  PublishProject,
  type PublishedContent,
  PurgeMedia,
  ReviseProject,
  CreateProject,
  UnpublishProject,
  UnsupportedMediaError,
  UploadMedia,
  VersionMismatchError,
} from '@vfortin/content-application';
import {
  AdminProjectDtoSchema,
  ContentSnapshotSchema,
  MediaDtoSchema,
  PROJECT_SEO_LIMITS,
  type ProjectRevisionRequest,
  ProjectRevisionRequestSchema,
  type ContentSnapshot,
} from '@vfortin/content-contracts';
import {
  ArticleDocument,
  DomainError,
  LegalDocument,
  type LegalDocumentKind,
  LocalizedText,
  Period,
  Project,
  type ProjectRevision,
  Slug,
  TimelineEntry,
  profileLinks,
} from '@vfortin/content-domain';
import { type JWK, SignJWT, exportJWK, generateKeyPair } from 'jose';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import { AdminContentController } from '@internal/content-adapters-in/lib/http/controllers/admin-content/admin-content.controller';
import { AdminMediaController } from '@internal/content-adapters-in/lib/http/controllers/admin-media/admin-media.controller';
import { MediaUploadInterceptor } from '@internal/content-adapters-in/lib/http/interceptors/media-upload/media-upload.interceptor';
import {
  toAdminProjectDto,
  toProjectRevision,
} from '@internal/content-adapters-in/lib/http/presenters/admin-project/admin-project.presenter';
import { contentProblemMapper } from '@internal/content-adapters-in/lib/http/mappers/content-problem/content-problem.mapper';
import { toContentSnapshot } from '@internal/content-adapters-in/lib/http/presenters/content/content.presenter';
import { ContentController } from '@internal/content-adapters-in/lib/http/controllers/content/content.controller';
import { MediaPurgeJobs } from '@internal/content-adapters-in/lib/jobs/media-purge/media-purge.jobs';
import { SiteBuildJobs } from '@internal/content-adapters-in/lib/jobs/site-build/site-build.jobs';

/**
 * Constant ISSUER
 *
 * @description
 * Issuer claim used by the test JWT and the configured admin authentication module.
 */
const ISSUER: string = 'https://exemple.fr/api/auth';

/**
 * Type AdminFixture
 *
 * @description
 * Raw administrator project fixture: a revision with its identity and media.
 */
type AdminFixture = ProjectRevisionRequest & {
  id: string;
  slug: string;
  status: 'draft' | 'published';
  media: { id: string; src: string; width: number; height: number }[];
};

/**
 * Constant FIXTURE
 *
 * @description
 * Contract fixture used by content contract tests and this HTTP adapter test, converted into a domain
 * project.
 */
const FIXTURE: AdminFixture = JSON.parse(
  readFileSync(
    new URL(
      '../../../../../../contracts/content/src/lib/testing/admin-project.fixture.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as AdminFixture;

/**
 * Constant [COVER, FIGURE]
 *
 * @description
 * Media of the fixture: its cover, then the figure of both documents.
 */
const [COVER, FIGURE] = FIXTURE.media.map((media: AdminFixture['media'][number]): MediaRecord => ({
  id: media.id,
  width: media.width,
  height: media.height,
  bytes: 1000,
  sha256: media.id.replaceAll('-', '').padEnd(64, '0'),
  hasSmall: media.width > 960,
  createdAt: new Date('2026-10-01T00:00:00Z'),
  unlinkedAt: null,
})) as [MediaRecord, MediaRecord];

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
    ...toProjectRevision(ProjectRevisionRequestSchema.parse(FIXTURE)),
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
 * Function legal
 *
 * @description
 * Legal document of one paragraph per language, last saved at 23:30 UTC on 3 November 2026 (already
 * 4 November in Paris).
 *
 * @param {LegalDocumentKind} kind - Document kind.
 * @returns {LegalDocument} Document.
 */
const legal = (kind: LegalDocumentKind): LegalDocument =>
  LegalDocument.rehydrate({
    kind,
    body: LegalDocument.bodyOf({
      fr: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Texte' }] }],
      },
      en: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Text' }] }],
      },
    }),
    updatedAt: new Date('2026-11-03T23:30:00Z'),
    version: 1,
  });

/**
 * Function published
 *
 * @description
 * Public content fixture used to exercise locale conversion, media resolution and response contracts.
 *
 * @param {readonly MediaRecord[]} media - Stored media of the snapshot.
 * @returns {PublishedContent} Published content.
 */
const published = (media: readonly MediaRecord[] = [COVER, FIGURE]): PublishedContent => ({
  revision: 4,
  profile: {
    heroIntro: t('Bonjour', 'Hello'),
    aboutStatement: t('A'),
    aboutLead: t('L'),
    facts: [{ label: t('Basé à', 'Based in'), value: t('Blois') }],
    links: profileLinks([
      { kind: 'email', url: 'mailto:contact@valentin-fortin.pro', label: null },
      { kind: 'website', url: 'https://blog.example', label: 'Blog' },
    ]),
    version: 1,
  },
  projects: [projectFromFixture()],
  timeline: [
    TimelineEntry.rehydrate({
      id: 'bts',
      kind: 'education',
      title: t('BTS'),
      place: t('Tours'),
      description: t('Lycée'),
      period: Period.of({ year: 2021, month: 9 }, { year: 2023, month: 6 }),
      techs: ['php'],
      position: 0,
      version: 1,
    }),
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
  media: new Map(media.map((record: MediaRecord): [string, MediaRecord] => [record.id, record])),
  legal: { notice: legal('notice'), privacy: legal('privacy') },
});

describe('ContentController, AdminContentController and AdminMediaController', (): void => {
  let app: INestApplication<Server>;
  let token: string;
  const useCases = {
    published: { execute: vi.fn<GetPublishedContent['execute']>() },
    list: { execute: vi.fn<ListAdminProjects['execute']>() },
    get: { execute: vi.fn<GetAdminProject['execute']>() },
    create: { execute: vi.fn<CreateProject['execute']>() },
    revise: { execute: vi.fn<ReviseProject['execute']>() },
    publish: { execute: vi.fn<PublishProject['execute']>() },
    unpublish: { execute: vi.fn<UnpublishProject['execute']>() },
    upload: { execute: vi.fn<UploadMedia['execute']>() },
  } satisfies {
    published: Pick<GetPublishedContent, 'execute'>;
    list: Pick<ListAdminProjects, 'execute'>;
    get: Pick<GetAdminProject, 'execute'>;
    create: Pick<CreateProject, 'execute'>;
    revise: Pick<ReviseProject, 'execute'>;
    publish: Pick<PublishProject, 'execute'>;
    unpublish: Pick<UnpublishProject, 'execute'>;
    upload: Pick<UploadMedia, 'execute'>;
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
      controllers: [ContentController, AdminContentController, AdminMediaController],
      providers: [
        { provide: GetPublishedContent, useValue: useCases.published },
        { provide: ListAdminProjects, useValue: useCases.list },
        { provide: GetAdminProject, useValue: useCases.get },
        { provide: CreateProject, useValue: useCases.create },
        { provide: ReviseProject, useValue: useCases.revise },
        { provide: PublishProject, useValue: useCases.publish },
        { provide: UnpublishProject, useValue: useCases.unpublish },
        { provide: UploadMedia, useValue: useCases.upload },
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
      useCases.published.execute.mockResolvedValue(published());
      const response: request.Response = await server().get('/content/snapshot?locale=en');
      expect(response.status).toBe(200);
      expect(response.headers['cache-control']).toBe('no-store');
      const snapshot: ContentSnapshot = ContentSnapshotSchema.parse(response.body);
      expect(snapshot).toMatchObject({ locale: 'en', revision: 4 });
      expect(snapshot.profile.heroIntro).toBe('Hello');

      // Untranslated text falls back to French.
      expect(snapshot.profile.facts[0]).toEqual({ label: 'Based in', value: 'Blois' });
      expect(snapshot.timeline[0]).toMatchObject({ start: { year: 2021, month: 9 } });
      expect(snapshot.profile.links).toEqual([
        { kind: 'email', url: 'mailto:contact@valentin-fortin.pro', label: null },
        { kind: 'website', url: 'https://blog.example', label: 'Blog' },
      ]);
      // Dated in Paris time; the document of the requested locale.
      expect(snapshot.legal.notice).toEqual({
        updatedOn: '2026-11-04',
        document: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Text' }] }],
        },
      });
    });

    it('resolves the figures and the cover to their images', async (): Promise<void> => {
      useCases.published.execute.mockResolvedValue(published());
      const fr: ContentSnapshot = ContentSnapshotSchema.parse(
        (await server().get('/content/snapshot?locale=fr')).body,
      );
      const [movah] = fr.projects;
      expect(movah?.cover).toEqual({
        src: `/media/${COVER.id}.webp`,
        small: `/media/${COVER.id}-960.webp`,
        width: 2400,
        height: 1350,
        alt: 'Accueil de Movah',
      });
      expect(movah?.article.content.find((block): boolean => block.type === 'figure')).toEqual({
        type: 'figure',
        attrs: {
          src: `/media/${FIGURE.id}.webp`,
          small: `/media/${FIGURE.id}-960.webp`,
          width: 1200,
          height: 900,
          alt: 'Écran du calendrier',
          caption: 'Le calendrier des sorties.',
        },
      });
      expect(movah?.article.content[0]).toEqual({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Contexte' }],
      });
      const en: ContentSnapshot = ContentSnapshotSchema.parse(
        (await server().get('/content/snapshot?locale=en')).body,
      );
      expect(en.projects[0]?.cover?.alt).toBe('Accueil de Movah');
      expect(en.projects[0]?.article.content).toHaveLength(3);
    });

    it('serves the search texts of the snapshot locale, null where none was written', async (): Promise<void> => {
      useCases.published.execute.mockResolvedValue(published());
      const fr: ContentSnapshot = ContentSnapshotSchema.parse(
        (await server().get('/content/snapshot?locale=fr')).body,
      );
      expect(fr.projects[0]?.seo).toEqual({
        title: 'Movah, suivi de séries en Flutter',
        description:
          'Application mobile Flutter et Supabase pour suivre ses séries, films et anime.',
        keywords: ['Flutter', 'suivi de séries'],
      });
      const en: ContentSnapshot = ContentSnapshotSchema.parse(
        (await server().get('/content/snapshot?locale=en')).body,
      );
      // No fallback on the French values: the English page uses its own title and technologies.
      expect(en.projects[0]?.seo).toEqual({
        title: null,
        description: 'A Flutter and Supabase mobile app to keep track of series, films and anime.',
        keywords: [],
      });
    });

    it('leaves out a figure or a cover whose media is not stored', async (): Promise<void> => {
      useCases.published.execute.mockResolvedValue(published([]));
      const snapshot: ContentSnapshot = ContentSnapshotSchema.parse(
        (await server().get('/content/snapshot?locale=en')).body,
      );
      expect(snapshot.projects[0]?.cover).toBeNull();
      expect(snapshot.projects[0]?.article.content.map((block): string => block.type)).toEqual([
        'heading',
        'paragraph',
      ]);
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

    it('lists the projects with their version and media', async (): Promise<void> => {
      useCases.list.execute.mockResolvedValue([
        { project: projectFromFixture(), media: [FIGURE, COVER] },
      ]);
      const response: request.Response = await admin(server().get('/content/admin/projects'));
      expect(response.status).toBe(200);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.body).toMatchObject({
        totalItems: 1,
        member: [{ id: 'project-movah', version: 3, media: FIXTURE.media }],
      });
    });

    it('serves a project with its version as ETag, matching the fixture', async (): Promise<void> => {
      useCases.get.execute.mockResolvedValue({
        project: projectFromFixture(),
        media: [FIGURE, COVER],
      });
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

    it('creates a draft project and answers 201 with its ETag', async (): Promise<void> => {
      useCases.create.execute.mockResolvedValue({
        project: projectFromFixture(),
        version: 1,
        revision: null,
        media: [COVER, FIGURE],
      });
      const response: request.Response = await admin(
        server().post('/content/admin/projects').send(FIXTURE),
      );
      expect(response.status).toBe(201);
      expect(response.headers['etag']).toBe('"1"');
      const [revision] = useCases.create.execute.mock.calls[0] ?? [];
      expect(revision?.title.en).toBe('Movah');
      expect(revision?.cover).toEqual({ media: COVER.id, alt: { fr: 'Accueil de Movah' } });
    });

    it('rejects a malformed creation (400) before reaching the use case', async (): Promise<void> => {
      const response: request.Response = await admin(
        server()
          .post('/content/admin/projects')
          .send({ ...FIXTURE, title: { fr: '' } }),
      );
      expect(response.status).toBe(400);
      expect(useCases.create.execute).not.toHaveBeenCalled();
    });

    it('revises a project with the version read, and returns the new ETag', async (): Promise<void> => {
      useCases.revise.execute.mockResolvedValue({
        project: projectFromFixture(),
        version: 4,
        revision: 5,
        media: [COVER, FIGURE],
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
      expect(revision?.cover).toEqual({ media: COVER.id, alt: { fr: 'Accueil de Movah' } });
      expect(revision?.article.en?.mediaIds()).toEqual([FIGURE.id]);
    });

    it('passes the trimmed search texts to the use case and returns them', async (): Promise<void> => {
      useCases.revise.execute.mockImplementation(
        async (
          _id: string,
          version: number,
          revision: ProjectRevision,
        ): Promise<Awaited<ReturnType<ReviseProject['execute']>>> => {
          const project: Project = projectFromFixture(version);
          project.revise(revision, ['fr']);
          return { project, version: version + 1, revision: null, media: [COVER, FIGURE] };
        },
      );
      const seo: ProjectRevisionRequest['seo'] = {
        title: { fr: '  Movah, en bref  ', en: 'Movah in short' },
        description: { fr: '   ' },
        keywords: { fr: [' Flutter ', 'suivi de séries'], en: [] },
      };
      const response: request.Response = await admin(
        server()
          .put('/content/admin/projects/project-movah')
          .set('if-match', '"3"')
          .send({ ...FIXTURE, seo }),
      );
      expect(response.status).toBe(200);
      expect(AdminProjectDtoSchema.parse(response.body).seo).toEqual({
        title: { fr: 'Movah, en bref', en: 'Movah in short' },
        description: {},
        keywords: { fr: ['Flutter', 'suivi de séries'] },
      });
      const [, , revision] = useCases.revise.execute.mock.calls[0] ?? [];
      expect(revision?.seo.in('en')).toEqual({
        title: 'Movah in short',
        description: null,
        keywords: [],
      });
      expect(revision?.seo.in('fr').keywords).toEqual(['Flutter', 'suivi de séries']);
    });

    it('rejects duplicate or too short keywords (400) with their field', async (): Promise<void> => {
      const response: request.Response = await admin(
        server()
          .put('/content/admin/projects/project-movah')
          .set('if-match', '"3"')
          .send({
            ...FIXTURE,
            seo: {
              title: {},
              description: {},
              keywords: { fr: ['Flutter', 'flutter'], en: ['x'] },
            },
          }),
      );
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('request.invalid');
      expect(
        response.body.errors.map((error: { field: string }): string => error.field).sort(),
      ).toEqual(['seo.keywords.en.0', 'seo.keywords.fr']);
      expect(useCases.revise.execute).not.toHaveBeenCalled();
    });

    it('rejects a search title above the limit (400) with its field', async (): Promise<void> => {
      const response: request.Response = await admin(
        server()
          .put('/content/admin/projects/project-movah')
          .set('if-match', '"3"')
          .send({
            ...FIXTURE,
            seo: {
              title: { fr: 'a'.repeat(PROJECT_SEO_LIMITS.title + 1) },
              description: { en: 'b'.repeat(PROJECT_SEO_LIMITS.description + 1) },
              keywords: { fr: [] },
            },
          }),
      );
      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.body.code).toBe('request.invalid');
      expect(
        response.body.errors.map((error: { field: string }): string => error.field).sort(),
      ).toEqual(['seo.description.en', 'seo.title.fr']);
      expect(useCases.revise.execute).not.toHaveBeenCalled();
    });

    it('answers a revision referencing unknown media with 422 and their ids', async (): Promise<void> => {
      useCases.revise.execute.mockRejectedValue(new MediaNotFoundError([COVER.id]));
      const response: request.Response = await admin(
        server().put('/content/admin/projects/project-movah').set('if-match', '"3"').send(FIXTURE),
      );
      expect(response.status).toBe(422);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.body).toMatchObject({ code: 'content.media-not-found', details: [COVER.id] });
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
        media: [],
      });
      const response: request.Response = await admin(
        server().post(`/content/admin/projects/project-movah/${path}`).set('if-match', 'W/"7"'),
      );
      expect(response.status).toBe(200);
      expect(response.headers['etag']).toBe('"8"');
      expect(response.body.media).toEqual([]);
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

  describe('media upload', (): void => {
    const upload = (): request.Test => server().post('/content/admin/media');
    const png: Buffer = Buffer.from('fake image bytes');

    it('stores the file and answers 201 with the media', async (): Promise<void> => {
      useCases.upload.execute.mockResolvedValue(COVER);
      const response: request.Response = await admin(upload()).attach('file', png, 'photo.png');
      expect(response.status).toBe(201);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(MediaDtoSchema.parse(response.body)).toEqual(FIXTURE.media[0]);
      const [bytes] = useCases.upload.execute.mock.calls[0] ?? [];
      expect(Buffer.from(bytes ?? []).toString()).toBe('fake image bytes');
    });

    it('refuses an anonymous upload before reading it', async (): Promise<void> => {
      const intercept: ReturnType<typeof vi.spyOn> = vi.spyOn(
        MediaUploadInterceptor.prototype,
        'intercept',
      );
      const response: request.Response = await upload().attach('file', png, 'photo.png');
      expect(response.status).toBe(401);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(intercept).not.toHaveBeenCalled();
      expect(useCases.upload.execute).not.toHaveBeenCalled();
      intercept.mockRestore();
    });

    it('answers 413 for a file above 10 MiB', async (): Promise<void> => {
      const response: request.Response = await admin(upload()).attach(
        'file',
        Buffer.alloc(10 * 1024 * 1024 + 1),
        'huge.png',
      );
      expect(response.status).toBe(413);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.body.code).toBe('content.media-too-large');
      expect(useCases.upload.execute).not.toHaveBeenCalled();
    });

    it('answers 415 for a file the processor refuses', async (): Promise<void> => {
      useCases.upload.execute.mockRejectedValue(new UnsupportedMediaError());
      const response: request.Response = await admin(upload()).attach('file', png, 'image.svg');
      expect(response.status).toBe(415);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.body.code).toBe('content.media-unsupported');
    });

    it.each([
      ['no body', (call: request.Test): request.Test => call],
      ['a JSON body', (call: request.Test): request.Test => call.send({ file: 'x' })],
      [
        'another field name',
        (call: request.Test): request.Test => call.attach('image', png, 'a.png'),
      ],
      [
        'an extra text field',
        (call: request.Test): request.Test => call.field('alt', 'x').attach('file', png, 'a.png'),
      ],
      [
        'two files',
        (call: request.Test): request.Test =>
          call.attach('file', png, 'a.png').attach('file', png, 'b.png'),
      ],
    ])('answers 400 for %s', async (_label, send): Promise<void> => {
      const response: request.Response = await send(admin(upload()));
      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.body.code).toBe('content.media-missing');
      expect(useCases.upload.execute).not.toHaveBeenCalled();
    });

    it('lets other upload failures through', async (): Promise<void> => {
      vi.spyOn(Logger.prototype, 'error').mockImplementation((): undefined => undefined);
      useCases.upload.execute.mockRejectedValue(new MediaTooLargeError());
      const tooLarge: request.Response = await admin(upload()).attach('file', png, 'a.png');
      expect(tooLarge.status).toBe(413);
      useCases.upload.execute.mockRejectedValue(new MediaMissingError('The file is empty.'));
      const empty: request.Response = await admin(upload()).attach('file', png, 'a.png');
      expect(empty.body).toMatchObject({ status: 400, title: 'The file is empty.' });
      vi.restoreAllMocks();
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
    expect(toAdminProjectDto(draft, []).missing).toEqual(['title.en', 'cover.alt.en']);
    expect(toAdminProjectDto(draft, []).media).toEqual([]);
  });

  it('keeps a missing translation absent in the revision, and maps a project without cover', (): void => {
    const revision: ProjectRevision = toProjectRevision(
      ProjectRevisionRequestSchema.parse({
        ...FIXTURE,
        title: { fr: 'Movah' },
        article: { fr: FIXTURE.article.fr },
        cover: { media: COVER.id, alt: { fr: 'Accueil', en: 'Home' } },
      }),
    );
    expect(revision.title.toProps()).toEqual({ fr: 'Movah' });
    expect(revision.article.en).toBeUndefined();
    expect(revision.cover?.alt).toEqual({ fr: 'Accueil', en: 'Home' });
    const withoutCover: Project = Project.rehydrate({
      ...projectFromFixture().snapshot(),
      ...revision,
      cover: null,
    });
    expect(toAdminProjectDto(withoutCover, [FIGURE])).toMatchObject({
      cover: null,
      article: { fr: { type: 'doc' } },
      media: [{ id: FIGURE.id }],
    });
    expect(toAdminProjectDto(withoutCover, []).article).not.toHaveProperty('en');
  });

  it('presents a translated cover and keeps a cleared one cleared', (): void => {
    const translated: Project = Project.rehydrate({
      ...projectFromFixture().snapshot(),
      cover: { media: COVER.id, alt: { fr: 'Accueil', en: 'Home' } },
    });
    expect(toAdminProjectDto(translated, [COVER]).cover).toEqual({
      media: COVER.id,
      alt: { fr: 'Accueil', en: 'Home' },
    });
    expect(
      toProjectRevision(ProjectRevisionRequestSchema.parse({ ...FIXTURE, cover: null })).cover,
    ).toBeNull();
  });

  it('leaves unknown errors to the filter', (): void => {
    expect(contentProblemMapper(new Error('other'))).toBeNull();
  });
});

describe('toContentSnapshot', (): void => {
  it('falls back to the French document and keeps a document of missing figures valid', (): void => {
    const french: Project = Project.rehydrate({
      ...projectFromFixture().snapshot(),
      article: {
        fr: ArticleDocument.of('article.fr', {
          type: 'doc',
          content: [{ type: 'figure', attrs: { media: FIGURE.id, alt: 'Écran', caption: '' } }],
        }),
      },
      cover: { media: COVER.id, alt: { fr: 'Accueil', en: 'Home' } },
    });
    const small: MediaRecord = { ...COVER, width: 900, hasSmall: false };
    const snapshot: ContentSnapshot = toContentSnapshot(
      { ...published([small]), projects: [french] },
      'en',
    );
    expect(snapshot.projects[0]?.article).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    });
    expect(snapshot.projects[0]?.cover).toEqual({
      src: `/media/${COVER.id}.webp`,
      small: null,
      width: 900,
      height: 1350,
      alt: 'Home',
    });
  });
});

describe('MediaUploadInterceptor', (): void => {
  it('lets an error other than a Multer limit through', async (): Promise<void> => {
    const interceptor: MediaUploadInterceptor = new MediaUploadInterceptor();
    const failure: Error = new Error('stream destroyed');
    Reflect.set(interceptor, 'files', { intercept: (): Promise<never> => Promise.reject(failure) });
    await expect(interceptor.intercept({} as ExecutionContext, { handle: vi.fn() })).rejects.toBe(
      failure,
    );
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

describe('MediaPurgeJobs', (): void => {
  const run: Mock<PurgeMedia['execute']> = vi.fn<PurgeMedia['execute']>();
  const jobs: MediaPurgeJobs = new MediaPurgeJobs({ execute: run } as unknown as PurgeMedia);

  beforeEach((): void => {
    run.mockReset();
    vi.spyOn(Logger.prototype, 'log').mockImplementation((): undefined => undefined);
    vi.spyOn(Logger.prototype, 'error').mockImplementation((): undefined => undefined);
  });

  afterEach((): void => {
    vi.restoreAllMocks();
  });

  it('logs the purged media only when there are some, and survives a failure', async (): Promise<void> => {
    run
      .mockResolvedValueOnce({ purged: [] })
      .mockResolvedValueOnce({ purged: ['a', 'b'] })
      .mockRejectedValueOnce(new Error('disk full'))
      .mockRejectedValueOnce('down');
    await jobs.purgeUnlinked();
    await jobs.purgeUnlinked();
    await jobs.purgeUnlinked();
    await jobs.purgeUnlinked();
    expect(Logger.prototype.log).toHaveBeenCalledExactlyOnceWith(
      'Media purge: 2 media deleted (a, b)',
    );
    expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining('disk full'));
    expect(Logger.prototype.error).toHaveBeenCalledWith('down');
  });
});
