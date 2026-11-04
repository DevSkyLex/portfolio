import { OAuthError } from '@internal/identity-domain/lib/errors/domain-error';
import {
  AUTHORIZATION_CODE_TTL_MS,
  AuthorizationCode,
} from '@internal/identity-domain/lib/oauth/authorization-code/authorization-code';
import {
  AUTHORIZATION_REQUEST_TTL_MS,
  AuthorizationRequest,
} from '@internal/identity-domain/lib/oauth/authorization-request/authorization-request';
import {
  OAuthClient,
  assertMetadataDocumentUrl,
  isMetadataDocumentClientId,
} from '@internal/identity-domain/lib/oauth/client/oauth-client';
import { OAuthGrant } from '@internal/identity-domain/lib/oauth/grant/oauth-grant';
import {
  assertRedirectUri,
  hostOf,
  isLoopbackRedirect,
  redirectUriMatches,
} from '@internal/identity-domain/lib/oauth/redirect-uri/redirect-uri';
import {
  formatScopes,
  includesScopes,
  parseScopes,
} from '@internal/identity-domain/lib/oauth/scope/oauth-scope';
import {
  openTokenFamily,
  type OAuthTokenFamily,
} from '@internal/identity-domain/lib/oauth/token-family/oauth-token-family';
import {
  RefreshToken,
  SESSION_MAX_AGE_MS,
} from '@internal/identity-domain/lib/session/refresh-token/refresh-token';

const NOW: Date = new Date('2026-11-04T10:00:00Z');
const LATER: Date = new Date(NOW.getTime() + 60 * 60 * 1000);
const CLIENT_ID = 'https://app.exemple.fr/oauth/client.json' as const;

/**
 * Function documentFor
 *
 * @description
 * Builds a valid Client ID Metadata Document with overrides.
 *
 * @param {Record<string, unknown>} overrides - Fields to replace or add.
 *
 * @returns {Record<string, unknown>} Document.
 */
function documentFor(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    client_id: CLIENT_ID,
    client_name: '  Exemple  ',
    client_uri: 'https://app.exemple.fr',
    logo_uri: 'https://app.exemple.fr/logo.png',
    redirect_uris: ['https://app.exemple.fr/callback', 'http://127.0.0.1:3000/callback'],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    ...overrides,
  };
}

/**
 * Function oauthError
 *
 * @description
 * Runs a function expected to throw and returns its protocol error code.
 *
 * @param {() => unknown} run - Function under test.
 *
 * @returns {string} The `OAuthError` code.
 */
function oauthError(run: () => unknown): string {
  try {
    run();
  } catch (error: unknown) {
    if (error instanceof OAuthError) return error.error;
    throw error;
  }
  throw new Error('Expected an OAuthError.');
}

describe('OAuth scopes', (): void => {
  it('parses, defaults, drops offline_access and orders canonically', (): void => {
    expect(parseScopes(null)).toEqual(['content:read']);
    expect(parseScopes('')).toEqual(['content:read']);
    expect(parseScopes('offline_access')).toEqual(['content:read']);
    expect(parseScopes('content:delete  content:read content:read offline_access')).toEqual([
      'content:read',
      'content:delete',
    ]);
    expect(formatScopes(['content:publish', 'content:read'])).toBe('content:read content:publish');
    expect(includesScopes(['content:read', 'content:write'], ['content:write'])).toBe(true);
    expect(includesScopes(['content:read'], ['content:write'])).toBe(false);
  });

  it.each(['contact:read', 'content:admin', 'Content:read', 'x'.repeat(513)])(
    'refuses %s with invalid_scope',
    (raw: string): void => {
      expect(oauthError(() => parseScopes(raw))).toBe('invalid_scope');
    },
  );
});

describe('redirect URIs', (): void => {
  it('accepts https and loopback http only', (): void => {
    expect(assertRedirectUri('https://app.exemple.fr/cb?x=1')).toBe(
      'https://app.exemple.fr/cb?x=1',
    );
    expect(assertRedirectUri('http://127.0.0.1:8080/cb')).toBe('http://127.0.0.1:8080/cb');
    expect(assertRedirectUri('http://[::1]/cb')).toBe('http://[::1]/cb');
    expect(assertRedirectUri('http://localhost:3000/cb')).toBe('http://localhost:3000/cb');
  });

  it.each([
    'http://app.exemple.fr/cb',
    'cursor://anysphere.cursor-mcp/oauth/callback',
    'https://app.exemple.fr/cb#frag',
    'https://app.exemple.fr/cb#',
    'https://user:pass@app.exemple.fr/cb',
    'not a url',
    `https://app.exemple.fr/${'x'.repeat(520)}`,
  ])('refuses %s', (uri: string): void => {
    expect(oauthError(() => assertRedirectUri(uri))).toBe('invalid_redirect_uri');
  });

  it('matches exactly, ignoring only the port of loopback URIs', (): void => {
    expect(redirectUriMatches('https://a.fr/cb', 'https://a.fr/cb')).toBe(true);
    expect(redirectUriMatches('https://a.fr/cb', 'https://a.fr/cb/')).toBe(false);
    expect(redirectUriMatches('https://a.fr/cb', 'https://a.fr:444/cb')).toBe(false);
    expect(redirectUriMatches('http://127.0.0.1/cb', 'http://127.0.0.1:51004/cb')).toBe(true);
    expect(redirectUriMatches('http://localhost:3000/cb', 'http://localhost:4000/cb')).toBe(true);
    expect(redirectUriMatches('http://127.0.0.1/cb', 'http://127.0.0.1:5/other')).toBe(false);
    expect(redirectUriMatches('http://127.0.0.1/cb', 'http://localhost:5/cb')).toBe(false);
    expect(redirectUriMatches('http://127.0.0.1/cb?a=1', 'http://127.0.0.1:5/cb?a=2')).toBe(false);
    expect(redirectUriMatches('http://127.0.0.1/cb', 'http://127.0.0.1:5/cb#x')).toBe(false);
    expect(redirectUriMatches('not a url', 'http://127.0.0.1:5/cb')).toBe(false);
    expect(isLoopbackRedirect('http://[::1]:9/cb')).toBe(true);
    expect(isLoopbackRedirect('https://127.0.0.1/cb')).toBe(false);
    expect(isLoopbackRedirect('nope')).toBe(false);
    expect(hostOf('https://claude.ai:8443/x')).toBe('claude.ai:8443');
    expect(hostOf('opaque')).toBe('opaque');
  });
});

describe('OAuthClient', (): void => {
  it('builds a metadata-document client and keeps its first creation time', (): void => {
    const first: OAuthClient = OAuthClient.fromMetadataDocument(
      CLIENT_ID,
      documentFor(),
      NOW,
      LATER,
      null,
    );
    expect(first.snapshot()).toEqual({
      id: CLIENT_ID,
      kind: 'metadata-document',
      name: 'Exemple',
      clientUri: 'https://app.exemple.fr',
      logoUri: 'https://app.exemple.fr/logo.png',
      logo: null,
      logoFetchedAt: null,
      redirectUris: ['https://app.exemple.fr/callback', 'http://127.0.0.1:3000/callback'],
      createdAt: NOW,
      metadataExpiresAt: LATER,
    });
    expect(first.host).toBe('app.exemple.fr');
    expect(first.isStale(NOW)).toBe(false);
    expect(first.isStale(LATER)).toBe(true);
    expect(first.needsLogo()).toBe(true);
    expect(first.allowsRedirect('http://127.0.0.1:61000/callback')).toBe(true);
    expect(first.allowsRedirect('https://evil.fr/callback')).toBe(false);
    const fetched: OAuthClient = first.withLogo('data:image/png;base64,AA==', NOW);
    expect(fetched.logo).toBe('data:image/png;base64,AA==');
    expect(fetched.needsLogo()).toBe(false);
    expect(fetched.logoUri).toBe('https://app.exemple.fr/logo.png');
    const again: OAuthClient = OAuthClient.fromMetadataDocument(
      CLIENT_ID,
      documentFor({ client_name: 'Renommé' }),
      LATER,
      LATER,
      fetched,
    );
    expect(again.createdAt).toEqual(NOW);
    expect(again.name).toBe('Renommé');
    expect(OAuthClient.rehydrate(again.snapshot()).redirectUris).toEqual(again.redirectUris);
  });

  it.each([
    ['a client_id differing from the URL', documentFor({ client_id: `${CLIENT_ID}?x` })],
    ['no client name', documentFor({ client_name: undefined })],
    ['a blank client name', documentFor({ client_name: '   ' })],
    ['a numeric client name', documentFor({ client_name: 3 })],
    ['a secret', documentFor({ client_secret: 's' })],
    ['a secret-based method', documentFor({ token_endpoint_auth_method: 'client_secret_basic' })],
    ['private_key_jwt', documentFor({ token_endpoint_auth_method: 'private_key_jwt' })],
    ['an implicit grant', documentFor({ grant_types: ['authorization_code', 'implicit'] })],
    ['no authorization_code grant', documentFor({ grant_types: ['refresh_token'] })],
    ['a token response type', documentFor({ response_types: ['token'] })],
    ['no redirect URI', documentFor({ redirect_uris: [] })],
    ['eleven redirect URIs', documentFor({ redirect_uris: Array(11).fill('https://a.fr/cb') })],
    ['a non-string redirect URI', documentFor({ redirect_uris: [3] })],
    ['an http redirect URI', documentFor({ redirect_uris: ['http://app.exemple.fr/cb'] })],
    ['an http logo', documentFor({ logo_uri: 'http://app.exemple.fr/logo.png' })],
    ['an unparsable client_uri', documentFor({ client_uri: 'https://' })],
    ['an array document', [CLIENT_ID]],
    ['a null document', null],
  ])('refuses a metadata document with %s as invalid_client', (_l: string, doc: unknown): void => {
    expect(
      oauthError(() => OAuthClient.fromMetadataDocument(CLIENT_ID, doc, NOW, LATER, null)),
    ).toBe('invalid_client');
  });

  it.each([
    'http://app.exemple.fr/client.json',
    'https://app.exemple.fr',
    'https://app.exemple.fr/',
    'https://APP.exemple.fr/client.json',
    'https://app.exemple.fr/a/../client.json',
    'https://app.exemple.fr/client.json#x',
    'https://u:p@app.exemple.fr/client.json',
    'https://app.exemple.fr:443/client.json',
    'not a url',
    `https://app.exemple.fr/${'x'.repeat(520)}`,
  ])('refuses the client identifier %s', (clientId: string): void => {
    expect(oauthError(() => assertMetadataDocumentUrl(clientId))).toBe('invalid_client');
  });

  it('tells metadata identifiers from dynamic ones', (): void => {
    expect(assertMetadataDocumentUrl(CLIENT_ID).hostname).toBe('app.exemple.fr');
    expect(isMetadataDocumentClientId(CLIENT_ID)).toBe(true);
    expect(isMetadataDocumentClientId('4d3c2b1a-0f9e')).toBe(false);
  });

  it('registers a dynamic client with optional name and fields', (): void => {
    const client: OAuthClient = OAuthClient.register(
      'dyn-1',
      { redirect_uris: ['http://localhost:7777/cb', 'http://localhost:7777/cb'] },
      NOW,
    );
    expect(client.kind).toBe('dynamic');
    expect(client.name).toBeNull();
    expect(client.clientUri).toBeNull();
    expect(client.redirectUris).toEqual(['http://localhost:7777/cb']);
    expect(client.host).toBe('localhost:7777');
    expect(client.isStale(LATER)).toBe(false);
    expect(client.needsLogo()).toBe(false);
    const named: OAuthClient = OAuthClient.register(
      'dyn-2',
      {
        client_name: 'Outil',
        client_uri: 'https://outil.fr',
        redirect_uris: ['https://outil.fr/cb'],
      },
      NOW,
    );
    expect(named.host).toBe('outil.fr');
    const bare: OAuthClient = OAuthClient.rehydrate({
      ...named.snapshot(),
      clientUri: null,
      redirectUris: [],
    });
    expect(bare.host).toBe('dyn-2');
  });

  it.each([
    ['a missing redirect list', {}, 'invalid_redirect_uri'],
    ['a string redirect list', { redirect_uris: 'https://a.fr/cb' }, 'invalid_client_metadata'],
    ['an http redirect', { redirect_uris: ['http://a.fr/cb'] }, 'invalid_redirect_uri'],
    [
      'a long name',
      { client_name: 'x'.repeat(101), redirect_uris: ['https://a.fr/cb'] },
      'invalid_client_metadata',
    ],
    [
      'a secret',
      { client_secret: 'x', redirect_uris: ['https://a.fr/cb'] },
      'invalid_client_metadata',
    ],
    ['a string body', 'redirect', 'invalid_client_metadata'],
  ])('refuses a registration with %s', (_l: string, body: unknown, code: string): void => {
    expect(oauthError(() => OAuthClient.register('dyn', body, NOW))).toBe(code);
  });

  it('lets an unrelated error through the metadata document wrapper', (): void => {
    const hostile: object = new Proxy(
      {},
      {
        get: (): never => {
          throw new TypeError('hostile');
        },
      },
    );
    expect(() => OAuthClient.fromMetadataDocument(CLIENT_ID, hostile, NOW, LATER, null)).toThrow(
      TypeError,
    );
  });
});

describe('OAuthGrant', (): void => {
  it('extends and revokes once', (): void => {
    const grant: OAuthGrant = OAuthGrant.create(
      { id: 'g1', accountId: 'a1', clientId: CLIENT_ID, scopes: ['content:write', 'content:read'] },
      NOW,
    );
    expect(grant.scopes).toEqual(['content:read', 'content:write']);
    expect(grant.isActive).toBe(true);
    const extended: OAuthGrant = grant.extended(['content:delete'], LATER);
    expect(extended.scopes).toEqual(['content:read', 'content:write', 'content:delete']);
    expect(extended.snapshot().updatedAt).toEqual(LATER);
    expect(extended.snapshot().lastUsedAt).toBeNull();
    const revoked: OAuthGrant = extended.revoked(NOW);
    expect(revoked.isActive).toBe(false);
    expect(revoked.revoked(LATER).snapshot().revokedAt).toEqual(NOW);
    expect(OAuthGrant.rehydrate(revoked.snapshot()).id).toBe('g1');
    expect([revoked.accountId, revoked.clientId]).toEqual(['a1', CLIENT_ID]);
  });
});

describe('AuthorizationRequest', (): void => {
  it('is decided once, by its session, before expiry', (): void => {
    const request: AuthorizationRequest = AuthorizationRequest.open(
      {
        id: 'r1',
        accountId: 'a1',
        sessionId: 's1',
        clientId: CLIENT_ID,
        redirectUri: 'https://app.exemple.fr/callback',
        scopes: ['content:read'],
        resource: 'https://exemple.fr/api/content/mcp',
        state: null,
        codeChallenge: 'c'.repeat(43),
      },
      NOW,
    );
    expect(request.values.expiresAt.getTime() - NOW.getTime()).toBe(AUTHORIZATION_REQUEST_TTL_MS);
    expect(request.isDecidableBy('a1', 's1', NOW)).toBe(true);
    expect(request.isDecidableBy('a1', 's2', NOW)).toBe(false);
    expect(request.isDecidableBy('a2', 's1', NOW)).toBe(false);
    expect(request.isDecidableBy('a1', 's1', request.values.expiresAt)).toBe(false);
    const decided: AuthorizationRequest = request.decided(NOW);
    expect(decided.isDecidableBy('a1', 's1', NOW)).toBe(false);
    expect(AuthorizationRequest.rehydrate(decided.snapshot()).values.decidedAt).toEqual(NOW);
  });
});

describe('AuthorizationCode', (): void => {
  it('expires after one minute and remembers its redemption', (): void => {
    const code: AuthorizationCode = AuthorizationCode.issue(
      {
        id: 'c1',
        codeHash: 'h',
        accountId: 'a1',
        clientId: CLIENT_ID,
        grantId: 'g1',
        redirectUri: 'https://app.exemple.fr/callback',
        scopes: ['content:read'],
        resource: 'https://exemple.fr/api/content/mcp',
        codeChallenge: 'c'.repeat(43),
      },
      NOW,
    );
    expect(code.values.expiresAt.getTime() - NOW.getTime()).toBe(AUTHORIZATION_CODE_TTL_MS);
    expect(code.isExpired(NOW)).toBe(false);
    expect(code.isExpired(code.values.expiresAt)).toBe(true);
    expect(code.isConsumed).toBe(false);
    const used: AuthorizationCode = AuthorizationCode.rehydrate({
      ...code.snapshot(),
      consumedAt: NOW,
      familyId: 'f1',
    });
    expect(used.isConsumed).toBe(true);
    expect(used.values.familyId).toBe('f1');
  });
});

describe('openTokenFamily', (): void => {
  it('opens a persistent family whose tokens follow the session cap', (): void => {
    const family: OAuthTokenFamily = openTokenFamily(
      {
        id: 'f1',
        grantId: 'g1',
        accountId: 'a1',
        clientId: CLIENT_ID,
        resource: 'https://exemple.fr/api/content/mcp',
        scopes: ['content:read'],
      },
      NOW,
    );
    expect(family.persistent).toBe(true);
    const late: Date = new Date(NOW.getTime() + SESSION_MAX_AGE_MS - 1000);
    const token: RefreshToken = RefreshToken.issue({ id: 't1', tokenHash: 'h' }, family, late);
    expect(token.expiresAt.getTime()).toBe(NOW.getTime() + SESSION_MAX_AGE_MS);
  });
});
