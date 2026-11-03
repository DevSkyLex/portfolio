import type { Server as NodeHttpServer } from 'node:http';
import type { TestingModule } from '@nestjs/testing';
import type { SubmitContactMessageCommand } from '@vfortin/contact-application';
import type { Mock } from 'vitest';
import { type INestApplication, Logger } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AdminAuthModule } from '@vfortin/backend-auth';
import { PROBLEM_MAPPER, ProblemDetailsFilter } from '@vfortin/backend-http';
import {
  ArchiveContactMessage,
  DeleteContactMessage,
  DeliverPendingNotifications,
  ListContactMessages,
  MarkContactMessageRead,
  NotFoundError,
  PurgeExpiredMessages,
  RateLimitedError,
  SubmitContactMessage,
  VersionMismatchError,
} from '@vfortin/contact-application';
import { ContactMessageListSchema } from '@vfortin/contact-contracts';
import { ContactMessage, InvalidValueError } from '@vfortin/contact-domain';
import { type JWK, SignJWT, exportJWK, generateKeyPair } from 'jose';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import { AdminContactController } from '@internal/contact-adapters-in/lib/http/controllers/admin-contact/admin-contact.controller';
import { contactProblemMapper } from '@internal/contact-adapters-in/lib/http/mappers/contact-problem/contact-problem.mapper';
import {
  CONTACT_HTTP_OPTIONS,
  ContactController,
} from '@internal/contact-adapters-in/lib/http/controllers/contact/contact.controller';
import { ContactJobs } from '@internal/contact-adapters-in/lib/jobs/contact/contact.jobs';

/**
 * Constant ISSUER
 * @readonly
 *
 * @description
 * Test issuer used to create signed admin tokens accepted by the auth module.
 */
const ISSUER: string = 'https://exemple.fr/api/auth';

/**
 * Function fixture
 *
 * @description
 * Reads and parses one shared contact contract fixture by filename.
 * @param {string} name - Fixture filename to load.
 * @returns {Record<string, unknown>} Parsed fixture value.
 */
const fixture: (name: string) => Record<string, unknown> = (
  name: string,
): Record<string, unknown> =>
  JSON.parse(
    readFileSync(
      new URL(`../../../../../../contracts/contact/src/lib/testing/${name}`, import.meta.url),
      'utf8',
    ),
  );

/**
 * Constant REQUEST
 * @readonly
 *
 * @description
 * Public contact submission payload shared with the contract fixture directory.
 */
const REQUEST: Record<string, unknown> = fixture('contact-message.fixture.json');

/**
 * Constant LIST
 * @readonly
 *
 * @description
 * Inbox fixture used to build a stored message for administrator endpoint responses.
 */
const LIST: { member: Record<string, string>[] } = fixture('contact-message-list.fixture.json') as {
  member: Record<string, string>[];
};

/**
 * Constant stored
 * @readonly
 *
 * @description
 * Domain message returned by the mocked administrator read, archive and list use cases.
 */
const stored: ContactMessage = ContactMessage.rehydrate({
  id: String(LIST.member[0]?.['id']),
  name: 'Camille Martin',
  company: 'Atelier Nord',
  email: 'camille@exemple.fr',
  subject: 'job',
  body: 'Bonjour, nous recrutons un développeur Angular à Tours.',
  locale: 'fr',
  status: 'received',
  receivedAt: new Date('2026-11-02T10:00:00.000Z'),
  purgeAt: new Date('2029-11-02T10:00:00.000Z'),
  version: 1,
});

describe('ContactController and AdminContactController', (): void => {
  let app: INestApplication<NodeHttpServer>;
  let token: string;
  const useCases: {
    submit: { execute: Mock<SubmitContactMessage['execute']> };
    list: { execute: Mock<ListContactMessages['execute']> };
    read: { execute: Mock<MarkContactMessageRead['execute']> };
    archive: { execute: Mock<ArchiveContactMessage['execute']> };
    remove: { execute: Mock<DeleteContactMessage['execute']> };
  } = {
    submit: { execute: vi.fn<SubmitContactMessage['execute']>() },
    list: { execute: vi.fn<ListContactMessages['execute']>() },
    read: { execute: vi.fn<MarkContactMessageRead['execute']>() },
    archive: { execute: vi.fn<ArchiveContactMessage['execute']>() },
    remove: { execute: vi.fn<DeleteContactMessage['execute']>() },
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
      controllers: [ContactController, AdminContactController],
      providers: [
        { provide: SubmitContactMessage, useValue: useCases.submit },
        { provide: ListContactMessages, useValue: useCases.list },
        { provide: MarkContactMessageRead, useValue: useCases.read },
        { provide: ArchiveContactMessage, useValue: useCases.archive },
        { provide: DeleteContactMessage, useValue: useCases.remove },
        { provide: CONTACT_HTTP_OPTIONS, useValue: { clientKeySecret: 'test-secret' } },
        { provide: PROBLEM_MAPPER, useValue: contactProblemMapper },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
    }).compile();
    app = moduleRef.createNestApplication<INestApplication<NodeHttpServer>>();
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

  describe('public form', (): void => {
    it('accepts the shared fixture (202) and passes an origin fingerprint, never the IP', async (): Promise<void> => {
      useCases.submit.execute.mockResolvedValue({ id: 'm1' });
      const response: request.Response = await server().post('/contact/messages').send(REQUEST);
      expect(response.status).toBe(202);
      expect(response.body).toEqual({ status: 'received' });
      const command: SubmitContactMessageCommand | undefined =
        useCases.submit.execute.mock.calls[0]?.[0];
      expect(command).toMatchObject({ body: REQUEST['message'], company: 'Atelier Nord' });
      expect(command?.clientKey).toMatch(/^[0-9a-f]{64}$/);
      expect(JSON.stringify(command)).not.toMatch(/127\.0\.0\.1|::1/);
    });

    it('sends no company when the field is absent', async (): Promise<void> => {
      useCases.submit.execute.mockResolvedValue({ id: 'm1' });
      const withoutCompany: Record<string, unknown> = { ...REQUEST };
      delete withoutCompany['company'];
      await server().post('/contact/messages').send(withoutCompany);
      expect(useCases.submit.execute.mock.calls[0]?.[0].company).toBeNull();
    });

    it('drops a honeypot submission silently', async (): Promise<void> => {
      const response: request.Response = await server()
        .post('/contact/messages')
        .send({ ...REQUEST, website: 'https://spam.example' });
      expect(response.status).toBe(202);
      expect(useCases.submit.execute).not.toHaveBeenCalled();
    });

    it('rejects an invalid format field by field (400)', async (): Promise<void> => {
      const response: request.Response = await server()
        .post('/contact/messages')
        .send({ ...REQUEST, email: 'camille@', message: 'Court.' });
      expect(response.status).toBe(400);
      expect(response.body.errors.map((e: { field: string }): string => e.field).sort()).toEqual([
        'email',
        'message',
      ]);
    });

    it.each([
      [new RateLimitedError(), 429, 'contact.rate-limited', undefined],
      [new InvalidValueError('body', 'too short'), 422, 'contact.invalid-value', 'message'],
    ])('maps %s to problem+json', async (error, status, code, field): Promise<void> => {
      useCases.submit.execute.mockRejectedValue(error);
      const response: request.Response = await server().post('/contact/messages').send(REQUEST);
      expect(response.status).toBe(status);
      expect(response.body.code).toBe(code);
      expect(response.body.errors?.[0]?.field).toBe(field);
    });
  });

  describe('inbox', (): void => {
    it('requires an administrator token', async (): Promise<void> => {
      expect((await server().get('/contact/admin/messages')).status).toBe(401);
    });

    it('lists the messages in the shared contract format', async (): Promise<void> => {
      useCases.list.execute.mockResolvedValue({ items: [stored], total: 1 });
      const response: request.Response = await admin(
        server().get('/contact/admin/messages?status=received'),
      );
      expect(response.status).toBe(200);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(ContactMessageListSchema.parse(response.body)).toEqual(LIST);
      expect(useCases.list.execute).toHaveBeenCalledWith({
        status: 'received',
        page: 1,
        pageSize: 20,
      });
    });

    it('lists every status when no filter is given', async (): Promise<void> => {
      useCases.list.execute.mockResolvedValue({ items: [], total: 0 });
      await admin(server().get('/contact/admin/messages?page=2&pageSize=5'));
      expect(useCases.list.execute).toHaveBeenCalledWith({ status: null, page: 2, pageSize: 5 });
    });

    it('rejects a page size above the maximum (400)', async (): Promise<void> => {
      const response: request.Response = await admin(
        server().get('/contact/admin/messages?pageSize=500'),
      );
      expect(response.status).toBe(400);
    });

    it.each([
      ['read', 'read'],
      ['archive', 'archive'],
    ] as const)(
      '%s with If-Match, returning the new ETag',
      async (path, useCase): Promise<void> => {
        useCases[useCase].execute.mockResolvedValue({ message: stored.markRead(), version: 2 });
        const response: request.Response = await admin(
          server().post(`/contact/admin/messages/${stored.id}/${path}`).set('if-match', '"1"'),
        );
        expect(response.status).toBe(200);
        expect(response.headers['etag']).toBe('"2"');
        expect(response.body).toMatchObject({ status: 'read', version: 2 });
        expect(useCases[useCase].execute).toHaveBeenCalledWith(stored.id, 1);
      },
    );

    it.each([
      [new VersionMismatchError(), 412, 'contact.version-mismatch'],
      [new NotFoundError(), 404, 'contact.not-found'],
    ])('maps %s to problem+json', async (error, status, code): Promise<void> => {
      useCases.archive.execute.mockRejectedValue(error);
      const response: request.Response = await admin(
        server().post(`/contact/admin/messages/${stored.id}/archive`).set('if-match', '"1"'),
      );
      expect(response.status).toBe(status);
      expect(response.body.code).toBe(code);
    });

    it('requires If-Match before a status change (428)', async (): Promise<void> => {
      const response: request.Response = await admin(
        server().post(`/contact/admin/messages/${stored.id}/read`),
      );
      expect(response.status).toBe(428);
    });

    it('erases a message (204)', async (): Promise<void> => {
      useCases.remove.execute.mockResolvedValue(undefined);
      const response: request.Response = await admin(
        server().delete(`/contact/admin/messages/${stored.id}`),
      );
      expect(response.status).toBe(204);
      expect(useCases.remove.execute).toHaveBeenCalledWith(stored.id);
    });
  });
});

describe('contactProblemMapper', (): void => {
  it('leaves unknown errors to the filter', (): void => {
    expect(contactProblemMapper(new Error('other'))).toBeNull();
  });

  it('keeps the domain field name when it has no contract name', (): void => {
    expect(contactProblemMapper(new InvalidValueError('email', 'invalid'))).toMatchObject({
      errors: [{ field: 'email', message: 'email: invalid' }],
    });
  });
});

describe('ContactJobs', (): void => {
  const deliver: Mock<DeliverPendingNotifications['execute']> =
    vi.fn<DeliverPendingNotifications['execute']>();
  const purge: Mock<PurgeExpiredMessages['execute']> = vi.fn<PurgeExpiredMessages['execute']>();
  const jobs: ContactJobs = new ContactJobs(
    { execute: deliver } as unknown as DeliverPendingNotifications,
    { execute: purge } as unknown as PurgeExpiredMessages,
  );

  beforeEach((): void => {
    deliver.mockReset();
    purge.mockReset();
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach((): void => {
    vi.restoreAllMocks();
  });

  it('reports a delivery run only when something happened', async (): Promise<void> => {
    deliver
      .mockResolvedValueOnce({ sent: 0, failed: 0, lost: 0 })
      .mockResolvedValueOnce({ sent: 2, failed: 1, lost: 0 });
    await jobs.deliverNotifications();
    await jobs.deliverNotifications();
    expect(Logger.prototype.log).toHaveBeenCalledOnce();
    expect(Logger.prototype.log).toHaveBeenCalledWith(
      'Notifications: 2 sent, 1 failed, 0 lease(s) lost',
    );
  });

  it('runs one delivery at a time and survives a failure', async (): Promise<void> => {
    let release: () => void = () => undefined;
    deliver.mockImplementationOnce(
      () =>
        new Promise<{ sent: number; failed: number; lost: number }>(
          (_resolve, reject): (() => void) =>
            (release = (): void => reject(new Error('SMTP down'))),
        ),
    );
    const first: Promise<void> = jobs.deliverNotifications();
    await jobs.deliverNotifications();
    expect(deliver).toHaveBeenCalledOnce();
    release();
    await first;
    expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining('SMTP down'));
    deliver.mockRejectedValueOnce('plain text');
    await jobs.deliverNotifications();
    expect(Logger.prototype.error).toHaveBeenLastCalledWith('plain text');
  });

  it('purges and logs, and survives a failure', async (): Promise<void> => {
    purge.mockResolvedValueOnce({ deleted: 3 }).mockRejectedValueOnce(new Error('db down'));
    await jobs.purgeExpired();
    expect(Logger.prototype.log).toHaveBeenCalledWith('Purge: 3 message(s) deleted');
    await jobs.purgeExpired();
    expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining('db down'));
    purge.mockRejectedValueOnce('plain text');
    await jobs.purgeExpired();
    expect(Logger.prototype.error).toHaveBeenLastCalledWith('plain text');
  });
});
