import type { Server as NodeHttpServer } from 'node:http';
import type { Mock } from 'vitest';
import { type INestApplication, Logger } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { PROBLEM_MAPPER, ProblemDetailsFilter } from '@vfortin/backend-http';
import {
  AlreadyBootstrappedError,
  ChallengeExpiredError,
  InvalidCredentialsError,
  InvalidSessionError,
  Login,
  Logout,
  RefreshSession,
  type Session,
  VerifyLoginCode,
} from '@vfortin/identity-application';
import { AccountLockedError, WeakPasswordError } from '@vfortin/identity-domain';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import {
  AuthController,
  IDENTITY_HTTP_OPTIONS,
  identityCookie,
  readCookie,
} from '@internal/identity-adapters-in/lib/http/controllers/auth/auth.controller';
import { identityProblemMapper } from '@internal/identity-adapters-in/lib/http/mappers/identity-problem/identity-problem.mapper';

/**
 * Function fixture
 *
 * @description
 * Loads a JSON fixture of the shared identity contracts.
 *
 * @param {string} name - Fixture file name.
 *
 * @returns {Record<string, unknown>} Parsed fixture.
 */
const fixture = (name: string): Record<string, unknown> =>
  JSON.parse(
    readFileSync(
      new URL(`../../../../../../contracts/identity/src/lib/testing/${name}`, import.meta.url),
      'utf8',
    ),
  ) as Record<string, unknown>;

/**
 * Constant LOGIN
 *
 * @description
 * First-step contract fixture sent through the HTTP controller tests.
 *
 * @type {Record<string, unknown>}
 */
const LOGIN: Record<string, unknown> = fixture('login-request.fixture.json');

/**
 * Constant TOTP
 *
 * @description
 * Second-step contract fixture sent through the HTTP controller tests.
 *
 * @type {Record<string, unknown>}
 */
const TOTP: Record<string, unknown> = fixture('totp-request.fixture.json');

/**
 * Constant REFRESH_EXPIRY
 *
 * @description
 * Refresh expiry of the mocked sessions, as serialized in a cookie.
 *
 * @type {Date}
 */
const REFRESH_EXPIRY: Date = new Date('2026-12-02T10:00:00Z');

/**
 * Constant DEVICE_EXPIRY
 *
 * @description
 * Expiry of the mocked trusted device.
 *
 * @type {Date}
 */
const DEVICE_EXPIRY: Date = new Date('2026-12-01T10:00:00Z');

/**
 * Function session
 *
 * @description
 * Builds a deterministic session result returned by the mocked application use cases.
 *
 * @param {string} refreshToken - Refresh token placed in the response cookie.
 * @param {boolean} persistent - Whether the session is remembered.
 *
 * @returns {Session} Mock session with fixed access credentials and refresh expiry.
 */
const session = (refreshToken: string, persistent: boolean = true): Session => ({
  access: { token: 'jwt', expiresIn: 300 },
  refreshToken,
  refreshExpiresAt: REFRESH_EXPIRY,
  persistent,
});

/**
 * Constant JWKS
 *
 * @description
 * Public-key fixture returned by the controller's JWKS endpoint.
 *
 * @type {{ keys: { kty: string; crv: string; x: string; kid: string }[] }}
 */
const JWKS: { keys: { kty: string; crv: string; x: string; kid: string }[] } = {
  keys: [{ kty: 'OKP', crv: 'Ed25519', x: 'abc', kid: 'k1' }],
};

/**
 * Constant useCases
 *
 * @description
 * Mocked use cases shared by both controller applications.
 */
const useCases: {
  login: Mock<Login['execute']>;
  verifyCode: Mock<VerifyLoginCode['execute']>;
  refresh: Mock<RefreshSession['execute']>;
  logout: Mock<Logout['execute']>;
} = {
  login: vi.fn<Login['execute']>(),
  verifyCode: vi.fn<VerifyLoginCode['execute']>(),
  refresh: vi.fn<RefreshSession['execute']>(),
  logout: vi.fn<Logout['execute']>(),
};

/**
 * Function createApp
 *
 * @description
 * Starts a Nest application hosting the controller with mocked use cases.
 *
 * @param {boolean} cookieSecure - Whether the cookies are `Secure` with the `__Host-` prefix.
 *
 * @returns {Promise<INestApplication<NodeHttpServer>>} Initialized application.
 */
async function createApp(cookieSecure: boolean): Promise<INestApplication<NodeHttpServer>> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    controllers: [AuthController],
    providers: [
      { provide: Login, useValue: { execute: useCases.login } },
      { provide: VerifyLoginCode, useValue: { execute: useCases.verifyCode } },
      { provide: RefreshSession, useValue: { execute: useCases.refresh } },
      { provide: Logout, useValue: { execute: useCases.logout } },
      { provide: IDENTITY_HTTP_OPTIONS, useValue: { cookieSecure, jwks: JWKS } },
      { provide: PROBLEM_MAPPER, useValue: identityProblemMapper },
      { provide: APP_FILTER, useClass: ProblemDetailsFilter },
    ],
  }).compile();
  const app: INestApplication<NodeHttpServer> =
    moduleRef.createNestApplication<INestApplication<NodeHttpServer>>();
  await app.init();
  return app;
}

/**
 * Function setCookies
 *
 * @description
 * Returns every Set-Cookie header of a response.
 *
 * @param {request.Response} response - HTTP response returned by Supertest.
 *
 * @returns {string[]} Header values, empty when absent.
 */
const setCookies = (response: request.Response): string[] => {
  const header: string | string[] | undefined = response.headers['set-cookie'] as
    string[] | string | undefined;
  return header === undefined ? [] : ([] as string[]).concat(header);
};

beforeEach((): void => {
  vi.clearAllMocks();
  vi.spyOn(Logger.prototype, 'warn').mockImplementation((): undefined => undefined);
});

afterEach((): void => {
  vi.restoreAllMocks();
});

describe('AuthController', (): void => {
  /**
   * Variable app
   *
   * @description
   * Application with secure (`__Host-`) cookies, as served over HTTPS.
   *
   * @type {INestApplication<NodeHttpServer>}
   */
  let app: INestApplication<NodeHttpServer>;

  beforeAll(async (): Promise<void> => {
    app = await createApp(true);
  });

  afterAll(async (): Promise<void> => {
    await app.close();
  });

  /**
   * Function server
   *
   * @description
   * Creates a Supertest client bound to the initialized Nest HTTP server.
   *
   * @returns {ReturnType<typeof request>} Supertest client for route requests.
   */
  const server = (): ReturnType<typeof request> => request(app.getHttpServer());

  describe('login', (): void => {
    it('asks for the one-time code, without setting any cookie', async (): Promise<void> => {
      useCases.login.mockResolvedValue({
        status: 'totp-required',
        challenge: 'challenge-1',
        expiresIn: 300,
      });
      const response: request.Response = await server().post('/auth/login').send(LOGIN);
      expect(response.status).toBe(200);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.body).toEqual({
        status: 'totp-required',
        challenge: 'challenge-1',
        expiresIn: 300,
      });
      expect(setCookies(response)).toEqual([]);
      expect(useCases.login).toHaveBeenCalledWith({ ...LOGIN, deviceToken: null });
    });

    it('opens a remembered session on a trusted device: __Host- refresh cookie with an expiry', async (): Promise<void> => {
      useCases.login.mockResolvedValue({ status: 'authenticated', session: session('refresh-1') });
      const response: request.Response = await server()
        .post('/auth/login')
        .set('cookie', 'other=1; __Host-portfolio_device=device-1')
        .send(LOGIN);
      expect(response.status).toBe(200);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.body).toEqual({
        status: 'authenticated',
        accessToken: 'jwt',
        expiresIn: 300,
      });
      expect(setCookies(response)).toEqual([
        `__Host-portfolio_refresh=refresh-1; Path=/; Expires=${REFRESH_EXPIRY.toUTCString()}; HttpOnly; Secure; SameSite=Strict`,
      ]);
      expect(useCases.login).toHaveBeenCalledWith({ ...LOGIN, deviceToken: 'device-1' });
    });

    it('sets a browser-session refresh cookie when the administrator is not remembered', async (): Promise<void> => {
      useCases.login.mockResolvedValue({
        status: 'authenticated',
        session: session('refresh-1', false),
      });
      const response: request.Response = await server()
        .post('/auth/login')
        .send({ ...LOGIN, remember: false });
      expect(setCookies(response)).toEqual([
        '__Host-portfolio_refresh=refresh-1; Path=/; HttpOnly; Secure; SameSite=Strict',
      ]);
    });

    it('ignores a device cookie without the __Host- prefix', async (): Promise<void> => {
      useCases.login.mockResolvedValue({ status: 'totp-required', challenge: 'c', expiresIn: 300 });
      await server().post('/auth/login').set('cookie', 'portfolio_device=planted').send(LOGIN);
      expect(useCases.login).toHaveBeenCalledWith({ ...LOGIN, deviceToken: null });
    });

    it.each([
      ['wrong credentials', new InvalidCredentialsError()],
      ['a locked account', new AccountLockedError(new Date())],
    ])(
      'answers %s with the same 401, and logs the refusal',
      async (_label: string, error: InvalidCredentialsError): Promise<void> => {
        useCases.login.mockRejectedValue(error);
        const response: request.Response = await server().post('/auth/login').send(LOGIN);
        expect(response.status).toBe(401);
        expect(response.body).toMatchObject({
          code: 'identity.invalid-credentials',
          title: 'Incorrect address, password or code.',
        });
        expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringMatching(/^Login refused/));
      },
    );

    it('rejects a malformed request (400) without calling the use case', async (): Promise<void> => {
      const response: request.Response = await server()
        .post('/auth/login')
        .send({ email: LOGIN['email'], password: LOGIN['password'] });
      expect(response.status).toBe(400);
      expect(useCases.login).not.toHaveBeenCalled();
    });

    it('lets an unexpected failure through as a 500 without detail', async (): Promise<void> => {
      vi.spyOn(Logger.prototype, 'error').mockImplementation((): undefined => undefined);
      useCases.login.mockRejectedValue(new Error('database down'));
      const response: request.Response = await server().post('/auth/login').send(LOGIN);
      expect(response.status).toBe(500);
      expect(JSON.stringify(response.body)).not.toContain('database');
      expect(Logger.prototype.warn).not.toHaveBeenCalled();
    });
  });

  describe('login/totp', (): void => {
    /**
     * Function post
     *
     * @description
     * Creates a second-step request, by default with the required anti-CSRF header.
     *
     * @param {object} body - Request body.
     * @param {boolean} csrf - Whether to attach the valid anti-CSRF header.
     *
     * @returns {request.Test} Supertest request ready to send.
     */
    const post = (body: object = TOTP, csrf: boolean = true): request.Test => {
      const call: request.Test = server().post('/auth/login/totp');
      return (csrf ? call.set('x-csrf', '1') : call).send(body);
    };

    it('requires the anti-CSRF header (403)', async (): Promise<void> => {
      const response: request.Response = await post(TOTP, false);
      expect(response.status).toBe(403);
      expect(response.body.code).toBe('auth.csrf');
      expect(useCases.verifyCode).not.toHaveBeenCalled();
    });

    it('opens the session and trusts the device: two __Host- cookies', async (): Promise<void> => {
      useCases.verifyCode.mockResolvedValue({
        session: session('refresh-1'),
        device: { token: 'device-1', expiresAt: DEVICE_EXPIRY },
      });
      const response: request.Response = await post();
      expect(response.status).toBe(200);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.body).toEqual({ accessToken: 'jwt', expiresIn: 300 });
      expect(setCookies(response)).toEqual([
        `__Host-portfolio_device=device-1; Path=/; Expires=${DEVICE_EXPIRY.toUTCString()}; HttpOnly; Secure; SameSite=Strict`,
        `__Host-portfolio_refresh=refresh-1; Path=/; Expires=${REFRESH_EXPIRY.toUTCString()}; HttpOnly; Secure; SameSite=Strict`,
      ]);
      expect(useCases.verifyCode).toHaveBeenCalledWith(TOTP);
    });

    it('sets only the refresh cookie when the device is not trusted', async (): Promise<void> => {
      useCases.verifyCode.mockResolvedValue({ session: session('refresh-1', false), device: null });
      const response: request.Response = await post({ ...TOTP, trustDevice: false });
      expect(setCookies(response)).toEqual([
        '__Host-portfolio_refresh=refresh-1; Path=/; HttpOnly; Secure; SameSite=Strict',
      ]);
    });

    it('answers an unusable challenge with 401 identity.challenge-expired, and logs it', async (): Promise<void> => {
      useCases.verifyCode.mockRejectedValue(new ChallengeExpiredError());
      const response: request.Response = await post();
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        code: 'identity.challenge-expired',
        title: 'Login step expired; enter your password again.',
      });
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Login code refused (identity.challenge-expired)',
      );
    });

    it.each([
      ['a wrong code', new InvalidCredentialsError()],
      ['a locked account', new AccountLockedError(new Date())],
    ])(
      'answers %s with the generic 401',
      async (_label: string, error: InvalidCredentialsError): Promise<void> => {
        useCases.verifyCode.mockRejectedValue(error);
        const response: request.Response = await post();
        expect(response.status).toBe(401);
        expect(response.body.code).toBe('identity.invalid-credentials');
        expect(setCookies(response)).toEqual([]);
      },
    );

    it('rejects a malformed code (400) without calling the use case', async (): Promise<void> => {
      const response: request.Response = await post({ ...TOTP, totp: '12' });
      expect(response.status).toBe(400);
      expect(useCases.verifyCode).not.toHaveBeenCalled();
    });
  });

  describe('refresh', (): void => {
    /**
     * Function post
     *
     * @description
     * Creates a refresh request with an optional cookie and, by default, the required anti-CSRF header.
     *
     * @param {string | undefined} cookie - Cookie header value to attach.
     * @param {boolean} csrf - Whether to attach the valid anti-CSRF header.
     *
     * @returns {request.Test} Supertest request ready to send.
     */
    const post = (cookie?: string, csrf: boolean = true): request.Test => {
      const call: request.Test = server().post('/auth/refresh');
      if (cookie) call.set('cookie', cookie);
      return csrf ? call.set('x-csrf', '1') : call;
    };

    it('requires the anti-CSRF header (403)', async (): Promise<void> => {
      const response: request.Response = await post('__Host-portfolio_refresh=r1', false);
      expect(response.status).toBe(403);
      expect(response.body.code).toBe('auth.csrf');
      expect(useCases.refresh).not.toHaveBeenCalled();
    });

    it('answers 401 without a cookie, or with a cookie lacking the __Host- prefix', async (): Promise<void> => {
      for (const cookie of [undefined, 'portfolio_refresh=r1']) {
        const response: request.Response = await post(cookie);
        expect(response.status).toBe(401);
        expect(response.body.code).toBe('identity.invalid-session');
      }
      expect(useCases.refresh).not.toHaveBeenCalled();
    });

    it('rotates the cookie, keeping the session kind', async (): Promise<void> => {
      useCases.refresh.mockResolvedValue(session('refresh-2', false));
      const response: request.Response = await post('other=1; __Host-portfolio_refresh=refresh-1');
      expect(response.status).toBe(200);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(useCases.refresh).toHaveBeenCalledWith('refresh-1');
      expect(setCookies(response)).toEqual([
        '__Host-portfolio_refresh=refresh-2; Path=/; HttpOnly; Secure; SameSite=Strict',
      ]);
    });

    it('clears the cookie of an invalid session', async (): Promise<void> => {
      useCases.refresh.mockRejectedValue(new InvalidSessionError());
      const response: request.Response = await post('__Host-portfolio_refresh=stale');
      expect(response.status).toBe(401);
      expect(setCookies(response)).toEqual([
        '__Host-portfolio_refresh=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict',
      ]);
    });

    it('keeps the cookie on an unexpected failure', async (): Promise<void> => {
      vi.spyOn(Logger.prototype, 'error').mockImplementation((): undefined => undefined);
      useCases.refresh.mockRejectedValue(new Error('database down'));
      const response: request.Response = await post('__Host-portfolio_refresh=r1');
      expect(response.status).toBe(500);
      expect(response.headers['set-cookie']).toBeUndefined();
    });
  });

  describe('logout', (): void => {
    it('revokes the session and clears the refresh cookie, keeping the device cookie', async (): Promise<void> => {
      useCases.logout.mockResolvedValue(undefined);
      const response: request.Response = await server()
        .post('/auth/logout')
        .set('cookie', '__Host-portfolio_refresh=r1; __Host-portfolio_device=d1')
        .set('x-csrf', '1');
      expect(response.status).toBe(204);
      expect(useCases.logout).toHaveBeenCalledWith('r1');
      expect(setCookies(response)).toEqual([
        '__Host-portfolio_refresh=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict',
      ]);
    });

    it('clears the cookie even without a session', async (): Promise<void> => {
      const response: request.Response = await server().post('/auth/logout').set('x-csrf', '1');
      expect(response.status).toBe(204);
      expect(useCases.logout).not.toHaveBeenCalled();
    });

    it('requires the anti-CSRF header (403)', async (): Promise<void> => {
      expect((await server().post('/auth/logout')).status).toBe(403);
    });
  });

  it('publishes the verification keys, cacheable', async (): Promise<void> => {
    const response: request.Response = await server().get('/auth/jwks.json');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('public, max-age=600');
    expect(response.body).toEqual(JWKS);
  });
});

describe('AuthController over plain HTTP (development)', (): void => {
  /**
   * Variable app
   *
   * @description
   * Application without secure cookies.
   *
   * @type {INestApplication<NodeHttpServer>}
   */
  let app: INestApplication<NodeHttpServer>;

  beforeAll(async (): Promise<void> => {
    app = await createApp(false);
  });

  afterAll(async (): Promise<void> => {
    await app.close();
  });

  /**
   * Function server
   *
   * @description
   * Creates a Supertest client bound to the development application.
   *
   * @returns {ReturnType<typeof request>} Supertest client for route requests.
   */
  const server = (): ReturnType<typeof request> => request(app.getHttpServer());

  it('reads the plain device cookie and sets a plain refresh cookie on /api/auth, not Secure', async (): Promise<void> => {
    useCases.login.mockResolvedValue({ status: 'authenticated', session: session('refresh-1') });
    const response: request.Response = await server()
      .post('/auth/login')
      .set('cookie', 'portfolio_device=device-1')
      .send(LOGIN);
    expect(useCases.login).toHaveBeenCalledWith({ ...LOGIN, deviceToken: 'device-1' });
    expect(setCookies(response)).toEqual([
      `portfolio_refresh=refresh-1; Path=/api/auth; Expires=${REFRESH_EXPIRY.toUTCString()}; HttpOnly; SameSite=Strict`,
    ]);
  });

  it('sets the plain device cookie on /api/auth', async (): Promise<void> => {
    useCases.verifyCode.mockResolvedValue({
      session: session('refresh-1', false),
      device: { token: 'device-1', expiresAt: DEVICE_EXPIRY },
    });
    const response: request.Response = await server()
      .post('/auth/login/totp')
      .set('x-csrf', '1')
      .send(TOTP);
    expect(setCookies(response)).toEqual([
      `portfolio_device=device-1; Path=/api/auth; Expires=${DEVICE_EXPIRY.toUTCString()}; HttpOnly; SameSite=Strict`,
      'portfolio_refresh=refresh-1; Path=/api/auth; HttpOnly; SameSite=Strict',
    ]);
  });

  it('refreshes and logs out with the plain refresh cookie', async (): Promise<void> => {
    useCases.refresh.mockResolvedValue(session('refresh-2'));
    const refreshed: request.Response = await server()
      .post('/auth/refresh')
      .set('cookie', 'portfolio_refresh=refresh-1')
      .set('x-csrf', '1');
    expect(useCases.refresh).toHaveBeenCalledWith('refresh-1');
    expect(setCookies(refreshed)[0]).toMatch(/^portfolio_refresh=refresh-2; Path=\/api\/auth;/);

    const out: request.Response = await server()
      .post('/auth/logout')
      .set('cookie', 'portfolio_refresh=refresh-2')
      .set('x-csrf', '1');
    expect(useCases.logout).toHaveBeenCalledWith('refresh-2');
    expect(setCookies(out)).toEqual([
      'portfolio_refresh=; Path=/api/auth; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict',
    ]);
  });
});

describe('identityCookie', (): void => {
  it('uses the __Host- prefix and Path=/ when secure, the plain name on /api/auth otherwise', (): void => {
    expect(identityCookie('portfolio_refresh', true)).toEqual({
      name: '__Host-portfolio_refresh',
      path: '/',
    });
    expect(identityCookie('portfolio_device', false)).toEqual({
      name: 'portfolio_device',
      path: '/api/auth',
    });
  });
});

describe('readCookie', (): void => {
  it('finds the cookie among others and decodes it', (): void => {
    expect(readCookie('a=1; portfolio_refresh=x%2By=; b=2', 'portfolio_refresh')).toBe('x+y=');
  });

  it('returns null when the cookie is absent or malformed', (): void => {
    expect(readCookie(undefined, 'portfolio_refresh')).toBeNull();
    expect(readCookie('a=1', 'portfolio_refresh')).toBeNull();
    expect(readCookie('portfolio_refresh=%E0%A4%A', 'portfolio_refresh')).toBeNull();
  });
});

describe('identityProblemMapper', (): void => {
  it('maps the other identity errors', (): void => {
    expect(identityProblemMapper(new AlreadyBootstrappedError())).toMatchObject({
      status: 409,
      code: 'identity.already-bootstrapped',
    });
    expect(identityProblemMapper(new WeakPasswordError())).toMatchObject({
      status: 422,
      code: 'identity.weak-password',
    });
    expect(identityProblemMapper(new Error('other'))).toBeNull();
  });
});
