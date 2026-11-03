import type { Server as NodeHttpServer } from 'node:http';
import { Controller, Get, type INestApplication, Req } from '@nestjs/common';
import type { AdminClaims } from '@vfortin/identity-contracts';
import { Test, type TestingModule } from '@nestjs/testing';
import { type JWK, SignJWT, exportJWK, generateKeyPair } from 'jose';
import request from 'supertest';
import {
  AdminAuthModule,
  AdminOnly,
  JoseAdminTokenVerifier,
} from '@internal/backend-auth/lib/admin-auth/admin-auth';

/**
 * Constant ISSUER
 *
 * @description
 * Test issuer used to sign tokens and configure the verifier under test.
 */
const ISSUER = 'https://exemple.fr/api/auth' as const;

/**
 * Class DemoController
 * @class DemoController
 *
 * @description
 * Test controller exposing an unguarded endpoint and an administrator-only endpoint.
 */
@Controller('demo')
class DemoController {
  // #region Methods
  /**
   * Method open
   * @method open
   *
   * @description
   * Returns a fixed response used to confirm that public routes remain reachable.
   *
   * @returns {string} Public route response body.
   */
  @Get('public')
  public open(): string {
    return 'ok';
  }

  /**
   * Method admin
   * @method admin
   *
   * @description
   * Returns the claims the administrator guard attached to the request.
   *
   * @param {{ admin?: AdminClaims }} request - Request decorated by the guard.
   *
   * @returns {AdminClaims | undefined} Protected route response body.
   */
  @Get('admin')
  @AdminOnly()
  public admin(@Req() request: { admin?: AdminClaims }): AdminClaims | undefined {
    return request.admin;
  }
  // #endregion
}

/**
 * Interface SignOptions
 * @interface SignOptions
 *
 * @description
 * Overrides of the test token: a value replaces the default, `null` removes the claim or header.
 */
interface SignOptions {
  // #region Properties
  /**
   * Property audience
   * @readonly
   *
   * @description
   * Audience claim; defaults to `portfolio-admin`.
   *
   * @type {string | undefined}
   */
  readonly audience?: string;

  /**
   * Property issuer
   * @readonly
   *
   * @description
   * Issuer claim; defaults to the configured issuer.
   *
   * @type {string | undefined}
   */
  readonly issuer?: string;

  /**
   * Property exp
   * @readonly
   *
   * @description
   * Expiry in seconds since the epoch; defaults to five minutes after `iat`.
   *
   * @type {number | undefined}
   */
  readonly exp?: number;

  /**
   * Property iat
   * @readonly
   *
   * @description
   * Issued-at in seconds since the epoch, or `null` to omit it; defaults to now.
   *
   * @type {number | null | undefined}
   */
  readonly iat?: number | null;

  /**
   * Property nbf
   * @readonly
   *
   * @description
   * Not-before in seconds since the epoch, or `null` to omit it; defaults to `iat`.
   *
   * @type {number | null | undefined}
   */
  readonly nbf?: number | null;

  /**
   * Property sub
   * @readonly
   *
   * @description
   * `null` omits the subject claim.
   *
   * @type {null | undefined}
   */
  readonly sub?: null;

  /**
   * Property jti
   * @readonly
   *
   * @description
   * `null` omits the token identifier claim.
   *
   * @type {null | undefined}
   */
  readonly jti?: null;

  /**
   * Property typ
   * @readonly
   *
   * @description
   * `typ` header, or `null` to omit it; defaults to `at+jwt`.
   *
   * @type {string | null | undefined}
   */
  readonly typ?: string | null;
  // #endregion
}

describe('AdminAuthModule', (): void => {
  /**
   * Variable app
   *
   * @description
   * Nest application hosting the guarded and public routes for each HTTP assertion.
   *
   * @type {INestApplication<NodeHttpServer>}
   */
  let app: INestApplication<NodeHttpServer>;
  /**
   * Variable sign
   *
   * @description
   * Test token signer configurable for claims and standard JWT fields to exercise verifier rejection cases.
   *
   * @type {(claims?: Record<string, unknown>, options?: SignOptions) => Promise<string>}
   */
  let sign: (claims?: Record<string, unknown>, options?: SignOptions) => Promise<string>;
  /**
   * Variable otherKeySign
   *
   * @description
   * Produces a correctly shaped administrator token signed by a key absent from the configured JWKS.
   *
   * @type {() => Promise<string>}
   */
  let otherKeySign: () => Promise<string>;

  beforeAll(async (): Promise<void> => {
    const { publicKey, privateKey } = await generateKeyPair('EdDSA', { crv: 'Ed25519' });
    const other: Awaited<ReturnType<typeof generateKeyPair>> = await generateKeyPair('EdDSA', {
      crv: 'Ed25519',
    });
    const jwk: JWK = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'EdDSA' };
    const now: number = Math.floor(Date.now() / 1000);
    sign = (
      claims: Record<string, unknown> | undefined = { role: 'admin', sid: 'f1' },
      options: SignOptions | undefined = {},
    ): Promise<string> => {
      const iat: number = options.iat ?? now;
      const jwt: SignJWT = new SignJWT(claims)
        .setProtectedHeader({
          alg: 'EdDSA',
          kid: 'k1',
          ...(options.typ === null ? {} : { typ: options.typ ?? 'at+jwt' }),
        })
        .setIssuer(options.issuer ?? ISSUER)
        .setAudience(options.audience ?? 'portfolio-admin')
        .setExpirationTime(options.exp ?? iat + 300);
      if (options.sub !== null) jwt.setSubject('a1');
      if (options.iat !== null) jwt.setIssuedAt(iat);
      if (options.nbf !== null) jwt.setNotBefore(options.nbf ?? iat);
      if (options.jti !== null) jwt.setJti('j1');
      return jwt.sign(privateKey);
    };
    otherKeySign = (): Promise<string> =>
      new SignJWT({ role: 'admin', sid: 'f1' })
        .setProtectedHeader({ alg: 'EdDSA', kid: 'k1', typ: 'at+jwt' })
        .setSubject('a1')
        .setIssuer(ISSUER)
        .setAudience('portfolio-admin')
        .setIssuedAt(now)
        .setNotBefore(now)
        .setJti('j1')
        .setExpirationTime(now + 300)
        .sign(other.privateKey);

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AdminAuthModule.forRoot({ issuer: ISSUER, jwks: { keys: [jwk] } })],
      controllers: [DemoController],
    }).compile();
    app = moduleRef.createNestApplication<INestApplication<NodeHttpServer>>();
    await app.init();
  });

  afterAll(async (): Promise<void> => {
    await app.close();
  });

  /**
   * Function get
   *
   * @description
   * Issues a request to a demo route and adds an authorization header only when a token is supplied.
   *
   * @param {string} path - Route path requested from the test application.
   * @param {string} token - Optional encoded token sent with the request.
   * @param {string} scheme - Authorization scheme, defaulting to `Bearer`.
   * @returns {ReturnType<typeof request>} Supertest request for the selected endpoint.
   */
  const get = (path: string, token?: string, scheme: string = 'Bearer'): request.Test => {
    const call: request.Test = request(app.getHttpServer()).get(path);
    return token ? call.set('authorization', `${scheme} ${token}`) : call;
  };

  it('leaves public routes open', async (): Promise<void> => {
    expect((await get('/demo/public')).status).toBe(200);
  });

  it('accepts a valid admin token, whatever the case of the scheme, and exposes its claims', async (): Promise<void> => {
    const response: request.Response = await get('/demo/admin', await sign());
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ sub: 'a1', role: 'admin', sid: 'f1' });
    expect((await get('/demo/admin', await sign(), 'bearer')).status).toBe(200);
  });

  it('tolerates a small clock skew between the services', async (): Promise<void> => {
    const skewed: number = Math.floor(Date.now() / 1000) + 20;
    expect((await get('/demo/admin', await sign(undefined, { iat: skewed }))).status).toBe(200);
  });

  it.each([
    ['no token', async (): Promise<undefined> => undefined],
    ['another audience', (): Promise<string> => sign(undefined, { audience: 'other' })],
    [
      'another issuer',
      (): Promise<string> => sign(undefined, { issuer: 'https://pirate.example' }),
    ],
    ['an expired token', (): Promise<string> => sign(undefined, { exp: 1 })],
    ['a non-admin role', (): Promise<string> => sign({ role: 'user', sid: 'f1' })],
    ['a token without sid', (): Promise<string> => sign({ role: 'admin' })],
    ['an unknown key', (): Promise<string> => otherKeySign()],
    ['a plain JWT type', (): Promise<string> => sign(undefined, { typ: 'JWT' })],
    ['a token without typ', (): Promise<string> => sign(undefined, { typ: null })],
    ['a token without iat', (): Promise<string> => sign(undefined, { iat: null })],
    ['a token without nbf', (): Promise<string> => sign(undefined, { nbf: null })],
    ['a token without jti', (): Promise<string> => sign(undefined, { jti: null })],
    ['a token without sub', (): Promise<string> => sign(undefined, { sub: null })],
    [
      'a token not valid yet',
      (): Promise<string> => sign(undefined, { nbf: Math.floor(Date.now() / 1000) + 120 }),
    ],
    [
      'a token issued too long ago, even with a long expiry',
      (): Promise<string> => {
        const iat: number = Math.floor(Date.now() / 1000) - 7 * 60;
        return sign(undefined, { iat, exp: iat + 3600 });
      },
    ],
    ['another scheme', async (): Promise<string> => `Basic ${await sign()}`],
  ])(
    'refuse %s (401)',
    async (
      _label: string,
      token: (() => Promise<undefined>) | (() => Promise<string>),
    ): Promise<void> => {
      const value: string | undefined = await token();
      const response: request.Response = value?.startsWith('Basic ')
        ? await request(app.getHttpServer()).get('/demo/admin').set('authorization', value)
        : await get('/demo/admin', value);
      expect(response.status).toBe(401);
      expect(response.body.code).toBe('auth.unauthorized');
    },
  );
});

describe('JoseAdminTokenVerifier', (): void => {
  it('requires a JWKS source', (): void => {
    expect((): JoseAdminTokenVerifier => new JoseAdminTokenVerifier({ issuer: ISSUER })).toThrow(
      /jwksUrl or jwks/,
    );
    expect(
      (): JoseAdminTokenVerifier =>
        new JoseAdminTokenVerifier({ issuer: ISSUER, jwksUrl: 'http://identity/jwks.json' }),
    ).not.toThrow();
  });
});
/**
 * Method admin
 * @method admin
 *
 * @description
 * Returns a fixed response after the administrator guard accepts the request token.
 *
 * @returns {string} Protected route response body.
 */
