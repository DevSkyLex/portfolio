import type { Server as NodeHttpServer } from 'node:http';
import type { Mock } from 'vitest';
import { BadRequestException, type INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { AdminAuthModule } from '@vfortin/backend-auth';
import { PROBLEM_MAPPER, ProblemDetailsFilter } from '@vfortin/backend-http';
import {
  ApproveAuthorizationRequest,
  AuthorizationRequestExpiredError,
  ConnectedApplicationNotFoundError,
  DenyAuthorizationRequest,
  ExchangeAuthorizationCode,
  ListConnectedApplications,
  RefreshResourceToken,
  RegisterOAuthClient,
  ReviewAuthorizationRequest,
  RevokeConnectedApplication,
  RevokeOAuthToken,
} from '@vfortin/identity-application';
import { MCP_SCOPES } from '@vfortin/identity-contracts';
import {
  AuthorizationRequest,
  OAUTH_SCOPES,
  OAuthClient,
  OAuthError,
  OAuthGrant,
} from '@vfortin/identity-domain';
import { type JWK, SignJWT, exportJWK, generateKeyPair } from 'jose';
import request from 'supertest';
import { ConnectedApplicationsController } from '@internal/identity-adapters-in/lib/http/controllers/connected-applications/connected-applications.controller';
import {
  OAuthConsentController,
  claimsOf,
} from '@internal/identity-adapters-in/lib/http/controllers/oauth-consent/oauth-consent.controller';
import {
  OAUTH_HTTP_OPTIONS,
  OAuthServerController,
} from '@internal/identity-adapters-in/lib/http/controllers/oauth-server/oauth-server.controller';
import { toOAuthFailure } from '@internal/identity-adapters-in/lib/http/filters/oauth-error/oauth-error.filter';
import { identityProblemMapper } from '@internal/identity-adapters-in/lib/http/mappers/identity-problem/identity-problem.mapper';
import {
  optionalParameter,
  requiredParameter,
  toAuthorizationParameters,
} from '@internal/identity-adapters-in/lib/http/mappers/oauth-parameters/oauth-parameters.mapper';

const ISSUER = 'https://exemple.fr/api/auth' as const;
const NOW: Date = new Date();
const CLIENT: OAuthClient = OAuthClient.register(
  'dyn-1',
  { client_name: 'Outil', redirect_uris: ['http://127.0.0.1/cb'] },
  NOW,
);
const TOKENS: {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  scopes: ['content:read'];
} = {
  accessToken: 'at',
  expiresIn: 300,
  refreshToken: 'rt',
  scopes: ['content:read'],
};

const mocks: Record<string, Mock> = {
  exchange: vi.fn(),
  refresh: vi.fn(),
  revoke: vi.fn(),
  register: vi.fn(),
  review: vi.fn(),
  approve: vi.fn(),
  deny: vi.fn(),
  list: vi.fn(),
  revokeApplication: vi.fn(),
};

describe('OAuth controllers', (): void => {
  let app: INestApplication<NodeHttpServer>;
  let bearer: string;

  beforeAll(async (): Promise<void> => {
    const { privateKey, publicKey } = await generateKeyPair('EdDSA');
    const jwk: JWK = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'EdDSA' };
    const now: number = Math.floor(Date.now() / 1000);
    bearer = `Bearer ${await new SignJWT({ role: 'admin', sid: 'sid-1' })
      .setProtectedHeader({ alg: 'EdDSA', kid: 'k1', typ: 'at+jwt' })
      .setSubject('admin')
      .setIssuer(ISSUER)
      .setAudience('portfolio-admin')
      .setIssuedAt(now)
      .setNotBefore(now)
      .setExpirationTime(now + 300)
      .setJti('j')
      .sign(privateKey)}`;
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AdminAuthModule.forRoot({ issuer: ISSUER, jwks: { keys: [jwk] } })],
      controllers: [OAuthServerController, OAuthConsentController, ConnectedApplicationsController],
      providers: [
        { provide: ExchangeAuthorizationCode, useValue: { execute: mocks['exchange'] } },
        { provide: RefreshResourceToken, useValue: { execute: mocks['refresh'] } },
        { provide: RevokeOAuthToken, useValue: { execute: mocks['revoke'] } },
        { provide: RegisterOAuthClient, useValue: { execute: mocks['register'] } },
        { provide: ReviewAuthorizationRequest, useValue: { execute: mocks['review'] } },
        { provide: ApproveAuthorizationRequest, useValue: { execute: mocks['approve'] } },
        { provide: DenyAuthorizationRequest, useValue: { execute: mocks['deny'] } },
        { provide: ListConnectedApplications, useValue: { execute: mocks['list'] } },
        { provide: RevokeConnectedApplication, useValue: { execute: mocks['revokeApplication'] } },
        { provide: OAUTH_HTTP_OPTIONS, useValue: { issuer: ISSUER } },
        { provide: PROBLEM_MAPPER, useValue: identityProblemMapper },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
    }).compile();
    app = moduleRef.createNestApplication<INestApplication<NodeHttpServer>>();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async (): Promise<void> => {
    await app.close();
  });

  beforeEach((): void => {
    for (const mock of Object.values(mocks)) mock.mockReset();
  });

  const server = (): ReturnType<typeof request> => request(app.getHttpServer());

  it('maps both grants to the use cases and formats the token response', async (): Promise<void> => {
    mocks['exchange']?.mockResolvedValue(TOKENS);
    mocks['refresh']?.mockResolvedValue(TOKENS);
    const exchanged: request.Response = await server()
      .post('/api/auth/oauth/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code: 'c',
        code_verifier: 'v',
        client_id: 'dyn-1',
        redirect_uri: 'http://127.0.0.1/cb',
      });
    expect(exchanged.status).toBe(200);
    expect(exchanged.headers['pragma']).toBe('no-cache');
    expect(exchanged.body).toEqual({
      access_token: 'at',
      token_type: 'Bearer',
      expires_in: 300,
      refresh_token: 'rt',
      scope: 'content:read',
    });
    expect(mocks['exchange']).toHaveBeenCalledWith({
      code: 'c',
      codeVerifier: 'v',
      clientId: 'dyn-1',
      redirectUri: 'http://127.0.0.1/cb',
      resource: null,
    });
    await server().post('/api/auth/oauth/token').type('form').send({
      grant_type: 'refresh_token',
      refresh_token: 'r',
      client_id: 'dyn-1',
      scope: 'content:read',
    });
    expect(mocks['refresh']).toHaveBeenCalledWith({
      refreshToken: 'r',
      clientId: 'dyn-1',
      scope: 'content:read',
      resource: null,
    });
  });

  it('answers OAuth errors, framework errors and crashes in the OAuth format', async (): Promise<void> => {
    mocks['exchange']?.mockRejectedValueOnce(new OAuthError('invalid_grant', 'Nope.'));
    const refused: request.Response = await server()
      .post('/api/auth/oauth/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code: 'c',
        code_verifier: 'v',
        client_id: 'x',
        redirect_uri: 'r',
      });
    expect(refused.status).toBe(400);
    expect(refused.headers['cache-control']).toBe('no-store');
    expect(refused.body).toEqual({ error: 'invalid_grant', error_description: 'Nope.' });
    mocks['register']?.mockRejectedValueOnce(new Error('database down'));
    const crashed: request.Response = await server().post('/api/auth/oauth/register').send({});
    expect(crashed.status).toBe(500);
    expect(crashed.body).toEqual({ error: 'server_error' });
    expect(toOAuthFailure(new BadRequestException('Bad body'))).toEqual({
      status: 400,
      body: { error: 'invalid_request', error_description: 'Bad body' },
    });
    expect(toOAuthFailure(new OAuthError('invalid_client', 'Who?')).status).toBe(401);
    expect(toOAuthFailure(new OAuthError('temporarily_unavailable', 'Later.')).status).toBe(429);
  });

  it('presents a registration with only the fields the client gave', async (): Promise<void> => {
    mocks['register']?.mockResolvedValue(CLIENT);
    const registered: request.Response = await server().post('/api/auth/oauth/register').send({});
    expect(registered.status).toBe(201);
    expect(registered.body).toEqual({
      client_id: 'dyn-1',
      client_id_issued_at: Math.floor(NOW.getTime() / 1000),
      client_name: 'Outil',
      redirect_uris: ['http://127.0.0.1/cb'],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    });
    mocks['register']?.mockResolvedValue(
      OAuthClient.register(
        'dyn-2',
        {
          client_uri: 'https://outil.fr',
          logo_uri: 'https://outil.fr/logo.png',
          redirect_uris: ['https://outil.fr/cb'],
        },
        NOW,
      ),
    );
    const full: request.Response = await server().post('/api/auth/oauth/register').send({});
    expect(full.body).toMatchObject({
      client_uri: 'https://outil.fr',
      logo_uri: 'https://outil.fr/logo.png',
    });
    expect(full.body.client_name).toBeUndefined();
  });

  it('serves the metadata and preflight, and refuses other grants and malformed bodies', async (): Promise<void> => {
    const metadata: request.Response = await server().get(
      '/api/auth/.well-known/oauth-authorization-server',
    );
    expect(metadata.body).toMatchObject({
      issuer: ISSUER,
      authorization_endpoint: 'https://exemple.fr/admin/oauth/authorize',
      code_challenge_methods_supported: ['S256'],
    });
    expect(metadata.headers['cache-control']).toBe('public, max-age=3600');
    const preflight: request.Response = await server().options('/api/auth/oauth/revoke');
    expect([preflight.status, preflight.headers['access-control-max-age']]).toEqual([204, '600']);
    const other: request.Response = await server()
      .post('/api/auth/oauth/token')
      .type('form')
      .send({ grant_type: 'client_credentials' });
    expect(other.body.error).toBe('unsupported_grant_type');
    const malformed: request.Response = await server()
      .post('/api/auth/oauth/revoke')
      .send({ token: 42 });
    expect(malformed.body).toEqual({
      error: 'invalid_request',
      error_description: 'The request parameters are malformed.',
    });
  });

  it('revokes with the presented token and client', async (): Promise<void> => {
    mocks['revoke']?.mockResolvedValue(undefined);
    const revoked: request.Response = await server()
      .post('/api/auth/oauth/revoke')
      .type('form')
      .send({ token: 't' });
    expect(revoked.status).toBe(200);
    expect(mocks['revoke']).toHaveBeenCalledWith({ token: 't', clientId: null });
  });

  it('presents a consent and an error redirect, and maps non-redirectable refusals', async (): Promise<void> => {
    const pending: AuthorizationRequest = AuthorizationRequest.open(
      {
        id: 'r1',
        accountId: 'admin',
        sessionId: 'sid-1',
        clientId: 'dyn-1',
        redirectUri: 'http://127.0.0.1:5000/cb',
        scopes: ['content:read'],
        resource: 'https://exemple.fr/api/content/mcp',
        state: null,
        codeChallenge: 'c'.repeat(43),
      },
      NOW,
    );
    mocks['review']?.mockResolvedValueOnce({
      kind: 'consent',
      request: pending,
      client: CLIENT,
      grantedScopes: ['content:read'],
    });
    const consent: request.Response = await server()
      .post('/api/auth/admin/oauth/authorizations')
      .set('authorization', bearer)
      .send({ client_id: 'dyn-1', scope: ['a', 'b'] });
    expect(consent.body).toMatchObject({
      status: 'consent',
      requestId: 'r1',
      expiresIn: 600,
      client: { clientId: 'dyn-1', registration: 'dynamic', logo: null },
      redirectHost: '127.0.0.1:5000',
      loopbackRedirect: true,
      grantedScopes: ['content:read'],
    });
    expect(mocks['review']).toHaveBeenCalledWith({
      accountId: 'admin',
      sessionId: 'sid-1',
      parameters: expect.objectContaining({
        clientId: 'dyn-1',
        scope: null,
        repeated: ['scope'],
      }) as unknown,
    });
    mocks['review']?.mockResolvedValueOnce({
      kind: 'redirect',
      redirectTo: 'https://c/cb?error=x',
    });
    expect(
      (
        await server()
          .post('/api/auth/admin/oauth/authorizations')
          .set('authorization', bearer)
          .send({})
      ).body,
    ).toEqual({ status: 'redirect', redirectTo: 'https://c/cb?error=x' });
    for (const [error, code] of [
      ['invalid_client', 'identity.oauth-invalid-client'],
      ['invalid_redirect_uri', 'identity.oauth-invalid-redirect-uri'],
      ['invalid_request', 'identity.oauth-invalid-request'],
    ] as const) {
      mocks['review']?.mockRejectedValueOnce(new OAuthError(error, 'Refused.'));
      const refused: request.Response = await server()
        .post('/api/auth/admin/oauth/authorizations')
        .set('authorization', bearer)
        .send({});
      expect([refused.status, refused.body.code]).toEqual([400, code]);
    }
    mocks['review']?.mockRejectedValueOnce(new Error('boom'));
    expect(
      (
        await server()
          .post('/api/auth/admin/oauth/authorizations')
          .set('authorization', bearer)
          .send({})
      ).status,
    ).toBe(500);
  });

  it('decides with the session of the bearer token', async (): Promise<void> => {
    mocks['approve']?.mockResolvedValue('https://c/cb?code=x');
    mocks['deny']?.mockRejectedValue(new AuthorizationRequestExpiredError());
    const approved: request.Response = await server()
      .post('/api/auth/admin/oauth/authorizations/r1/approve')
      .set('authorization', bearer);
    expect(approved.body).toEqual({ status: 'redirect', redirectTo: 'https://c/cb?code=x' });
    expect(mocks['approve']).toHaveBeenCalledWith({
      requestId: 'r1',
      accountId: 'admin',
      sessionId: 'sid-1',
    });
    const denied: request.Response = await server()
      .post('/api/auth/admin/oauth/authorizations/r1/deny')
      .set('authorization', bearer);
    expect([denied.status, denied.body.code]).toEqual([404, 'identity.oauth-request-expired']);
  });

  it('lists and revokes connected applications', async (): Promise<void> => {
    mocks['list']?.mockResolvedValue([
      {
        grant: OAuthGrant.rehydrate({
          ...OAuthGrant.create(
            { id: 'g1', accountId: 'admin', clientId: 'dyn-1', scopes: ['content:read'] },
            NOW,
          ).snapshot(),
          lastUsedAt: NOW,
        }),
        client: CLIENT,
      },
    ]);
    const listed: request.Response = await server()
      .get('/api/auth/admin/oauth/applications')
      .set('authorization', bearer);
    expect(listed.body.items[0]).toEqual({
      id: 'g1',
      clientId: 'dyn-1',
      name: 'Outil',
      logo: null,
      host: '127.0.0.1',
      registration: 'dynamic',
      scopes: ['content:read'],
      createdAt: NOW.toISOString(),
      lastUsedAt: NOW.toISOString(),
    });
    mocks['revokeApplication']?.mockRejectedValueOnce(new ConnectedApplicationNotFoundError());
    const missing: request.Response = await server()
      .delete('/api/auth/admin/oauth/applications/g9')
      .set('authorization', bearer);
    expect([missing.status, missing.body.code]).toEqual([
      404,
      'identity.oauth-application-not-found',
    ]);
    expect((await server().get('/api/auth/admin/oauth/applications')).status).toBe(401);
  });
});

describe('OAUTH_SCOPES', (): void => {
  it('mirrors the contract scopes, in the same order', (): void => {
    expect([...OAUTH_SCOPES]).toEqual([...MCP_SCOPES]);
  });
});

describe('OAuth parameter mapping', (): void => {
  it('reads single parameters and refuses repeated or missing ones', (): void => {
    expect(optionalParameter(undefined, 'scope')).toBeNull();
    expect(optionalParameter('', 'scope')).toBeNull();
    expect(optionalParameter('a', 'scope')).toBe('a');
    expect(() => optionalParameter(['a', 'b'], 'scope')).toThrow(OAuthError);
    expect(() => requiredParameter(undefined, 'code')).toThrow('The code parameter is required.');
    expect(
      toAuthorizationParameters({ client_id: 'c', redirect_uri: ['a', 'b'], state: '' }),
    ).toMatchObject({ clientId: 'c', redirectUri: null, state: null, repeated: ['redirect_uri'] });
    expect(() => claimsOf({} as Parameters<typeof claimsOf>[0])).toThrow();
  });
});
