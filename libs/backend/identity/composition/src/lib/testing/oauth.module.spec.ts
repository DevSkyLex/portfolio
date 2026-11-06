import type { Server as NodeHttpServer } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { JoseMcpTokenVerifier, type McpPrincipal } from '@vfortin/backend-auth';
import { ObservabilityModule } from '@vfortin/backend-observability';
import {
  DrizzleAdminAccountRepository,
  HttpsClientMetadataFetcher,
  RandomIdGenerator,
  ScryptPasswordHasher,
  generateSigningKey,
  migrateIdentityDatabase,
} from '@vfortin/identity-adapters-out';
import {
  BootstrapAdmin,
  type ClientMetadataFetcher,
  type FetchedClientMetadata,
  MAX_REGISTRATIONS_PER_HOUR,
} from '@vfortin/identity-application';
import type { JSONWebKeySet } from 'jose';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { IdentityModule } from '@internal/identity-composition/lib/identity.module';

const MIGRATIONS: string = fileURLToPath(
  new URL('../../../../../../../apps/identity-service/migrations', import.meta.url),
);
const ISSUER = 'https://exemple.fr/api/auth' as const;
const RESOURCE = 'https://exemple.fr/api/content/mcp' as const;
const ADMIN: { email: string; password: string } = {
  email: 'moi@exemple.fr',
  password: 'a-strong-password',
};
const CLIENT_ID = 'https://client.exemple.org/oauth/client.json' as const;
const LOGO = 'https://client.exemple.org/logo.png' as const;
const REDIRECT = 'https://client.exemple.org/callback' as const;
const VERIFIER: string = 'verifier-'.repeat(6);
const CHALLENGE: string = createHash('sha256').update(VERIFIER).digest('base64url');

/**
 * Interface Harness
 * @interface Harness
 *
 * @description
 * Running identity service with its clock.
 */
interface Harness {
  readonly app: INestApplication<NodeHttpServer>;
  readonly clock: { current: Date; now: () => Date };
  readonly keysDir: string;
}

let harness: Harness;

/**
 * Function start
 *
 * @description
 * Starts the identity module on PGlite with a password-only administrator; the metadata document of
 * `CLIENT_ID` is served locally, every other URL goes through the real SSRF-safe fetcher.
 *
 * @returns {Promise<Harness>} Running application.
 */
async function start(): Promise<Harness> {
  const keysDir: string = mkdtempSync(join(tmpdir(), 'identity-oauth-'));
  await generateSigningKey(keysDir, 'k1');
  const clock: { current: Date; now: () => Date } = {
    current: new Date('2026-11-04T10:00:00Z'),
    now: (): Date => new Date(clock.current),
  };
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(clock.current);
  const real: HttpsClientMetadataFetcher = new HttpsClientMetadataFetcher();
  const fetcher: ClientMetadataFetcher = {
    fetchDocument: (url: string): Promise<FetchedClientMetadata> =>
      url === CLIENT_ID
        ? Promise.resolve({
            document: {
              client_id: CLIENT_ID,
              client_name: 'Client exemple',
              client_uri: 'https://client.exemple.org',
              logo_uri: LOGO,
              redirect_uris: [REDIRECT],
              token_endpoint_auth_method: 'none',
            },
            maxAgeSeconds: 300,
          })
        : real.fetchDocument(url),
    fetchLogo: (url: string): Promise<string | null> =>
      url === LOGO ? Promise.resolve('data:image/png;base64,AA==') : real.fetchLogo(url),
  };
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [
      ObservabilityModule.forRoot({ service: 'identity-test', level: 'silent', pretty: false }),
      IdentityModule.register({
        databaseUrl: 'pglite:memory',
        keysDir,
        signingKid: 'k1',
        issuer: ISSUER,
        cookieSecure: false,
        clock,
        clientMetadataFetcher: fetcher,
        prepare: async (database): Promise<void> => {
          await migrateIdentityDatabase(database, MIGRATIONS);
          await new BootstrapAdmin(
            new DrizzleAdminAccountRepository(database.db),
            new ScryptPasswordHasher(),
            new RandomIdGenerator(),
          ).execute(ADMIN.email, ADMIN.password);
        },
      }),
    ],
  }).compile();
  const app: INestApplication<NodeHttpServer> =
    moduleRef.createNestApplication<INestApplication<NodeHttpServer>>();
  app.setGlobalPrefix('api', { exclude: ['health/live', 'health/ready'] });
  await app.init();
  return { app, clock, keysDir };
}

/**
 * Function server
 *
 * @description
 * Supertest agent of the running service.
 *
 * @returns {ReturnType<typeof request>} Agent.
 */
const server = (): ReturnType<typeof request> => request(harness.app.getHttpServer());

/**
 * Function advance
 *
 * @description
 * Moves the injected clock and the system time together.
 *
 * @param {number} ms - Milliseconds.
 */
function advance(ms: number): void {
  harness.clock.current = new Date(harness.clock.current.getTime() + ms);
  vi.setSystemTime(harness.clock.current);
}

/**
 * Function signIn
 *
 * @description
 * Opens an administrator session and returns its bearer header.
 *
 * @returns {Promise<string>} `Bearer <access token>`.
 */
async function signIn(): Promise<string> {
  const login: request.Response = await server()
    .post('/api/auth/login')
    .send({ ...ADMIN, remember: false });
  expect(login.body.status).toBe('authenticated');
  return `Bearer ${login.body.accessToken as string}`;
}

/**
 * Function parameters
 *
 * @description
 * Valid authorization query with overrides.
 *
 * @param {Record<string, unknown>} overrides - Replaced fields (`undefined` removes one).
 *
 * @returns {Record<string, unknown>} Query.
 */
function parameters(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT,
    scope: 'content:read content:write',
    state: 'st-1',
    code_challenge: CHALLENGE,
    code_challenge_method: 'S256',
    resource: RESOURCE,
    ...overrides,
  };
}

/**
 * Function review
 *
 * @description
 * Forwards an authorization query as the consent page does.
 *
 * @param {string} bearer - Administrator authorization header.
 * @param {Record<string, unknown>} query - Authorization query.
 *
 * @returns {request.Test} Pending request.
 */
function review(bearer: string, query: Record<string, unknown> = parameters()): request.Test {
  return server()
    .post('/api/auth/admin/oauth/authorizations')
    .set('authorization', bearer)
    .send(query);
}

/**
 * Function authorize
 *
 * @description
 * Reviews and approves, returning the redirect query.
 *
 * @param {string} bearer - Administrator authorization header.
 * @param {Record<string, unknown>} overrides - Query overrides.
 *
 * @returns {Promise<URLSearchParams>} Redirect parameters.
 */
async function authorize(
  bearer: string,
  overrides: Record<string, unknown> = {},
): Promise<URLSearchParams> {
  const consent: request.Response = await review(bearer, parameters(overrides));
  expect(consent.body.status).toBe('consent');
  const approved: request.Response = await server()
    .post(`/api/auth/admin/oauth/authorizations/${consent.body.requestId as string}/approve`)
    .set('authorization', bearer);
  expect(approved.status).toBe(200);
  return new URL(approved.body.redirectTo as string).searchParams;
}

/**
 * Function token
 *
 * @description
 * Calls the token endpoint with a form body.
 *
 * @param {Record<string, string>} form - Form fields.
 *
 * @returns {request.Test} Pending request.
 */
function token(form: Record<string, string>): request.Test {
  return server().post('/api/auth/oauth/token').type('form').send(form);
}

/**
 * Function exchange
 *
 * @description
 * Redeems a code with the right verifier, client, redirect URI and resource.
 *
 * @param {string} code - Authorization code.
 * @param {Record<string, string>} overrides - Field overrides.
 *
 * @returns {request.Test} Pending request.
 */
function exchange(code: string, overrides: Record<string, string> = {}): request.Test {
  return token({
    grant_type: 'authorization_code',
    code,
    code_verifier: VERIFIER,
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT,
    resource: RESOURCE,
    ...overrides,
  });
}

/**
 * Function refresh
 *
 * @description
 * Rotates a refresh token.
 *
 * @param {string} refreshToken - Refresh token.
 * @param {Record<string, string>} overrides - Field overrides.
 *
 * @returns {request.Test} Pending request.
 */
function refresh(refreshToken: string, overrides: Record<string, string> = {}): request.Test {
  return token({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
    ...overrides,
  });
}

/**
 * Function verifier
 *
 * @description
 * MCP resource-side verifier built from the published JWKS, as content-service will.
 *
 * @returns {Promise<JoseMcpTokenVerifier>} Verifier.
 */
async function verifier(): Promise<JoseMcpTokenVerifier> {
  const jwks: request.Response = await server().get('/api/auth/jwks.json');
  return new JoseMcpTokenVerifier({
    issuer: ISSUER,
    resource: RESOURCE,
    jwks: jwks.body as JSONWebKeySet,
  });
}

describe('IdentityModule OAuth authorization server', (): void => {
  beforeEach(async (): Promise<void> => {
    harness = await start();
  });

  afterEach(async (): Promise<void> => {
    await harness.app.close();
    vi.useRealTimers();
    rmSync(harness.keysDir, { recursive: true, force: true });
  });

  it('publishes the RFC 8414 metadata with CORS', async (): Promise<void> => {
    const response: request.Response = await server().get(
      '/api/auth/.well-known/oauth-authorization-server',
    );
    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(response.body).toEqual({
      issuer: ISSUER,
      authorization_endpoint: 'https://exemple.fr/admin/oauth/authorize',
      token_endpoint: 'https://exemple.fr/api/auth/oauth/token',
      registration_endpoint: 'https://exemple.fr/api/auth/oauth/register',
      revocation_endpoint: 'https://exemple.fr/api/auth/oauth/revoke',
      jwks_uri: 'https://exemple.fr/api/auth/jwks.json',
      scopes_supported: [
        'content:read',
        'content:write',
        'content:publish',
        'content:delete',
        'offline_access',
      ],
      response_types_supported: ['code'],
      response_modes_supported: ['query'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_methods_supported: ['none'],
      revocation_endpoint_auth_methods_supported: ['none'],
      code_challenge_methods_supported: ['S256'],
      authorization_response_iss_parameter_supported: true,
      client_id_metadata_document_supported: true,
    });
    for (const path of [
      'oauth/token',
      'oauth/register',
      '.well-known/oauth-authorization-server',
    ]) {
      const preflight: request.Response = await server()
        .options(`/api/auth/${path}`)
        .set('origin', 'https://app.exemple.org')
        .set('access-control-request-method', 'POST');
      expect(preflight.status).toBe(204);
      expect(preflight.headers).toMatchObject({
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'Authorization, Content-Type, MCP-Protocol-Version',
      });
    }
  });

  it('runs the whole flow: consent, code with iss, audience-bound tokens, rotation, revocation', async (): Promise<void> => {
    const bearer: string = await signIn();
    const consent: request.Response = await review(bearer);
    expect(consent.status).toBe(200);
    expect(consent.headers['cache-control']).toBe('no-store');
    expect(consent.body).toEqual({
      status: 'consent',
      requestId: expect.any(String) as unknown as string,
      expiresIn: 600,
      client: {
        clientId: CLIENT_ID,
        name: 'Client exemple',
        clientUri: 'https://client.exemple.org',
        logo: 'data:image/png;base64,AA==',
        registration: 'metadata-document',
      },
      redirectUri: REDIRECT,
      redirectHost: 'client.exemple.org',
      loopbackRedirect: false,
      scopes: ['content:read', 'content:write'],
      grantedScopes: [],
      resource: RESOURCE,
    });
    const approved: request.Response = await server()
      .post(`/api/auth/admin/oauth/authorizations/${consent.body.requestId as string}/approve`)
      .set('authorization', bearer);
    const redirect: URL = new URL(approved.body.redirectTo as string);
    expect(`${redirect.origin}${redirect.pathname}`).toBe(REDIRECT);
    expect(redirect.searchParams.get('state')).toBe('st-1');
    expect(redirect.searchParams.get('iss')).toBe(ISSUER);
    const code: string = redirect.searchParams.get('code') ?? '';
    expect(code.length).toBeGreaterThanOrEqual(43);

    const issued: request.Response = await exchange(code);
    expect(issued.status).toBe(200);
    expect(issued.headers['cache-control']).toBe('no-store');
    expect(issued.headers['access-control-allow-origin']).toBe('*');
    expect(issued.body).toEqual({
      access_token: expect.any(String) as unknown as string,
      token_type: 'Bearer',
      expires_in: 300,
      refresh_token: expect.any(String) as unknown as string,
      scope: 'content:read content:write',
    });
    const principal: McpPrincipal = await (
      await verifier()
    ).verify(issued.body.access_token as string);
    expect(principal).toMatchObject({
      clientId: CLIENT_ID,
      scopes: ['content:read', 'content:write'],
    });

    advance(60_000);
    const rotated: request.Response = await refresh(issued.body.refresh_token as string, {
      scope: 'content:read',
      resource: RESOURCE,
    });
    expect(rotated.status).toBe(200);
    expect(rotated.body.scope).toBe('content:read');
    expect(rotated.body.refresh_token).not.toBe(issued.body.refresh_token);

    const listed: request.Response = await server()
      .get('/api/auth/admin/oauth/applications')
      .set('authorization', bearer);
    expect(listed.body).toEqual({
      items: [
        {
          id: expect.any(String) as unknown as string,
          clientId: CLIENT_ID,
          name: 'Client exemple',
          logo: 'data:image/png;base64,AA==',
          host: 'client.exemple.org',
          registration: 'metadata-document',
          scopes: ['content:read', 'content:write'],
          createdAt: '2026-11-04T10:00:00.000Z',
          lastUsedAt: '2026-11-04T10:01:00.000Z',
        },
      ],
    });
    const revoked: request.Response = await server()
      .delete(`/api/auth/admin/oauth/applications/${listed.body.items[0].id as string}`)
      .set('authorization', bearer);
    expect(revoked.status).toBe(204);
    expect((await refresh(rotated.body.refresh_token as string)).body.error).toBe('invalid_grant');
    const again: request.Response = await server()
      .delete(`/api/auth/admin/oauth/applications/${listed.body.items[0].id as string}`)
      .set('authorization', bearer);
    expect(again.status).toBe(404);
    expect(again.body.code).toBe('identity.oauth-application-not-found');
    expect(
      (await server().get('/api/auth/admin/oauth/applications').set('authorization', bearer)).body,
    ).toEqual({ items: [] });
  });

  it('refuses a PKCE mismatch, another redirect URI, another client and an expired code', async (): Promise<void> => {
    const bearer: string = await signIn();
    const code: string = (await authorize(bearer)).get('code') ?? '';
    for (const overrides of [
      { code_verifier: 'another-verifier-of-sufficient-length-to-pass-1' },
      { redirect_uri: 'https://client.exemple.org/other' },
      { client_id: 'https://other.exemple.org/client.json' },
      { code: 'not-a-code' },
    ]) {
      const refused: request.Response = await exchange(code, overrides);
      expect(refused.status).toBe(400);
      expect(refused.headers['content-type']).toMatch(/^application\/json/);
      expect(refused.body).toEqual({
        error: 'invalid_grant',
        error_description: 'The authorization code is invalid or expired.',
      });
    }
    advance(61_000);
    expect((await exchange(code)).body.error).toBe('invalid_grant');
  });

  it('refuses a reused code and revokes the tokens it gave', async (): Promise<void> => {
    const bearer: string = await signIn();
    const code: string = (await authorize(bearer)).get('code') ?? '';
    const first: request.Response = await exchange(code);
    expect(first.status).toBe(200);
    expect((await exchange(code)).body.error).toBe('invalid_grant');
    expect((await refresh(first.body.refresh_token as string)).body.error).toBe('invalid_grant');
  });

  it('revokes the family when a refresh token is reused', async (): Promise<void> => {
    const bearer: string = await signIn();
    const first: request.Response = await exchange((await authorize(bearer)).get('code') ?? '');
    const second: request.Response = await refresh(first.body.refresh_token as string);
    expect(second.status).toBe(200);
    const replay: request.Response = await refresh(first.body.refresh_token as string);
    expect(replay.body.error).toBe('invalid_grant');
    expect((await refresh(second.body.refresh_token as string)).body.error).toBe('invalid_grant');
  });

  it('refuses another resource and a scope escalation', async (): Promise<void> => {
    const bearer: string = await signIn();
    const wrongResource: request.Response = await review(
      bearer,
      parameters({ resource: 'https://exemple.fr/api/contact' }),
    );
    expect(wrongResource.body.status).toBe('redirect');
    expect(new URL(wrongResource.body.redirectTo as string).searchParams.get('error')).toBe(
      'invalid_target',
    );
    const contact: request.Response = await review(bearer, parameters({ scope: 'contact:read' }));
    const contactRedirect: URLSearchParams = new URL(contact.body.redirectTo as string)
      .searchParams;
    expect(contactRedirect.get('error')).toBe('invalid_scope');
    expect(contactRedirect.get('state')).toBe('st-1');
    expect(contactRedirect.get('iss')).toBe(ISSUER);

    const code: string = (await authorize(bearer, { scope: 'content:read' })).get('code') ?? '';
    expect((await exchange(code, { resource: 'https://exemple.fr/api/contact' })).body.error).toBe(
      'invalid_target',
    );
    const issued: request.Response = await exchange(code);
    expect(issued.body.scope).toBe('content:read');
    const escalated: request.Response = await refresh(issued.body.refresh_token as string, {
      scope: 'content:read content:delete',
    });
    expect(escalated.status).toBe(400);
    expect(escalated.body.error).toBe('invalid_scope');
    expect(
      (await refresh(issued.body.refresh_token as string, { resource: 'https://exemple.fr/x' }))
        .body.error,
    ).toBe('invalid_target');
  });

  it('never redirects an unknown client or an unregistered redirect URI', async (): Promise<void> => {
    const bearer: string = await signIn();
    const redirect: request.Response = await review(
      bearer,
      parameters({ redirect_uri: 'https://evil.exemple/cb' }),
    );
    expect(redirect.status).toBe(400);
    expect(redirect.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(redirect.body.code).toBe('identity.oauth-invalid-redirect-uri');
    const unknown: request.Response = await review(
      bearer,
      parameters({ client_id: 'dyn-unknown' }),
    );
    expect(unknown.body.code).toBe('identity.oauth-invalid-client');
    const repeated: request.Response = await review(
      bearer,
      parameters({ client_id: [CLIENT_ID, CLIENT_ID] }),
    );
    expect(repeated.body.code).toBe('identity.oauth-invalid-request');
  });

  it.each([
    ['a loopback literal', 'https://127.0.0.1/client.json'],
    ['a name resolving to loopback', 'https://localhost/client.json'],
    ['an IPv6 loopback literal', 'https://[::1]/client.json'],
    ['the cloud metadata address', 'https://169.254.169.254/latest/meta-data/client'],
    ['a private network literal', 'https://10.0.0.1/client.json'],
    ['a non-standard port', 'https://client.exemple.org:8443/client.json'],
    ['credentials in the URL', 'https://user:secret@client.exemple.org/client.json'],
  ])(
    'refuses a metadata document at %s (SSRF)',
    async (_label: string, clientId: string): Promise<void> => {
      const bearer: string = await signIn();
      const refused: request.Response = await review(bearer, parameters({ client_id: clientId }));
      expect(refused.status).toBe(400);
      expect(refused.body.code).toBe('identity.oauth-invalid-client');
    },
  );

  it('binds the decision to the reviewing session, once', async (): Promise<void> => {
    const bearer: string = await signIn();
    const other: string = await signIn();
    const consent: request.Response = await review(bearer);
    const id: string = consent.body.requestId as string;
    const foreign: request.Response = await server()
      .post(`/api/auth/admin/oauth/authorizations/${id}/approve`)
      .set('authorization', other);
    expect(foreign.status).toBe(404);
    expect(foreign.body.code).toBe('identity.oauth-request-expired');
    const denied: request.Response = await server()
      .post(`/api/auth/admin/oauth/authorizations/${id}/deny`)
      .set('authorization', bearer);
    const query: URLSearchParams = new URL(denied.body.redirectTo as string).searchParams;
    expect([query.get('error'), query.get('state'), query.get('iss')]).toEqual([
      'access_denied',
      'st-1',
      ISSUER,
    ]);
    expect(
      (
        await server()
          .post(`/api/auth/admin/oauth/authorizations/${id}/approve`)
          .set('authorization', bearer)
      ).status,
    ).toBe(404);
    expect((await review('Bearer nope')).status).toBe(401);
  });

  it('keeps MCP tokens and administrator tokens apart', async (): Promise<void> => {
    const bearer: string = await signIn();
    const issued: request.Response = await exchange((await authorize(bearer)).get('code') ?? '');
    const mcp: string = `Bearer ${issued.body.access_token as string}`;
    expect((await server().get('/api/auth/totp').set('authorization', mcp)).status).toBe(401);
    expect(
      (await server().get('/api/auth/admin/oauth/applications').set('authorization', mcp)).status,
    ).toBe(401);
    await expect((await verifier()).verify(bearer.slice('Bearer '.length))).rejects.toThrow();
  });

  it('answers protocol errors in the OAuth format', async (): Promise<void> => {
    expect((await token({ grant_type: 'password' })).body.error).toBe('unsupported_grant_type');
    expect((await token({})).body).toEqual({
      error: 'invalid_request',
      error_description: 'The grant_type parameter is required.',
    });
    expect((await token({ grant_type: 'authorization_code', code: 'x' })).body.error).toBe(
      'invalid_request',
    );
    const repeated: request.Response = await server()
      .post('/api/auth/oauth/token')
      .type('form')
      .send('grant_type=refresh_token&refresh_token=a&client_id=a&client_id=b');
    expect(repeated.body).toEqual({
      error: 'invalid_request',
      error_description: 'The client_id parameter must not be repeated.',
    });
    const malformed: request.Response = await server()
      .post('/api/auth/oauth/token')
      .send({ grant_type: { nested: true } });
    expect(malformed.body.error).toBe('invalid_request');
  });

  it('revokes a refresh token (RFC 7009) and ignores unknown tokens', async (): Promise<void> => {
    const bearer: string = await signIn();
    const issued: request.Response = await exchange((await authorize(bearer)).get('code') ?? '');
    const revoke = (form: Record<string, string>): request.Test =>
      server().post('/api/auth/oauth/revoke').type('form').send(form);
    expect((await revoke({ token: 'unknown', client_id: CLIENT_ID })).status).toBe(200);
    expect((await revoke({ token: issued.body.access_token as string })).status).toBe(200);
    expect((await revoke({})).body.error).toBe('invalid_request');
    expect(
      (await revoke({ token: issued.body.refresh_token as string, client_id: 'dyn-other' })).body
        .error,
    ).toBe('invalid_request');
    const done: request.Response = await revoke({
      token: issued.body.refresh_token as string,
      token_type_hint: 'refresh_token',
      client_id: CLIENT_ID,
    });
    expect(done.status).toBe(200);
    expect(done.headers['access-control-allow-origin']).toBe('*');
    expect((await refresh(issued.body.refresh_token as string)).body.error).toBe('invalid_grant');
  });

  it('registers public clients dynamically within limits and authorizes them on loopback', async (): Promise<void> => {
    const registered: request.Response = await server()
      .post('/api/auth/oauth/register')
      .send({ client_name: 'Outil local', redirect_uris: ['http://127.0.0.1/callback'] });
    expect(registered.status).toBe(201);
    expect(registered.body).toEqual({
      client_id: expect.any(String) as unknown as string,
      client_id_issued_at: Math.floor(harness.clock.current.getTime() / 1000),
      client_name: 'Outil local',
      redirect_uris: ['http://127.0.0.1/callback'],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    });
    const bearer: string = await signIn();
    const consent: request.Response = await review(
      bearer,
      parameters({
        client_id: registered.body.client_id,
        redirect_uri: 'http://127.0.0.1:49152/callback',
      }),
    );
    expect(consent.body).toMatchObject({
      client: { registration: 'dynamic', name: 'Outil local' },
      redirectHost: '127.0.0.1:49152',
      loopbackRedirect: true,
    });

    const invalid: [object, string][] = [
      [{ redirect_uris: ['http://client.exemple.org/cb'] }, 'invalid_redirect_uri'],
      [{ redirect_uris: ['cursor://callback'] }, 'invalid_redirect_uri'],
      [
        { redirect_uris: ['https://a.fr/cb'], token_endpoint_auth_method: 'client_secret_basic' },
        'invalid_client_metadata',
      ],
      [
        { redirect_uris: ['https://a.fr/cb'], grant_types: ['client_credentials'] },
        'invalid_client_metadata',
      ],
    ];
    for (const [body, error] of invalid) {
      const refused: request.Response = await server().post('/api/auth/oauth/register').send(body);
      expect(refused.status).toBe(400);
      expect(refused.body.error).toBe(error);
    }
    for (let index: number = 1; index < MAX_REGISTRATIONS_PER_HOUR; index++) {
      expect(
        (
          await server()
            .post('/api/auth/oauth/register')
            .send({ redirect_uris: ['https://a.fr/cb'] })
        ).status,
      ).toBe(201);
    }
    const capped: request.Response = await server()
      .post('/api/auth/oauth/register')
      .send({ redirect_uris: ['https://a.fr/cb'] });
    expect(capped.status).toBe(429);
    expect(capped.body.error).toBe('temporarily_unavailable');
  });
});
