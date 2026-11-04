import type { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Server } from 'node:http';
import { AdminAuthModule } from '@vfortin/backend-auth';
import { PROBLEM_MAPPER, ProblemDetailsFilter } from '@vfortin/backend-http';
import {
  CreateTimelineEntry,
  DeleteTimelineEntry,
  GetAdminTimelineEntry,
  ListAdminTimeline,
  NotFoundError,
  ReorderTimeline,
  ReviseTimelineEntry,
  VersionMismatchError,
} from '@vfortin/content-application';
import {
  AdminTimelineEntryDtoSchema,
  AdminTimelineListSchema,
  type TimelineEntryRequest,
} from '@vfortin/content-contracts';
import {
  DomainError,
  TimelineEntry,
  type TimelineEntryDraft,
  type TimelineKind,
} from '@vfortin/content-domain';
import { type JWK, SignJWT, exportJWK, generateKeyPair } from 'jose';
import request from 'supertest';
import { AdminTimelineController } from '@internal/content-adapters-in/lib/http/controllers/admin-timeline/admin-timeline.controller';
import { contentProblemMapper } from '@internal/content-adapters-in/lib/http/mappers/content-problem/content-problem.mapper';

/**
 * Constant ISSUER
 *
 * @description
 * Issuer of the test access token.
 */
const ISSUER: string = 'https://exemple.fr/api/auth';

/**
 * Constant BODY
 *
 * @description
 * Valid creation or revision body.
 */
const BODY: TimelineEntryRequest = {
  title: { fr: 'Développeur', en: 'Developer' },
  place: { fr: 'Tours', en: 'Tours' },
  description: { fr: 'Interfaces.', en: 'Interfaces.' },
  start: { year: 2023, month: 9 },
  end: null,
  techs: ['angular'],
};

/**
 * Function entry
 *
 * @description
 * Builds an entry of the supplied kind and version.
 *
 * @param {string} id - Identifier.
 * @param {number} position - Position.
 * @param {number} version - Version.
 * @param {TimelineKind} kind - Kind.
 * @returns {TimelineEntry} Entry.
 */
function entry(
  id: string,
  position: number,
  version: number = 1,
  kind: TimelineKind = 'experience',
): TimelineEntry {
  return TimelineEntry.rehydrate({
    ...TimelineEntry.revisionOf(BODY as TimelineEntryDraft),
    id,
    kind,
    position,
    version,
  });
}

describe('AdminTimelineController', (): void => {
  let app: INestApplication<Server>;
  let token: string;
  const useCases = {
    list: { execute: vi.fn<ListAdminTimeline['execute']>() },
    get: { execute: vi.fn<GetAdminTimelineEntry['execute']>() },
    create: { execute: vi.fn<CreateTimelineEntry['execute']>() },
    revise: { execute: vi.fn<ReviseTimelineEntry['execute']>() },
    remove: { execute: vi.fn<DeleteTimelineEntry['execute']>() },
    reorder: { execute: vi.fn<ReorderTimeline['execute']>() },
  } satisfies {
    list: Pick<ListAdminTimeline, 'execute'>;
    get: Pick<GetAdminTimelineEntry, 'execute'>;
    create: Pick<CreateTimelineEntry, 'execute'>;
    revise: Pick<ReviseTimelineEntry, 'execute'>;
    remove: Pick<DeleteTimelineEntry, 'execute'>;
    reorder: Pick<ReorderTimeline, 'execute'>;
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
      controllers: [AdminTimelineController],
      providers: [
        { provide: ListAdminTimeline, useValue: useCases.list },
        { provide: GetAdminTimelineEntry, useValue: useCases.get },
        { provide: CreateTimelineEntry, useValue: useCases.create },
        { provide: ReviseTimelineEntry, useValue: useCases.revise },
        { provide: DeleteTimelineEntry, useValue: useCases.remove },
        { provide: ReorderTimeline, useValue: useCases.reorder },
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

  it('answers 401 before reading the body of an anonymous call', async (): Promise<void> => {
    const calls: (() => request.Test)[] = [
      (): request.Test => server().get('/content/admin/timeline/experience/entries'),
      (): request.Test =>
        server().post('/content/admin/timeline/experience/entries').send({ title: 42 }),
      (): request.Test => server().put('/content/admin/timeline/hobby/order').send('not json'),
      (): request.Test => server().delete('/content/admin/timeline/education/entries/bts'),
    ];
    for (const call of calls) {
      const response: request.Response = await call();
      expect(response.status).toBe(401);
      expect(response.body.code).toBe('auth.unauthorized');
    }
    expect(useCases.create.execute).not.toHaveBeenCalled();
  });

  it('lists a kind with its list version as ETag, matching the contract', async (): Promise<void> => {
    useCases.list.execute.mockResolvedValue({
      kind: 'experience',
      version: 4,
      entries: [entry('oaas', 0, 2), entry('kodoka', 1)],
    });
    const response: request.Response = await admin(
      server().get('/content/admin/timeline/experience/entries'),
    );
    expect(response.status).toBe(200);
    expect(response.headers['etag']).toBe('"4"');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(AdminTimelineListSchema.parse(response.body)).toMatchObject({
      kind: 'experience',
      version: 4,
      totalItems: 2,
      member: [{ id: 'oaas', position: 0, version: 2, end: null }, { id: 'kodoka' }],
    });
    expect(useCases.list.execute).toHaveBeenCalledWith('experience');
  });

  it('refuses an unknown kind as request.invalid', async (): Promise<void> => {
    const response: request.Response = await admin(
      server().get('/content/admin/timeline/hobby/entries'),
    );
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('request.invalid');
    expect(useCases.list.execute).not.toHaveBeenCalled();
  });

  it('serves an entry with its version as ETag, and 404 for a missing one', async (): Promise<void> => {
    useCases.get.execute.mockResolvedValueOnce(entry('bts', 0, 3, 'education'));
    const found: request.Response = await admin(
      server().get('/content/admin/timeline/education/entries/bts'),
    );
    expect(found.status).toBe(200);
    expect(found.headers['etag']).toBe('"3"');
    expect(AdminTimelineEntryDtoSchema.parse(found.body)).toMatchObject({
      id: 'bts',
      kind: 'education',
      title: { fr: 'Développeur', en: 'Developer' },
    });
    expect(useCases.get.execute).toHaveBeenCalledWith('education', 'bts');

    useCases.get.execute.mockRejectedValueOnce(new NotFoundError('Timeline entry'));
    const missing: request.Response = await admin(
      server().get('/content/admin/timeline/education/entries/zz'),
    );
    expect(missing.status).toBe(404);
    expect(missing.headers['content-type']).toContain('application/problem+json');
    expect(missing.body).toMatchObject({
      code: 'content.not-found',
      title: 'Timeline entry not found.',
    });
  });

  it('creates an entry with 201 and its ETag, passing the trimmed draft', async (): Promise<void> => {
    useCases.create.execute.mockResolvedValue({ entry: entry('new', 3), version: 1, revision: 7 });
    const response: request.Response = await admin(
      server()
        .post('/content/admin/timeline/experience/entries')
        .send({ ...BODY, title: { fr: '  Développeur ', en: ' Developer' } }),
    );
    expect(response.status).toBe(201);
    expect(response.headers['etag']).toBe('"1"');
    expect(response.body).toMatchObject({ id: 'new', position: 3, version: 1 });
    const [kind, draft] = useCases.create.execute.mock.calls[0] ?? [];
    expect(kind).toBe('experience');
    expect(draft?.title).toEqual({ fr: 'Développeur', en: 'Developer' });
  });

  it('refuses an end before the start with a field error', async (): Promise<void> => {
    const response: request.Response = await admin(
      server()
        .post('/content/admin/timeline/experience/entries')
        .send({ ...BODY, end: { year: 2023, month: 8 } }),
    );
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('request.invalid');
    expect(response.body.errors.map((e: { field: string }): string => e.field)).toEqual(['end']);
    expect(useCases.create.execute).not.toHaveBeenCalled();
  });

  it('answers 422 with field errors for a missing English text', async (): Promise<void> => {
    useCases.create.execute.mockRejectedValue(
      new DomainError(
        'content.timeline-entry-incomplete',
        'A timeline entry is public at once: write its texts in French and English.',
        ['title.en', 'place.en'],
      ),
    );
    const response: request.Response = await admin(
      server().post('/content/admin/timeline/education/entries').send(BODY),
    );
    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      code: 'content.timeline-entry-incomplete',
      details: ['title.en', 'place.en'],
      errors: [
        { field: 'title.en', message: expect.any(String) },
        { field: 'place.en', message: expect.any(String) },
      ],
    });
  });

  it('revises with the If-Match version and returns the new ETag', async (): Promise<void> => {
    useCases.revise.execute.mockResolvedValue({ entry: entry('oaas', 0), version: 3, revision: 8 });
    const response: request.Response = await admin(
      server()
        .put('/content/admin/timeline/experience/entries/oaas')
        .set('if-match', '"2"')
        .send(BODY),
    );
    expect(response.status).toBe(200);
    expect(response.headers['etag']).toBe('"3"');
    expect(response.body.version).toBe(3);
    expect(useCases.revise.execute.mock.calls[0]?.slice(0, 3)).toEqual(['experience', 'oaas', 2]);
  });

  it('requires If-Match on writes (428) and answers a stale version with 412', async (): Promise<void> => {
    const missing: request.Response = await admin(
      server().put('/content/admin/timeline/experience/entries/oaas').send(BODY),
    );
    expect(missing.status).toBe(428);
    expect(missing.body.code).toBe('request.precondition-required');

    useCases.revise.execute.mockRejectedValue(new VersionMismatchError('changed'));
    const stale: request.Response = await admin(
      server()
        .put('/content/admin/timeline/experience/entries/oaas')
        .set('if-match', '"1"')
        .send(BODY),
    );
    expect(stale.status).toBe(412);
    expect(stale.body.code).toBe('content.version-mismatch');
  });

  it('reorders with the list version and returns the new list ETag', async (): Promise<void> => {
    useCases.reorder.execute.mockResolvedValue({
      kind: 'experience',
      version: 5,
      entries: [entry('kodoka', 0), entry('oaas', 1)],
      revision: 9,
    });
    const response: request.Response = await admin(
      server()
        .put('/content/admin/timeline/experience/order')
        .set('if-match', '"4"')
        .send({ ids: ['kodoka', 'oaas'] }),
    );
    expect(response.status).toBe(200);
    expect(response.headers['etag']).toBe('"5"');
    expect(response.body.member.map((e: { id: string }): string => e.id)).toEqual([
      'kodoka',
      'oaas',
    ]);
    expect(useCases.reorder.execute).toHaveBeenCalledWith('experience', 4, ['kodoka', 'oaas']);
  });

  it('refuses a repeated id (400) and an incomplete order (422)', async (): Promise<void> => {
    const repeated: request.Response = await admin(
      server()
        .put('/content/admin/timeline/experience/order')
        .set('if-match', '"4"')
        .send({ ids: ['a', 'a'] }),
    );
    expect(repeated.status).toBe(400);
    useCases.reorder.execute.mockRejectedValue(
      new DomainError('content.timeline-order-invalid', 'Every entry once.', ['ids']),
    );
    const incomplete: request.Response = await admin(
      server()
        .put('/content/admin/timeline/experience/order')
        .set('if-match', '"4"')
        .send({ ids: ['a'] }),
    );
    expect(incomplete.status).toBe(422);
    expect(incomplete.body).toMatchObject({
      code: 'content.timeline-order-invalid',
      errors: [{ field: 'ids' }],
    });
  });

  it('deletes with the entry version and answers the remaining list', async (): Promise<void> => {
    useCases.remove.execute.mockResolvedValue({
      kind: 'education',
      version: 6,
      entries: [entry('master', 0, 1, 'education')],
      revision: 10,
    });
    const response: request.Response = await admin(
      server().delete('/content/admin/timeline/education/entries/bts').set('if-match', '"2"'),
    );
    expect(response.status).toBe(200);
    expect(response.headers['etag']).toBe('"6"');
    expect(response.body).toMatchObject({ kind: 'education', totalItems: 1 });
    expect(useCases.remove.execute).toHaveBeenCalledWith('education', 'bts', 2);
  });
});
