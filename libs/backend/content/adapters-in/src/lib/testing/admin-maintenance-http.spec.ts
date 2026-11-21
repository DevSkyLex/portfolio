import type { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Server } from 'node:http';
import { AdminAuthModule } from '@vfortin/backend-auth';
import { PROBLEM_MAPPER, ProblemDetailsFilter } from '@vfortin/backend-http';
import {
  GetAdminMaintenance,
  ReviseMaintenance,
  VersionMismatchError,
} from '@vfortin/content-application';
import { AdminMaintenanceDtoSchema } from '@vfortin/content-contracts';
import { InvalidValueError, MaintenanceMode } from '@vfortin/content-domain';
import { type JWK, SignJWT, exportJWK, generateKeyPair } from 'jose';
import request from 'supertest';
import { AdminMaintenanceController } from '@internal/content-adapters-in/lib/http/controllers/admin-maintenance/admin-maintenance.controller';
import { contentProblemMapper } from '@internal/content-adapters-in/lib/http/mappers/content-problem/content-problem.mapper';

/**
 * Constant ISSUER
 *
 * @description
 * Issuer of the test access token.
 */
const ISSUER: string = 'https://exemple.fr/api/auth';

/**
 * Function setting
 *
 * @description
 * Builds an enabled setting at the supplied version.
 *
 * @param {number} version - Version.
 * @returns {MaintenanceMode} Setting.
 */
function setting(version: number): MaintenanceMode {
  return MaintenanceMode.rehydrate({
    enabled: true,
    message: { fr: 'Retour à 14 h.', en: 'Back at 2 pm.' },
    version,
  });
}

describe('AdminMaintenanceController', (): void => {
  let app: INestApplication<Server>;
  let token: string;
  const useCases = {
    get: { execute: vi.fn<GetAdminMaintenance['execute']>() },
    revise: { execute: vi.fn<ReviseMaintenance['execute']>() },
  } satisfies {
    get: Pick<GetAdminMaintenance, 'execute'>;
    revise: Pick<ReviseMaintenance, 'execute'>;
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
      controllers: [AdminMaintenanceController],
      providers: [
        { provide: GetAdminMaintenance, useValue: useCases.get },
        { provide: ReviseMaintenance, useValue: useCases.revise },
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
    for (const call of [
      (): request.Test => server().get('/content/admin/maintenance'),
      (): request.Test => server().put('/content/admin/maintenance').send({ enabled: 'yes' }),
    ]) {
      const response: request.Response = await call();
      expect(response.status).toBe(401);
      expect(response.body.code).toBe('auth.unauthorized');
    }
    expect(useCases.revise.execute).not.toHaveBeenCalled();
  });

  it('reads the setting with its version as ETag, matching the contract', async (): Promise<void> => {
    useCases.get.execute.mockResolvedValue(setting(3));
    const response: request.Response = await admin(server().get('/content/admin/maintenance'));
    expect(response.status).toBe(200);
    expect(response.headers['etag']).toBe('"3"');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(AdminMaintenanceDtoSchema.parse(response.body)).toEqual({
      enabled: true,
      message: { fr: 'Retour à 14 h.', en: 'Back at 2 pm.' },
      version: 3,
    });
  });

  it('revises with If-Match and answers the new ETag', async (): Promise<void> => {
    useCases.revise.execute.mockResolvedValue(setting(4));
    const response: request.Response = await admin(
      server().put('/content/admin/maintenance').set('if-match', '"3"'),
    ).send({ enabled: true, message: { fr: ' Retour à 14 h. ', en: 'Back at 2 pm.' } });
    expect(response.status).toBe(200);
    expect(response.headers['etag']).toBe('"4"');
    expect(useCases.revise.execute).toHaveBeenCalledWith(3, {
      enabled: true,
      message: { fr: 'Retour à 14 h.', en: 'Back at 2 pm.' },
    });
  });

  it('requires If-Match (428) and reports a stale version (412)', async (): Promise<void> => {
    const missing: request.Response = await admin(server().put('/content/admin/maintenance')).send({
      enabled: false,
    });
    expect(missing.status).toBe(428);
    expect(missing.body.code).toBe('request.precondition-required');
    useCases.revise.execute.mockRejectedValue(new VersionMismatchError('stale'));
    const stale: request.Response = await admin(
      server().put('/content/admin/maintenance').set('if-match', '"1"'),
    ).send({ enabled: false });
    expect(stale.status).toBe(412);
    expect(stale.body.code).toBe('content.version-mismatch');
  });

  it('rejects an invalid body (400) and a message over the limit (422 on its field)', async (): Promise<void> => {
    const invalid: request.Response = await admin(
      server().put('/content/admin/maintenance').set('if-match', '"1"'),
    ).send({ enabled: true, message: { fr: 'x'.repeat(501) } });
    expect(invalid.status).toBe(400);
    expect(invalid.body.code).toBe('request.invalid');
    expect(useCases.revise.execute).not.toHaveBeenCalled();
    useCases.revise.execute.mockRejectedValue(
      new InvalidValueError('message.en', 'at most 500 characters'),
    );
    const domain: request.Response = await admin(
      server().put('/content/admin/maintenance').set('if-match', '"1"'),
    ).send({ enabled: true });
    expect(domain.status).toBe(422);
    expect(domain.body.errors).toEqual([
      { field: 'message.en', message: 'message.en: at most 500 characters' },
    ]);
  });
});
