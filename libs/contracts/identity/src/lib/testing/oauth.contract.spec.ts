import {
  AuthorizationReviewRequestSchema,
  AuthorizationReviewResponseSchema,
  AuthorizationServerMetadataSchema,
  ClientRegistrationResponseSchema,
  ConnectedApplicationsResponseSchema,
  MCP_SCOPES,
  MCP_SCOPE_IMPLICATIONS,
  McpTokenClaimsSchema,
  OAuthErrorResponseSchema,
  ProtectedResourceMetadataSchema,
  RevocationRequestSchema,
  TokenRequestSchema,
  TokenResponseSchema,
} from '@internal/identity-contracts/lib/oauth.contract';
import consent from '@internal/identity-contracts/lib/testing/authorization-consent.fixture.json';
import metadata from '@internal/identity-contracts/lib/testing/authorization-server-metadata.fixture.json';
import registration from '@internal/identity-contracts/lib/testing/client-registration-response.fixture.json';
import applications from '@internal/identity-contracts/lib/testing/connected-applications.fixture.json';
import token from '@internal/identity-contracts/lib/testing/token-response.fixture.json';

describe('oauth contracts', (): void => {
  it('accepts the fixtures', (): void => {
    expect(AuthorizationServerMetadataSchema.parse(metadata).issuer).toBe(metadata.issuer);
    expect(TokenResponseSchema.parse(token).token_type).toBe('Bearer');
    expect(AuthorizationReviewResponseSchema.parse(consent).status).toBe('consent');
    expect(ConnectedApplicationsResponseSchema.parse(applications).items).toHaveLength(1);
    expect(ClientRegistrationResponseSchema.parse(registration).token_endpoint_auth_method).toBe(
      'none',
    );
    expect(
      AuthorizationReviewResponseSchema.parse({ status: 'redirect', redirectTo: 'https://x/cb' }),
    ).toEqual({ status: 'redirect', redirectTo: 'https://x/cb' });
    expect(OAuthErrorResponseSchema.parse({ error: 'invalid_grant' })).toEqual({
      error: 'invalid_grant',
    });
    expect(
      ProtectedResourceMetadataSchema.parse({
        resource: 'https://valentin-fortin.pro/api/content/mcp',
        authorization_servers: ['https://valentin-fortin.pro/api/auth'],
        scopes_supported: [...MCP_SCOPES],
        bearer_methods_supported: ['header'],
      }).resource,
    ).toBe('https://valentin-fortin.pro/api/content/mcp');
    expect(
      McpTokenClaimsSchema.parse({ sub: 'a', client_id: 'c', scope: 'content:read', jti: 'j' }),
    ).toEqual({ sub: 'a', client_id: 'c', scope: 'content:read', jti: 'j' });
  });

  it('keeps repeated protocol parameters for the endpoint to refuse', (): void => {
    expect(
      AuthorizationReviewRequestSchema.parse({ client_id: ['a', 'b'], state: 's' }).client_id,
    ).toEqual(['a', 'b']);
    expect(TokenRequestSchema.parse({ grant_type: 'refresh_token' }).grant_type).toBe(
      'refresh_token',
    );
    expect(RevocationRequestSchema.parse({}).token).toBeUndefined();
  });

  it('makes every scope but read imply read', (): void => {
    expect(MCP_SCOPE_IMPLICATIONS['content:read']).toEqual([]);
    for (const scope of MCP_SCOPES.filter((name: string): boolean => name !== 'content:read')) {
      expect(MCP_SCOPE_IMPLICATIONS[scope]).toEqual(['content:read']);
    }
  });

  it.each([
    [
      'a metadata document without PKCE S256',
      AuthorizationServerMetadataSchema,
      { ...metadata, code_challenge_methods_supported: ['plain'] },
    ],
    ['a token response of another type', TokenResponseSchema, { ...token, token_type: 'mac' }],
    [
      'a consent with a contact scope',
      AuthorizationReviewResponseSchema,
      { ...consent, scopes: ['contact:read'] },
    ],
    ['an over-long parameter', AuthorizationReviewRequestSchema, { state: 'x'.repeat(2049) }],
    [
      'a registration with a secret method',
      ClientRegistrationResponseSchema,
      { ...registration, token_endpoint_auth_method: 'client_secret_basic' },
    ],
    ['claims without client', McpTokenClaimsSchema, { sub: 'a', scope: 'content:read', jti: 'j' }],
  ])(
    'rejects %s',
    (
      _label: string,
      schema: { safeParse: (value: unknown) => { success: boolean } },
      value: unknown,
    ): void => {
      expect(schema.safeParse(value).success).toBe(false);
    },
  );
});
