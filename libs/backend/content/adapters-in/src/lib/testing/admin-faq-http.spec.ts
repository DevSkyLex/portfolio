import type { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Server } from 'node:http';
import { AdminAuthModule } from '@vfortin/backend-auth';
import { PROBLEM_MAPPER, ProblemDetailsFilter } from '@vfortin/backend-http';
import {
  CreateFaqEntry,
  DeleteFaqEntry,
  GetAdminFaqEntry,
  ListAdminFaq,
  NotFoundError,
  ReorderFaq,
  ReviseFaqEntry,
  VersionMismatchError,
} from '@vfortin/content-application';
import {
  AdminFaqEntryDtoSchema,
  AdminFaqListSchema,
  type FaqEntryRequest,
} from '@vfortin/content-contracts';
import { DomainError, FaqEntry } from '@vfortin/content-domain';
import { type JWK, SignJWT, exportJWK, generateKeyPair } from 'jose';
import request from 'supertest';
import { AdminFaqController } from '@internal/content-adapters-in/lib/http/controllers/admin-faq/admin-faq.controller';
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
const BODY: FaqEntryRequest = {
  question: { fr: 'Travailles-tu à distance ?', en: 'Do you work remotely?' },
  answer: { fr: 'Oui.', en: 'Yes.' },
};

/**
 * Function entry
 *
 * @description
 * Builds an entry of the supplied position and version.
 *
 * @param {string} id - Identifier.
 * @param {number} position - Position.
 * @param {number} version - Version.
 * @returns {FaqEntry} Entry.
 */
function entry(id: string, position: number, version: number = 1): FaqEntry {
  return FaqEntry.rehydrate({ ...FaqEntry.revisionOf(BODY), id, position, version });
}

describe('AdminFaqController', (): void => {
  let app: INestApplication<Server>;
  let token: string;
  const useCases = {
    list: { execute: vi.fn<ListAdminFaq['execute']>() },
    get: { execute: vi.fn<GetAdminFaqEntry['execute']>() },
    create: { execute: vi.fn<CreateFaqEntry['execute']>() },
    revise: { execute: vi.fn<ReviseFaqEntry['execute']>() },
    remove: { execute: vi.fn<DeleteFaqEntry['execute']>() },
    reorder: { execute: vi.fn<ReorderFaq['execute']>() },
  } satisfies {
    list: Pick<ListAdminFaq, 'execute'>;
    get: Pick<GetAdminFaqEntry, 'execute'>;
    create: Pick<CreateFaqEntry, 'execute'>;
    revise: Pick<ReviseFaqEntry, 'execute'>;
    remove: Pick<DeleteFaqEntry, 'execute'>;
    reorder: Pick<ReorderFaq, 'execute'>;
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
      controllers: [AdminFaqController],
      providers: [
        { provide: ListAdminFaq, useValue: useCases.list },
        { provide: GetAdminFaqEntry, useValue: useCases.get },
        { provide: CreateFaqEntry, useValue: useCases.create },
        { provide: ReviseFaqEntry, useValue: useCases.revise },
        { provide: DeleteFaqEntry, useValue: useCases.remove },
        { provide: ReorderFaq, useValue: useCases.reorder },
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
      (): request.Test => server().get('/content/admin/faq/entries'),
      (): request.Test => server().post('/content/admin/faq/entries').send({ question: 42 }),
      (): request.Test => server().put('/content/admin/faq/order').send('not json'),
      (): request.Test => server().delete('/content/admin/faq/entries/contact'),
    ];
    for (const call of calls) {
      const response: request.Response = await call();
      expect(response.status).toBe(401);
      expect(response.body.code).toBe('auth.unauthorized');
    }
    expect(useCases.create.execute).not.toHaveBeenCalled();
  });

  it('lists the questions with the list version as ETag, matching the contract', async (): Promise<void> => {
    useCases.list.execute.mockResolvedValue({
      version: 4,
      entries: [entry('availability', 0, 2), entry('contact', 1)],
    });
    const response: request.Response = await admin(server().get('/content/admin/faq/entries'));
    expect(response.status).toBe(200);
    expect(response.headers['etag']).toBe('"4"');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(AdminFaqListSchema.parse(response.body)).toMatchObject({
      version: 4,
      totalItems: 2,
      member: [{ id: 'availability', position: 0, version: 2 }, { id: 'contact' }],
    });
  });

  it('serves a question with its version as ETag, and 404 for a missing one', async (): Promise<void> => {
    useCases.get.execute.mockResolvedValueOnce(entry('remote-work', 3, 3));
    const found: request.Response = await admin(
      server().get('/content/admin/faq/entries/remote-work'),
    );
    expect(found.status).toBe(200);
    expect(found.headers['etag']).toBe('"3"');
    expect(AdminFaqEntryDtoSchema.parse(found.body)).toMatchObject({
      id: 'remote-work',
      question: { fr: 'Travailles-tu à distance ?', en: 'Do you work remotely?' },
      answer: { fr: 'Oui.', en: 'Yes.' },
    });
    expect(useCases.get.execute).toHaveBeenCalledWith('remote-work');

    useCases.get.execute.mockRejectedValueOnce(new NotFoundError('FAQ entry'));
    const missing: request.Response = await admin(server().get('/content/admin/faq/entries/zz'));
    expect(missing.status).toBe(404);
    expect(missing.headers['content-type']).toContain('application/problem+json');
    expect(missing.body).toMatchObject({
      code: 'content.not-found',
      title: 'FAQ entry not found.',
    });
  });

  it('creates a question with 201 and its ETag, passing the trimmed draft', async (): Promise<void> => {
    useCases.create.execute.mockResolvedValue({ entry: entry('new', 6), version: 1, revision: 7 });
    const response: request.Response = await admin(
      server()
        .post('/content/admin/faq/entries')
        .send({ ...BODY, question: { fr: '  Question ? ', en: ' Question?' } }),
    );
    expect(response.status).toBe(201);
    expect(response.headers['etag']).toBe('"1"');
    expect(response.body).toMatchObject({ id: 'new', position: 6, version: 1 });
    expect(useCases.create.execute.mock.calls[0]?.[0].question).toEqual({
      fr: 'Question ?',
      en: 'Question?',
    });
  });

  it('refuses an answer over 2000 characters with a field error', async (): Promise<void> => {
    const response: request.Response = await admin(
      server()
        .post('/content/admin/faq/entries')
        .send({ ...BODY, answer: { fr: 'x'.repeat(2001) } }),
    );
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('request.invalid');
    expect(response.body.errors.map((e: { field: string }): string => e.field)).toEqual([
      'answer.fr',
    ]);
    expect(useCases.create.execute).not.toHaveBeenCalled();
  });

  it('answers 422 with field errors for a missing English text', async (): Promise<void> => {
    useCases.create.execute.mockRejectedValue(
      new DomainError(
        'content.faq-entry-incomplete',
        'A question is public at once: write it and its answer in French and English.',
        ['question.en', 'answer.en'],
      ),
    );
    const response: request.Response = await admin(
      server().post('/content/admin/faq/entries').send(BODY),
    );
    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      code: 'content.faq-entry-incomplete',
      details: ['question.en', 'answer.en'],
      errors: [
        { field: 'question.en', message: expect.any(String) },
        { field: 'answer.en', message: expect.any(String) },
      ],
    });
  });

  it('revises with the If-Match version and returns the new ETag', async (): Promise<void> => {
    useCases.revise.execute.mockResolvedValue({
      entry: entry('remote-work', 3),
      version: 3,
      revision: 8,
    });
    const response: request.Response = await admin(
      server().put('/content/admin/faq/entries/remote-work').set('if-match', '"2"').send(BODY),
    );
    expect(response.status).toBe(200);
    expect(response.headers['etag']).toBe('"3"');
    expect(response.body.version).toBe(3);
    expect(useCases.revise.execute).toHaveBeenCalledWith('remote-work', 2, BODY);
  });

  it('requires If-Match on writes (428) and answers a stale version with 412', async (): Promise<void> => {
    const missing: request.Response = await admin(
      server().put('/content/admin/faq/entries/remote-work').send(BODY),
    );
    expect(missing.status).toBe(428);
    expect(missing.body.code).toBe('request.precondition-required');

    useCases.revise.execute.mockRejectedValue(new VersionMismatchError('changed'));
    const stale: request.Response = await admin(
      server().put('/content/admin/faq/entries/remote-work').set('if-match', '"1"').send(BODY),
    );
    expect(stale.status).toBe(412);
    expect(stale.body.code).toBe('content.version-mismatch');
  });

  it('reorders with the list version and returns the new list ETag', async (): Promise<void> => {
    useCases.reorder.execute.mockResolvedValue({
      version: 5,
      entries: [entry('contact', 0), entry('availability', 1)],
      revision: 9,
    });
    const response: request.Response = await admin(
      server()
        .put('/content/admin/faq/order')
        .set('if-match', '"4"')
        .send({ ids: ['contact', 'availability'] }),
    );
    expect(response.status).toBe(200);
    expect(response.headers['etag']).toBe('"5"');
    expect(response.body.member.map((e: { id: string }): string => e.id)).toEqual([
      'contact',
      'availability',
    ]);
    expect(useCases.reorder.execute).toHaveBeenCalledWith(4, ['contact', 'availability']);
  });

  it('refuses a repeated id (400) and an incomplete order (422)', async (): Promise<void> => {
    const repeated: request.Response = await admin(
      server()
        .put('/content/admin/faq/order')
        .set('if-match', '"4"')
        .send({ ids: ['a', 'a'] }),
    );
    expect(repeated.status).toBe(400);
    useCases.reorder.execute.mockRejectedValue(
      new DomainError('content.faq-order-invalid', 'Every question once.', ['ids']),
    );
    const incomplete: request.Response = await admin(
      server()
        .put('/content/admin/faq/order')
        .set('if-match', '"4"')
        .send({ ids: ['a'] }),
    );
    expect(incomplete.status).toBe(422);
    expect(incomplete.body).toMatchObject({
      code: 'content.faq-order-invalid',
      errors: [{ field: 'ids' }],
    });
  });

  it('deletes with the entry version and answers the remaining list', async (): Promise<void> => {
    useCases.remove.execute.mockResolvedValue({
      version: 6,
      entries: [entry('availability', 0)],
      revision: 10,
    });
    const response: request.Response = await admin(
      server().delete('/content/admin/faq/entries/contact').set('if-match', '"2"'),
    );
    expect(response.status).toBe(200);
    expect(response.headers['etag']).toBe('"6"');
    expect(response.body).toMatchObject({ version: 6, totalItems: 1 });
    expect(useCases.remove.execute).toHaveBeenCalledWith('contact', 2);
  });
});
