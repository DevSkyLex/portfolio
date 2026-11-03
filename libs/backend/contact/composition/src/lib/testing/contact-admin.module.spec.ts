import type { Server as NodeHttpServer } from 'node:http';
import type { TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AdminAuthModule } from '@vfortin/backend-auth';
import { ObservabilityModule } from '@vfortin/backend-observability';
import { migrateContactDatabase } from '@vfortin/contact-adapters-out';
import { type JWK, SignJWT, exportJWK, generateKeyPair } from 'jose';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { ContactModule } from '@internal/contact-composition/lib/contact.module';

/**
 * Constant MIGRATIONS
 * @readonly
 *
 * @description
 * Absolute migration directory used to initialize the contact integration database.
 */
const MIGRATIONS: string = fileURLToPath(
  new URL('../../../../../../../apps/contact-service/migrations', import.meta.url),
);

/**
 * Constant ISSUER
 * @readonly
 *
 * @description
 * Issuer used to sign administrator tokens accepted by the test auth module.
 */
const ISSUER: string = 'https://exemple.fr/api/auth';

/** Admin inbox: protected routes, optimistic locking, erasure. */
describe('ContactModule (administration)', (): void => {
  let app: INestApplication<NodeHttpServer>;
  let auth: { authorization: string };

  beforeAll(async (): Promise<void> => {
    const { publicKey, privateKey } = await generateKeyPair('EdDSA', { crv: 'Ed25519' });
    const jwk: JWK = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'EdDSA' };
    const token: string = await new SignJWT({ role: 'admin', sid: 'f1' })
      .setProtectedHeader({ alg: 'EdDSA', kid: 'k1', typ: 'at+jwt' })
      .setSubject('a1')
      .setIssuer(ISSUER)
      .setAudience('portfolio-admin')
      .setIssuedAt()
      .setNotBefore(new Date())
      .setJti('j1')
      .setExpirationTime('5m')
      .sign(privateKey);
    auth = { authorization: `Bearer ${token}` };
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ObservabilityModule.forRoot({ service: 'contact-test', level: 'silent', pretty: false }),
        AdminAuthModule.forRoot({ issuer: ISSUER, jwks: { keys: [jwk] } }),
        ContactModule.register({
          databaseUrl: 'pglite:memory',
          mail: { url: 'json:', from: 'Portfolio <noreply@exemple.fr>', to: 'moi@exemple.fr' },
          clientKeySecret: 'test-secret',
          workers: false,
          mailSender: { send: async (): Promise<undefined> => undefined },
          prepare: (database): Promise<void> => migrateContactDatabase(database, MIGRATIONS),
        }),
      ],
    }).compile();
    app = moduleRef.createNestApplication<INestApplication<NodeHttpServer>>();
    app.setGlobalPrefix('api', { exclude: ['health/live', 'health/ready'] });
    await app.init();
    await request(app.getHttpServer()).post('/api/contact/messages').send({
      name: 'Camille Martin',
      email: 'camille@exemple.fr',
      subject: 'job',
      message: 'Bonjour, nous recrutons un développeur Angular à Tours.',
      locale: 'fr',
    });
  });

  afterAll(async (): Promise<void> => {
    await app.close();
  });

  const server = (): ReturnType<typeof request> => request(app.getHttpServer());

  it('requires an administrator token', async (): Promise<void> => {
    expect((await server().get('/api/contact/admin/messages')).status).toBe(401);
  });

  it('lists received messages, paginated', async (): Promise<void> => {
    const response: request.Response = await server()
      .get('/api/contact/admin/messages?status=received')
      .set(auth);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ totalItems: 1, view: { page: 1, pageSize: 20 } });
    expect(response.body.member[0]).toMatchObject({ name: 'Camille Martin', version: 1 });
  });

  it('marks as read, rejects a stale version, then erases', async (): Promise<void> => {
    const [message] = (await server().get('/api/contact/admin/messages').set(auth)).body.member;
    const path: string = `/api/contact/admin/messages/${message.id}`;
    const read: request.Response = await server()
      .post(`${path}/read`)
      .set(auth)
      .set('if-match', '"1"');
    expect(read.status).toBe(200);
    expect(read.headers['etag']).toBe('"2"');
    expect(read.body.status).toBe('read');
    const stale: request.Response = await server()
      .post(`${path}/archive`)
      .set(auth)
      .set('if-match', '"1"');
    expect(stale.status).toBe(412);
    expect((await server().delete(path).set(auth)).status).toBe(204);
    expect((await server().delete(path).set(auth)).status).toBe(404);
  });
});
