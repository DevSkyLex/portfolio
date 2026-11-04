import type { Server as NodeHttpServer } from 'node:http';
import { Controller, Get, type INestApplication, Req } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { type JWK, type KeyObject, SignJWT, exportJWK, generateKeyPair } from 'jose';
import request from 'supertest';
import { AdminAuthModule, AdminOnly } from '@internal/backend-auth/lib/admin-auth/admin-auth';
import {
  JoseMcpTokenVerifier,
  McpAuthModule,
  McpScope,
  type McpPrincipal,
  mcpPrincipalOf,
} from '@internal/backend-auth/lib/mcp-auth/mcp-auth';
import {
  bearerChallenge,
  hasScopes,
  protectedResourceMetadata,
  protectedResourceMetadataUrl,
} from '@internal/backend-auth/lib/protected-resource/protected-resource';

const ISSUER = 'https://exemple.fr/api/auth' as const;
const RESOURCE = 'https://exemple.fr/api/content/mcp' as const;
const METADATA = 'https://exemple.fr/.well-known/oauth-protected-resource/api/content/mcp' as const;

/**
 * Class McpDemoController
 * @class McpDemoController
 *
 * @description
 * Routes guarded by scope, plus an administrator route.
 */
@Controller('demo')
class McpDemoController {
  // #region Methods
  /** Any valid MCP token. */
  @Get('any')
  @McpScope()
  public any(@Req() req: object): McpPrincipal {
    return mcpPrincipalOf(req);
  }

  /** Reading. */
  @Get('read')
  @McpScope('content:read')
  public read(@Req() req: object): McpPrincipal {
    return mcpPrincipalOf(req);
  }

  /** Writing and publishing together. */
  @Get('publish')
  @McpScope('content:write', 'content:publish')
  public publish(@Req() req: object): McpPrincipal {
    return mcpPrincipalOf(req);
  }

  /** Administrator session only. */
  @Get('admin')
  @AdminOnly()
  public admin(): string {
    return 'admin';
  }
  // #endregion
}

/**
 * Interface TokenOptions
 * @interface TokenOptions
 *
 * @description
 * Overrides of a test token.
 */
interface TokenOptions {
  readonly audience?: string | string[];
  readonly issuer?: string;
  readonly typ?: string;
  readonly claims?: Record<string, unknown>;
  readonly expiresIn?: number;
  readonly age?: number;
  readonly key?: KeyObject | CryptoKey;
}

describe('McpAuthModule', (): void => {
  let app: INestApplication<NodeHttpServer>;
  let key: KeyObject | CryptoKey;
  let jwk: JWK;

  /**
   * Function token
   *
   * @description
   * Signs a token shaped like the identity service's MCP access tokens.
   *
   * @param {TokenOptions} options - Overrides.
   *
   * @returns {Promise<string>} Signed token.
   */
  async function token(options: TokenOptions = {}): Promise<string> {
    const now: number = Math.floor(Date.now() / 1000) - (options.age ?? 0);
    return new SignJWT({
      client_id: 'https://client.exemple.org/c.json',
      scope: 'content:write',
      ...options.claims,
    })
      .setProtectedHeader({ alg: 'EdDSA', kid: 'k1', typ: options.typ ?? 'at+jwt' })
      .setSubject('admin')
      .setIssuer(options.issuer ?? ISSUER)
      .setAudience(options.audience ?? RESOURCE)
      .setIssuedAt(now)
      .setNotBefore(now)
      .setExpirationTime(now + (options.expiresIn ?? 300))
      .setJti('jti-1')
      .sign(options.key ?? key);
  }

  beforeAll(async (): Promise<void> => {
    const pair: { privateKey: KeyObject | CryptoKey; publicKey: KeyObject | CryptoKey } =
      await generateKeyPair('EdDSA', { extractable: true });
    key = pair.privateKey;
    jwk = { ...(await exportJWK(pair.publicKey)), kid: 'k1', alg: 'EdDSA' };
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        McpAuthModule.forRoot({ issuer: ISSUER, resource: RESOURCE, jwks: { keys: [jwk] } }),
        AdminAuthModule.forRoot({ issuer: ISSUER, jwks: { keys: [jwk] } }),
      ],
      controllers: [McpDemoController],
    }).compile();
    app = moduleRef.createNestApplication<INestApplication<NodeHttpServer>>();
    await app.init();
  });

  afterAll(async (): Promise<void> => {
    await app.close();
  });

  const get = (path: string, bearer?: string): request.Test => {
    const test: request.Test = request(app.getHttpServer()).get(path);
    return bearer === undefined ? test : test.set('authorization', `Bearer ${bearer}`);
  };

  it('challenges a request without token towards the resource metadata', async (): Promise<void> => {
    const response: request.Response = await get('/demo/read');
    expect(response.status).toBe(401);
    expect(response.headers['www-authenticate']).toBe(
      `Bearer scope="content:read", resource_metadata="${METADATA}"`,
    );
    const any: request.Response = await get('/demo/any');
    expect(any.headers['www-authenticate']).toBe(
      `Bearer scope="content:read content:write content:publish content:delete", resource_metadata="${METADATA}"`,
    );
  });

  it('accepts a token for this resource and honours the scope hierarchy', async (): Promise<void> => {
    const response: request.Response = await get('/demo/read', await token());
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      subject: 'admin',
      clientId: 'https://client.exemple.org/c.json',
      scopes: ['content:write'],
      tokenId: 'jti-1',
    });
    expect((await get('/demo/any', await token())).status).toBe(200);
    expect((await get('/demo/read', await token({ audience: [RESOURCE] }))).status).toBe(200);
  });

  it('answers 403 insufficient_scope with every scope the operation needs', async (): Promise<void> => {
    const response: request.Response = await get('/demo/publish', await token());
    expect(response.status).toBe(403);
    expect(response.headers['www-authenticate']).toBe(
      `Bearer error="insufficient_scope", scope="content:write content:publish", resource_metadata="${METADATA}", error_description="This operation requires content:write content:publish."`,
    );
    expect(
      (
        await get(
          '/demo/publish',
          await token({ claims: { scope: 'content:write content:publish' } }),
        )
      ).status,
    ).toBe(200);
  });

  it.each([
    [
      'an administrator session token',
      {
        audience: 'portfolio-admin',
        claims: { role: 'admin', sid: 's', client_id: undefined, scope: undefined },
      },
    ],
    ['an administrator-shaped token for this audience', { claims: { role: 'admin', sid: 's' } }],
    ['a token for another resource', { audience: 'https://exemple.fr/api/contact' }],
    ['a token for several audiences', { audience: [RESOURCE, 'https://exemple.fr/api/contact'] }],
    ['a token from another issuer', { issuer: 'https://evil.exemple/api/auth' }],
    ['a plain JWT', { typ: 'JWT' }],
    ['an expired token', { expiresIn: -120 }],
    ['a token issued too long ago', { age: 420, expiresIn: 3600 }],
    ['a contact scope', { claims: { scope: 'contact:read' } }],
    ['no client', { claims: { client_id: undefined } }],
  ])(
    'refuses %s with invalid_token',
    async (_label: string, options: TokenOptions): Promise<void> => {
      const response: request.Response = await get('/demo/read', await token(options));
      expect(response.status).toBe(401);
      expect(response.headers['www-authenticate']).toBe(
        `Bearer error="invalid_token", scope="content:read", resource_metadata="${METADATA}", error_description="The access token is invalid, expired or not issued for this resource."`,
      );
    },
  );

  it('refuses a token signed by another key', async (): Promise<void> => {
    const other: { privateKey: KeyObject | CryptoKey } = await generateKeyPair('EdDSA');
    expect((await get('/demo/read', await token({ key: other.privateKey }))).status).toBe(401);
  });

  it('keeps MCP tokens off the administrator routes', async (): Promise<void> => {
    expect((await get('/demo/admin', await token())).status).toBe(401);
    // Even with the administrator audience and claims, a delegated client token is refused.
    const delegated: string = await token({
      audience: 'portfolio-admin',
      claims: { role: 'admin', sid: 's' },
    });
    expect((await get('/demo/admin', delegated)).status).toBe(401);
    const session: string = await token({
      audience: 'portfolio-admin',
      claims: { role: 'admin', sid: 's', client_id: undefined, scope: undefined },
    });
    expect((await get('/demo/admin', session)).status).toBe(200);
  });
});

describe('protected resource helpers', (): void => {
  it('builds the RFC 9728 document and its URL', (): void => {
    expect(protectedResourceMetadataUrl(RESOURCE)).toBe(METADATA);
    expect(protectedResourceMetadataUrl('https://mcp.exemple.fr')).toBe(
      'https://mcp.exemple.fr/.well-known/oauth-protected-resource',
    );
    expect(protectedResourceMetadata({ resource: RESOURCE, authorizationServer: ISSUER })).toEqual({
      resource: RESOURCE,
      authorization_servers: [ISSUER],
      scopes_supported: ['content:read', 'content:write', 'content:publish', 'content:delete'],
      bearer_methods_supported: ['header'],
    });
    expect(
      protectedResourceMetadata({
        resource: RESOURCE,
        authorizationServer: ISSUER,
        scopesSupported: ['content:read'],
        resourceName: 'Portfolio',
      }),
    ).toMatchObject({ scopes_supported: ['content:read'], resource_name: 'Portfolio' });
  });

  it('formats challenges and checks scopes with their implications', (): void => {
    expect(bearerChallenge({ resourceMetadataUrl: 'https://x/"a\\b' })).toBe(
      'Bearer resource_metadata="https://x/\\"a\\\\b"',
    );
    expect(bearerChallenge({ resourceMetadataUrl: 'https://x', scope: [] })).toBe(
      'Bearer resource_metadata="https://x"',
    );
    expect(hasScopes(['content:delete'], ['content:read'])).toBe(true);
    expect(hasScopes(['content:read'], ['content:delete'])).toBe(false);
    expect(hasScopes([], [])).toBe(true);
  });

  it('refuses a verifier without keys and a request without principal', (): void => {
    expect(() => new JoseMcpTokenVerifier({ issuer: ISSUER, resource: RESOURCE })).toThrow(
      'jwksUrl or jwks is required',
    );
    expect(
      new JoseMcpTokenVerifier({
        issuer: ISSUER,
        resource: RESOURCE,
        jwksUrl: 'http://identity-service:3103/api/auth/jwks.json',
      }),
    ).toBeInstanceOf(JoseMcpTokenVerifier);
    expect(() => mcpPrincipalOf({})).toThrow();
  });
});
