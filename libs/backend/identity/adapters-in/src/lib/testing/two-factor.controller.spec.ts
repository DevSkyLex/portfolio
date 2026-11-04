import type { Server as NodeHttpServer } from 'node:http';
import type { Mock } from 'vitest';
import { type INestApplication, Logger, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { APP_FILTER } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { AdminAuthModule } from '@vfortin/backend-auth';
import { PROBLEM_MAPPER, ProblemDetailsFilter } from '@vfortin/backend-http';
import {
  DisableTwoFactor,
  EnableTwoFactor,
  GetTwoFactorStatus,
  InvalidSessionError,
  PasswordMismatchError,
  StartTwoFactorSetup,
  TotpInvalidError,
} from '@vfortin/identity-application';
import { TwoFactorSetupResponseSchema } from '@vfortin/identity-contracts';
import { AccountLockedError, TwoFactorStateError } from '@vfortin/identity-domain';
import { type JWK, SignJWT, exportJWK, generateKeyPair } from 'jose';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import { TwoFactorController } from '@internal/identity-adapters-in/lib/http/controllers/two-factor/two-factor.controller';
import { identityProblemMapper } from '@internal/identity-adapters-in/lib/http/mappers/identity-problem/identity-problem.mapper';

/**
 * Constant ISSUER
 *
 * @description
 * Issuer expected by the administrator guard of the test application.
 *
 * @type {string}
 */
const ISSUER = 'https://exemple.fr/api/auth' as const;

/**
 * Constant SETUP
 *
 * @description
 * Enrollment answer of the shared contract fixture, returned by the mocked setup use case.
 *
 * @type {{ secret: string; provisioningUri: string }}
 */
const SETUP: { secret: string; provisioningUri: string } = JSON.parse(
  readFileSync(
    new URL(
      '../../../../../../contracts/identity/src/lib/testing/two-factor-setup-response.fixture.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as { secret: string; provisioningUri: string };

/**
 * Constant useCases
 *
 * @description
 * Mocked second-factor use cases.
 */
const useCases: {
  status: Mock<GetTwoFactorStatus['execute']>;
  setup: Mock<StartTwoFactorSetup['execute']>;
  enable: Mock<EnableTwoFactor['execute']>;
  disable: Mock<DisableTwoFactor['execute']>;
} = {
  status: vi.fn<GetTwoFactorStatus['execute']>(),
  setup: vi.fn<StartTwoFactorSetup['execute']>(),
  enable: vi.fn<EnableTwoFactor['execute']>(),
  disable: vi.fn<DisableTwoFactor['execute']>(),
};

describe('TwoFactorController', (): void => {
  /**
   * Variable app
   *
   * @description
   * Application hosting the controller behind the real administrator guard.
   *
   * @type {INestApplication<NodeHttpServer>}
   */
  let app: INestApplication<NodeHttpServer>;

  /**
   * Variable token
   *
   * @description
   * Valid administrator access token for subject `a1`.
   *
   * @type {string}
   */
  let token: string;

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
      controllers: [TwoFactorController],
      providers: [
        { provide: GetTwoFactorStatus, useValue: { execute: useCases.status } },
        { provide: StartTwoFactorSetup, useValue: { execute: useCases.setup } },
        { provide: EnableTwoFactor, useValue: { execute: useCases.enable } },
        { provide: DisableTwoFactor, useValue: { execute: useCases.disable } },
        { provide: PROBLEM_MAPPER, useValue: identityProblemMapper },
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
    vi.spyOn(Logger.prototype, 'warn').mockImplementation((): undefined => undefined);
  });

  afterEach((): void => {
    vi.restoreAllMocks();
  });

  /**
   * Function get
   *
   * @description
   * Reads the status, with the administrator token unless told otherwise.
   *
   * @param {boolean} authorized - Whether to send the bearer token.
   *
   * @returns {request.Test} Supertest request.
   */
  const get = (authorized: boolean = true): request.Test => {
    const call: request.Test = request(app.getHttpServer()).get('/auth/totp');
    return authorized ? call.set('authorization', `Bearer ${token}`) : call;
  };

  /**
   * Function post
   *
   * @description
   * Posts to a second-factor route, with the administrator token unless told otherwise.
   *
   * @param {string} path - Route below `/auth/totp/`.
   * @param {object} body - Request body.
   * @param {boolean} authorized - Whether to send the bearer token.
   *
   * @returns {request.Test} Supertest request.
   */
  const post = (path: string, body: object, authorized: boolean = true): request.Test => {
    const call: request.Test = request(app.getHttpServer()).post(`/auth/totp/${path}`);
    return (authorized ? call.set('authorization', `Bearer ${token}`) : call).send(body);
  };

  it('answers the status of the token subject, not cacheable', async (): Promise<void> => {
    useCases.status.mockResolvedValue({ enabled: false });
    const response: request.Response = await get();
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toEqual({ enabled: false });
    expect(useCases.status).toHaveBeenCalledWith('a1');
  });

  it('returns the pending secret and its URI once the password is checked', async (): Promise<void> => {
    useCases.setup.mockResolvedValue(SETUP);
    const response: request.Response = await post('setup', { password: 'a-strong-password' });
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(TwoFactorSetupResponseSchema.parse(response.body)).toEqual(SETUP);
    expect(useCases.setup).toHaveBeenCalledWith({ accountId: 'a1', password: 'a-strong-password' });
  });

  it('confirms the enrollment', async (): Promise<void> => {
    useCases.enable.mockResolvedValue(undefined);
    const response: request.Response = await post('enable', { totp: '123456' });
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toEqual({ enabled: true });
    expect(useCases.enable).toHaveBeenCalledWith({ accountId: 'a1', totp: '123456' });
  });

  it('turns the code off', async (): Promise<void> => {
    useCases.disable.mockResolvedValue(undefined);
    const response: request.Response = await post('disable', {
      password: 'a-strong-password',
      totp: '123456',
    });
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toEqual({ enabled: false });
    expect(useCases.disable).toHaveBeenCalledWith({
      accountId: 'a1',
      password: 'a-strong-password',
      totp: '123456',
    });
  });

  it.each([
    ['GET', ''],
    ['POST', 'setup'],
    ['POST', 'enable'],
    ['POST', 'disable'],
  ])(
    'answers %s /auth/totp/%s with 401 without a token',
    async (method: string, path: string): Promise<void> => {
      const response: request.Response =
        method === 'GET'
          ? await get(false)
          : await post(path, { password: 'p', totp: '123456' }, false);
      expect(response.status).toBe(401);
      expect(response.body.code).toBe('auth.unauthorized');
      expect(Object.values(useCases).every((m: Mock): boolean => m.mock.calls.length === 0)).toBe(
        true,
      );
    },
  );

  it.each([
    ['setup', { password: 'wrong' }, 'setup'],
    ['disable', { password: 'wrong', totp: '123456' }, 'disable'],
  ] as const)(
    'answers a wrong password on %s with 422 identity.password-mismatch, and logs it',
    async (path: string, body: object, useCase: 'setup' | 'disable'): Promise<void> => {
      useCases[useCase].mockRejectedValue(new PasswordMismatchError());
      const response: request.Response = await post(path, body);
      expect(response.status).toBe(422);
      expect(response.body).toMatchObject({
        code: 'identity.password-mismatch',
        title: 'The password is incorrect.',
      });
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringMatching(/\(identity\.password-mismatch\)$/),
      );
    },
  );

  it.each([
    ['enable', { totp: '000000' }, 'enable'],
    ['disable', { password: 'a-strong-password', totp: '000000' }, 'disable'],
  ] as const)(
    'answers a wrong code on %s with 422 identity.totp-invalid',
    async (path: string, body: object, useCase: 'enable' | 'disable'): Promise<void> => {
      useCases[useCase].mockRejectedValue(new TotpInvalidError());
      const response: request.Response = await post(path, body);
      expect(response.status).toBe(422);
      expect(response.body.code).toBe('identity.totp-invalid');
    },
  );

  it.each([
    ['setup', { password: 'a-strong-password' }, 'setup'],
    ['enable', { totp: '123456' }, 'enable'],
    ['disable', { password: 'a-strong-password', totp: '123456' }, 'disable'],
  ] as const)(
    'answers a state conflict on %s with 409 identity.totp-state',
    async (path: string, body: object, useCase: 'setup' | 'enable' | 'disable'): Promise<void> => {
      useCases[useCase].mockRejectedValue(new TwoFactorStateError());
      const response: request.Response = await post(path, body);
      expect(response.status).toBe(409);
      expect(response.body.code).toBe('identity.totp-state');
    },
  );

  it('answers a locked account like a locked login', async (): Promise<void> => {
    useCases.setup.mockRejectedValue(new AccountLockedError(new Date()));
    const response: request.Response = await post('setup', { password: 'a-strong-password' });
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('identity.invalid-credentials');
    expect(Logger.prototype.warn).toHaveBeenCalledWith(
      'Second-factor setup refused (identity.locked)',
    );
  });

  it('answers a deleted account with 401 identity.invalid-session', async (): Promise<void> => {
    useCases.status.mockRejectedValue(new InvalidSessionError());
    const response: request.Response = await get();
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('identity.invalid-session');
  });

  it('refuses a request without verified claims, should the guard be missing', async (): Promise<void> => {
    const controller: TwoFactorController = app.get(TwoFactorController);
    await expect(controller.status({} as Request)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(useCases.status).not.toHaveBeenCalled();
  });

  it.each([
    ['setup', {}],
    ['setup', { password: '' }],
    ['enable', { totp: '12' }],
    ['disable', { password: 'a-strong-password' }],
  ])(
    'rejects a malformed %s request (400) without calling the use case',
    async (path: string, body: object): Promise<void> => {
      const response: request.Response = await post(path, body);
      expect(response.status).toBe(400);
      expect(Object.values(useCases).every((m: Mock): boolean => m.mock.calls.length === 0)).toBe(
        true,
      );
    },
  );
});
