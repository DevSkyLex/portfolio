import {
  AuthorizationCode,
  OAuthClient,
  OAuthError,
  OAuthGrant,
  RefreshToken,
  type OAuthTokenFamily,
} from '@vfortin/identity-domain';
import {
  AuthorizationRequestExpiredError,
  ConnectedApplicationNotFoundError,
} from '@internal/identity-application/lib/errors/application-error';
import type {
  ConnectedApplicationRecord,
  OAuthServerSettings,
} from '@internal/identity-application/lib/ports/oauth/oauth.ports';
import {
  FakeClientMetadataFetcher,
  InMemoryOAuthStore,
  SequenceCodec,
  challengeFor,
  fakePkce,
  fakeResourceSigner,
  type StoredFamily,
} from '@internal/identity-application/lib/testing/oauth.fakes';
import { ApproveAuthorizationRequest } from '@internal/identity-application/lib/use-cases/approve-authorization-request/approve-authorization-request.use-case';
import { DenyAuthorizationRequest } from '@internal/identity-application/lib/use-cases/deny-authorization-request/deny-authorization-request.use-case';
import { ExchangeAuthorizationCode } from '@internal/identity-application/lib/use-cases/exchange-authorization-code/exchange-authorization-code.use-case';
import type {
  IssuedTokens,
  OAuthTokenServices,
} from '@internal/identity-application/lib/use-cases/issue-resource-tokens/issue-resource-tokens';
import { ListConnectedApplications } from '@internal/identity-application/lib/use-cases/list-connected-applications/list-connected-applications.use-case';
import { RefreshResourceToken } from '@internal/identity-application/lib/use-cases/refresh-resource-token/refresh-resource-token.use-case';
import {
  MAX_REGISTRATIONS_PER_HOUR,
  RegisterOAuthClient,
} from '@internal/identity-application/lib/use-cases/register-oauth-client/register-oauth-client.use-case';
import {
  type AuthorizationParameters,
  type AuthorizationReview,
  ReviewAuthorizationRequest,
} from '@internal/identity-application/lib/use-cases/review-authorization-request/review-authorization-request.use-case';
import { RevokeConnectedApplication } from '@internal/identity-application/lib/use-cases/revoke-connected-application/revoke-connected-application.use-case';
import { RevokeOAuthToken } from '@internal/identity-application/lib/use-cases/revoke-oauth-token/revoke-oauth-token.use-case';

const SETTINGS: OAuthServerSettings = {
  issuer: 'https://exemple.fr/api/auth',
  resource: 'https://exemple.fr/api/content/mcp',
};
const CLIENT_ID = 'https://client.exemple.org/oauth/client.json' as const;
const REDIRECT = 'https://client.exemple.org/callback?tenant=1' as const;
const VERIFIER: string = 'v'.repeat(20) + 'erifier-'.repeat(4);
const CHALLENGE: string = challengeFor(VERIFIER);
const START: Date = new Date('2026-11-04T10:00:00Z');

/**
 * Interface Harness
 * @interface Harness
 *
 * @description
 * Use cases over shared in-memory state and a movable clock.
 */
interface Harness {
  readonly store: InMemoryOAuthStore;
  readonly fetcher: FakeClientMetadataFetcher;
  readonly clock: { current: Date; now: () => Date };
  readonly review: ReviewAuthorizationRequest;
  readonly approve: ApproveAuthorizationRequest;
  readonly deny: DenyAuthorizationRequest;
  readonly exchange: ExchangeAuthorizationCode;
  readonly refresh: RefreshResourceToken;
  readonly revokeToken: RevokeOAuthToken;
  readonly register: RegisterOAuthClient;
  readonly list: ListConnectedApplications;
  readonly revokeApplication: RevokeConnectedApplication;
  advance(ms: number): void;
}

/**
 * Function harness
 *
 * @description
 * Builds the use cases with a fetchable metadata document for `CLIENT_ID`.
 *
 * @returns {Harness} Test harness.
 */
function harness(): Harness {
  const store: InMemoryOAuthStore = new InMemoryOAuthStore();
  const fetcher: FakeClientMetadataFetcher = new FakeClientMetadataFetcher();
  fetcher.documents.set(CLIENT_ID, {
    document: {
      client_id: CLIENT_ID,
      client_name: 'Client exemple',
      logo_uri: 'https://client.exemple.org/logo.png',
      redirect_uris: [REDIRECT, 'http://127.0.0.1/cb'],
    },
    maxAgeSeconds: 600,
  });
  fetcher.logos.set('https://client.exemple.org/logo.png', 'data:image/png;base64,AA==');
  const clock: { current: Date; now: () => Date } = {
    current: START,
    now: (): Date => new Date(clock.current),
  };
  let id: number = 0;
  const ids: { next: () => string } = { next: (): string => `id-${++id}` };
  const codec: SequenceCodec = new SequenceCodec();
  const services: OAuthTokenServices = { signer: fakeResourceSigner, codec, ids };
  return {
    store,
    fetcher,
    clock,
    review: new ReviewAuthorizationRequest(store, fetcher, SETTINGS, ids, clock),
    approve: new ApproveAuthorizationRequest(store, SETTINGS, codec, ids, clock),
    deny: new DenyAuthorizationRequest(store, SETTINGS, clock),
    exchange: new ExchangeAuthorizationCode(store, services, fakePkce, clock),
    refresh: new RefreshResourceToken(store, services, clock),
    revokeToken: new RevokeOAuthToken(store, codec, clock),
    register: new RegisterOAuthClient(store, ids, clock),
    list: new ListConnectedApplications(store),
    revokeApplication: new RevokeConnectedApplication(store, clock),
    advance: (ms: number): void => {
      clock.current = new Date(clock.current.getTime() + ms);
    },
  };
}

/**
 * Function parameters
 *
 * @description
 * Builds valid authorization parameters with overrides.
 *
 * @param {Partial<AuthorizationParameters>} overrides - Replaced fields.
 *
 * @returns {AuthorizationParameters} Parameters.
 */
function parameters(overrides: Partial<AuthorizationParameters> = {}): AuthorizationParameters {
  return {
    responseType: 'code',
    clientId: CLIENT_ID,
    redirectUri: REDIRECT,
    scope: 'content:read content:write',
    state: 'xyz',
    codeChallenge: CHALLENGE,
    codeChallengeMethod: 'S256',
    resource: SETTINGS.resource,
    repeated: [],
    ...overrides,
  };
}

/**
 * Function oauthError
 *
 * @description
 * Awaits a promise expected to reject with an `OAuthError` and returns its code.
 *
 * @param {Promise<unknown>} promise - Operation under test.
 *
 * @returns {Promise<string>} Protocol error code.
 */
async function oauthError(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error: unknown) {
    if (error instanceof OAuthError) return error.error;
    throw error;
  }
  throw new Error('Expected an OAuthError.');
}

/**
 * Function query
 *
 * @description
 * Reads the query of a redirect URL.
 *
 * @param {string} url - Redirect URL.
 *
 * @returns {Record<string, string>} Query parameters.
 */
function query(url: string): Record<string, string> {
  return Object.fromEntries(new URL(url).searchParams);
}

/**
 * Function authorize
 *
 * @description
 * Reviews and approves a valid request, returning the code.
 *
 * @param {Harness} h - Harness.
 * @param {Partial<AuthorizationParameters>} overrides - Parameter overrides.
 *
 * @returns {Promise<string>} Authorization code.
 */
async function authorize(
  h: Harness,
  overrides: Partial<AuthorizationParameters> = {},
): Promise<string> {
  const review: AuthorizationReview = await h.review.execute({
    accountId: 'admin',
    sessionId: 'sid-1',
    parameters: parameters(overrides),
  });
  if (review.kind !== 'consent') throw new Error('Consent expected.');
  const redirect: string = await h.approve.execute({
    requestId: review.request.values.id,
    accountId: 'admin',
    sessionId: 'sid-1',
  });
  return query(redirect)['code'] ?? '';
}

/**
 * Function tokensFor
 *
 * @description
 * Runs the full flow to the first tokens.
 *
 * @param {Harness} h - Harness.
 *
 * @returns {Promise<IssuedTokens>} First tokens.
 */
async function tokensFor(h: Harness): Promise<IssuedTokens> {
  const code: string = await authorize(h);
  return h.exchange.execute({
    code,
    codeVerifier: VERIFIER,
    clientId: CLIENT_ID,
    redirectUri: REDIRECT,
    resource: SETTINGS.resource,
  });
}

describe('ReviewAuthorizationRequest', (): void => {
  it('fetches the metadata document once, stores the logo and returns the consent', async (): Promise<void> => {
    const h: Harness = harness();
    const review: AuthorizationReview = await h.review.execute({
      accountId: 'admin',
      sessionId: 'sid-1',
      parameters: parameters({ resource: `${SETTINGS.resource}/` }),
    });
    expect(review.kind).toBe('consent');
    if (review.kind !== 'consent') return;
    expect(review.client.name).toBe('Client exemple');
    expect(review.client.logo).toBe('data:image/png;base64,AA==');
    expect(review.request.values).toMatchObject({
      sessionId: 'sid-1',
      scopes: ['content:read', 'content:write'],
      resource: SETTINGS.resource,
      state: 'xyz',
    });
    expect(review.grantedScopes).toEqual([]);
    await h.review.execute({ accountId: 'admin', sessionId: 'sid-1', parameters: parameters() });
    expect(h.fetcher.fetched).toEqual([CLIENT_ID, 'https://client.exemple.org/logo.png']);
    h.advance(601_000);
    await h.review.execute({ accountId: 'admin', sessionId: 'sid-1', parameters: parameters() });
    expect(h.fetcher.fetched.filter((url: string): boolean => url === CLIENT_ID)).toHaveLength(2);
  });

  it('reports the scopes an earlier consent granted', async (): Promise<void> => {
    const h: Harness = harness();
    await authorize(h, { scope: 'content:delete' });
    const review: AuthorizationReview = await h.review.execute({
      accountId: 'admin',
      sessionId: 'sid-1',
      parameters: parameters(),
    });
    expect(review.kind === 'consent' && review.grantedScopes).toEqual(['content:delete']);
  });

  it.each([
    ['no client_id', { clientId: null }, 'invalid_request'],
    ['a repeated client_id', { repeated: ['client_id'] }, 'invalid_request'],
    ['an unknown dynamic client', { clientId: 'dyn-unknown' }, 'invalid_client'],
    ['an invalid client URL', { clientId: 'https://client.exemple.org/' }, 'invalid_client'],
    [
      'an unfetchable document',
      { clientId: 'https://other.exemple.org/client.json' },
      'invalid_client',
    ],
    ['no redirect URI', { redirectUri: null }, 'invalid_redirect_uri'],
    ['a repeated redirect URI', { repeated: ['redirect_uri'] }, 'invalid_redirect_uri'],
    [
      'an unregistered redirect URI',
      { redirectUri: 'https://evil.exemple.org/cb' },
      'invalid_redirect_uri',
    ],
  ])(
    'answers %s to the page, never by redirect',
    async (
      _label: string,
      overrides: Partial<AuthorizationParameters>,
      code: string,
    ): Promise<void> => {
      const h: Harness = harness();
      expect(
        await oauthError(
          h.review.execute({
            accountId: 'admin',
            sessionId: 's',
            parameters: parameters(overrides),
          }),
        ),
      ).toBe(code);
    },
  );

  it('refuses a document whose content is invalid', async (): Promise<void> => {
    const h: Harness = harness();
    h.fetcher.documents.set(CLIENT_ID, { document: { client_id: 'x' }, maxAgeSeconds: null });
    expect(
      await oauthError(
        h.review.execute({ accountId: 'admin', sessionId: 's', parameters: parameters() }),
      ),
    ).toBe('invalid_client');
  });

  it.each([
    ['a repeated scope', { repeated: ['scope'] }, 'invalid_request', 'xyz'],
    ['a repeated state', { repeated: ['state'] }, 'invalid_request', undefined],
    ['an over-long state', { state: 's'.repeat(1025) }, 'invalid_request', undefined],
    ['no response type', { responseType: null }, 'invalid_request', 'xyz'],
    ['the token response type', { responseType: 'token' }, 'unsupported_response_type', 'xyz'],
    ['no PKCE', { codeChallenge: null, codeChallengeMethod: null }, 'invalid_request', 'xyz'],
    ['plain PKCE', { codeChallengeMethod: 'plain' }, 'invalid_request', 'xyz'],
    ['a short challenge', { codeChallenge: 'abc' }, 'invalid_request', 'xyz'],
    ['no resource', { resource: null }, 'invalid_target', 'xyz'],
    ['another resource', { resource: 'https://exemple.fr/api/contact' }, 'invalid_target', 'xyz'],
    ['a resource with a fragment', { resource: `${SETTINGS.resource}#x` }, 'invalid_target', 'xyz'],
    [
      'a resource with credentials',
      { resource: 'https://u:p@exemple.fr/api/content/mcp' },
      'invalid_target',
      'xyz',
    ],
    ['an unparsable resource', { resource: 'mcp' }, 'invalid_target', 'xyz'],
    ['a contact scope', { scope: 'contact:read' }, 'invalid_scope', 'xyz'],
  ])(
    'redirects %s back to the client with state and iss',
    async (
      _label: string,
      overrides: Partial<AuthorizationParameters>,
      error: string,
      state: string | undefined,
    ): Promise<void> => {
      const h: Harness = harness();
      const review: AuthorizationReview = await h.review.execute({
        accountId: 'admin',
        sessionId: 's',
        parameters: parameters(overrides),
      });
      expect(review.kind).toBe('redirect');
      if (review.kind !== 'redirect') return;
      const url: URL = new URL(review.redirectTo);
      expect(`${url.origin}${url.pathname}`).toBe('https://client.exemple.org/callback');
      expect(query(review.redirectTo)).toMatchObject({ tenant: '1', error, iss: SETTINGS.issuer });
      expect(query(review.redirectTo)['state']).toBe(state);
      expect(h.store.requests.size).toBe(0);
    },
  );

  it('accepts a dynamic client on any loopback port it registered', async (): Promise<void> => {
    const h: Harness = harness();
    const client: OAuthClient = await h.register.execute({
      client_name: 'Outil',
      redirect_uris: ['http://127.0.0.1/callback'],
    });
    const review: AuthorizationReview = await h.review.execute({
      accountId: 'admin',
      sessionId: 's',
      parameters: parameters({
        clientId: client.id,
        redirectUri: 'http://127.0.0.1:53111/callback',
      }),
    });
    expect(review.kind === 'consent' && review.client.kind).toBe('dynamic');
  });
});

describe('ApproveAuthorizationRequest and DenyAuthorizationRequest', (): void => {
  it('issues a code with state and iss, then refuses a second decision', async (): Promise<void> => {
    const h: Harness = harness();
    const review: AuthorizationReview = await h.review.execute({
      accountId: 'admin',
      sessionId: 'sid-1',
      parameters: parameters(),
    });
    if (review.kind !== 'consent') throw new Error('Consent expected.');
    const command: { requestId: string; accountId: string; sessionId: string } = {
      requestId: review.request.values.id,
      accountId: 'admin',
      sessionId: 'sid-1',
    };
    const redirect: string = await h.approve.execute(command);
    expect(query(redirect)).toEqual({
      tenant: '1',
      code: expect.stringMatching(/^secret-/) as unknown as string,
      state: 'xyz',
      iss: SETTINGS.issuer,
    });
    expect([...h.store.grants.values()][0]?.scopes).toEqual(['content:read', 'content:write']);
    await expect(h.approve.execute(command)).rejects.toBeInstanceOf(
      AuthorizationRequestExpiredError,
    );
    await expect(h.deny.execute(command)).rejects.toBeInstanceOf(AuthorizationRequestExpiredError);
  });

  it('extends an existing grant with the new scopes', async (): Promise<void> => {
    const h: Harness = harness();
    await authorize(h, { scope: 'content:read' });
    await authorize(h, { scope: 'content:publish' });
    expect(
      [...h.store.grants.values()].map((g: OAuthGrant): readonly string[] => g.scopes),
    ).toEqual([['content:read', 'content:publish']]);
  });

  it.each([
    ['another session', { sessionId: 'sid-2' }, 0],
    ['another account', { accountId: 'other' }, 0],
    ['an expired request', {}, 601_000],
    ['an unknown request', { requestId: 'nope' }, 0],
  ])(
    'refuses %s',
    async (
      _label: string,
      overrides: Partial<{ requestId: string; accountId: string; sessionId: string }>,
      wait: number,
    ): Promise<void> => {
      const h: Harness = harness();
      const review: AuthorizationReview = await h.review.execute({
        accountId: 'admin',
        sessionId: 'sid-1',
        parameters: parameters(),
      });
      if (review.kind !== 'consent') throw new Error('Consent expected.');
      h.advance(wait);
      const command: { requestId: string; accountId: string; sessionId: string } = {
        requestId: review.request.values.id,
        accountId: 'admin',
        sessionId: 'sid-1',
        ...overrides,
      };
      await expect(h.approve.execute(command)).rejects.toBeInstanceOf(
        AuthorizationRequestExpiredError,
      );
      await expect(h.deny.execute(command)).rejects.toBeInstanceOf(
        AuthorizationRequestExpiredError,
      );
    },
  );

  it('refuses an approval once the client is gone', async (): Promise<void> => {
    const h: Harness = harness();
    const review: AuthorizationReview = await h.review.execute({
      accountId: 'admin',
      sessionId: 'sid-1',
      parameters: parameters(),
    });
    if (review.kind !== 'consent') throw new Error('Consent expected.');
    h.store.clients.clear();
    await expect(
      h.approve.execute({
        requestId: review.request.values.id,
        accountId: 'admin',
        sessionId: 'sid-1',
      }),
    ).rejects.toBeInstanceOf(AuthorizationRequestExpiredError);
  });

  it('denies with access_denied, state and iss, and grants nothing', async (): Promise<void> => {
    const h: Harness = harness();
    const review: AuthorizationReview = await h.review.execute({
      accountId: 'admin',
      sessionId: 'sid-1',
      parameters: parameters({ state: null }),
    });
    if (review.kind !== 'consent') throw new Error('Consent expected.');
    const redirect: string = await h.deny.execute({
      requestId: review.request.values.id,
      accountId: 'admin',
      sessionId: 'sid-1',
    });
    expect(query(redirect)).toEqual({
      tenant: '1',
      error: 'access_denied',
      error_description: 'The owner denied the request.',
      iss: SETTINGS.issuer,
    });
    expect(h.store.grants.size).toBe(0);
  });
});

describe('ExchangeAuthorizationCode', (): void => {
  it('issues audience-bound tokens and opens a family', async (): Promise<void> => {
    const h: Harness = harness();
    const tokens: IssuedTokens = await tokensFor(h);
    expect(tokens).toEqual({
      accessToken: `at|admin|${CLIENT_ID}|content:read content:write|${SETTINGS.resource}`,
      expiresIn: 300,
      refreshToken: expect.stringMatching(/^secret-/) as unknown as string,
      scopes: ['content:read', 'content:write'],
    });
    expect(h.store.families.size).toBe(1);
  });

  it('accepts an omitted resource', async (): Promise<void> => {
    const h: Harness = harness();
    const code: string = await authorize(h);
    const tokens: IssuedTokens = await h.exchange.execute({
      code,
      codeVerifier: VERIFIER,
      clientId: CLIENT_ID,
      redirectUri: REDIRECT,
      resource: null,
    });
    expect(tokens.scopes).toEqual(['content:read', 'content:write']);
  });

  it('refuses a replayed code and revokes the tokens of the first redemption', async (): Promise<void> => {
    const h: Harness = harness();
    const code: string = await authorize(h);
    const command: {
      code: string;
      codeVerifier: string;
      clientId: string;
      redirectUri: string;
      resource: string;
    } = {
      code,
      codeVerifier: VERIFIER,
      clientId: CLIENT_ID,
      redirectUri: REDIRECT,
      resource: SETTINGS.resource,
    };
    const first: IssuedTokens = await h.exchange.execute(command);
    expect(await oauthError(h.exchange.execute(command))).toBe('invalid_grant');
    const family: StoredFamily | undefined = [...h.store.families.values()][0];
    expect(family?.reason).toBe('replay');
    expect(
      await oauthError(
        h.refresh.execute({
          refreshToken: first.refreshToken,
          clientId: CLIENT_ID,
          scope: null,
          resource: null,
        }),
      ),
    ).toBe('invalid_grant');
  });

  it.each([
    ['an unknown code', { code: 'nope' }, 0, 'invalid_grant'],
    ['an expired code', {}, 60_000, 'invalid_grant'],
    ['another client', { clientId: 'https://other.exemple.org/c.json' }, 0, 'invalid_grant'],
    [
      'another redirect URI',
      { redirectUri: 'https://client.exemple.org/callback' },
      0,
      'invalid_grant',
    ],
    ['a wrong verifier', { codeVerifier: 'w'.repeat(43) }, 0, 'invalid_grant'],
    ['a malformed verifier', { codeVerifier: 'short' }, 0, 'invalid_request'],
    ['another resource', { resource: 'https://exemple.fr/api/contact' }, 0, 'invalid_target'],
  ])(
    'refuses %s without consuming the code',
    async (
      _label: string,
      overrides: Record<string, string>,
      wait: number,
      error: string,
    ): Promise<void> => {
      const h: Harness = harness();
      const code: string = await authorize(h);
      h.advance(wait);
      const command: {
        code: string;
        codeVerifier: string;
        clientId: string;
        redirectUri: string;
        resource: string | null;
      } = {
        code,
        codeVerifier: VERIFIER,
        clientId: CLIENT_ID,
        redirectUri: REDIRECT,
        resource: SETTINGS.resource,
        ...overrides,
      };
      expect(await oauthError(h.exchange.execute(command))).toBe(error);
      expect(h.store.families.size).toBe(0);
    },
  );

  it('refuses a code whose grant was revoked meanwhile', async (): Promise<void> => {
    const h: Harness = harness();
    const code: string = await authorize(h);
    const grant: OAuthGrant | undefined = [...h.store.grants.values()][0];
    if (grant) h.store.grants.set(grant.id, grant.revoked(START));
    expect(
      await oauthError(
        h.exchange.execute({
          code,
          codeVerifier: VERIFIER,
          clientId: CLIENT_ID,
          redirectUri: REDIRECT,
          resource: null,
        }),
      ),
    ).toBe('invalid_grant');
  });

  it('refuses a code another redemption consumed between lock and update', async (): Promise<void> => {
    const h: Harness = harness();
    const code: string = await authorize(h);
    vi.spyOn(h.store.codeRepository, 'consume').mockResolvedValueOnce(false);
    expect(
      await oauthError(
        h.exchange.execute({
          code,
          codeVerifier: VERIFIER,
          clientId: CLIENT_ID,
          redirectUri: REDIRECT,
          resource: null,
        }),
      ),
    ).toBe('invalid_grant');
  });

  it('refuses the replay of a code whose family is unknown', async (): Promise<void> => {
    const h: Harness = harness();
    const code: string = await authorize(h);
    for (const [hash, stored] of h.store.codes) {
      h.store.codes.set(
        hash,
        AuthorizationCode.rehydrate({ ...stored.snapshot(), consumedAt: START }),
      );
    }
    expect(
      await oauthError(
        h.exchange.execute({
          code,
          codeVerifier: VERIFIER,
          clientId: CLIENT_ID,
          redirectUri: REDIRECT,
          resource: null,
        }),
      ),
    ).toBe('invalid_grant');
  });
});

describe('RefreshResourceToken', (): void => {
  it('rotates within the family, may narrow the scopes and records the use', async (): Promise<void> => {
    const h: Harness = harness();
    const first: IssuedTokens = await tokensFor(h);
    h.advance(1000);
    const second: IssuedTokens = await h.refresh.execute({
      refreshToken: first.refreshToken,
      clientId: CLIENT_ID,
      scope: 'content:read',
      resource: SETTINGS.resource,
    });
    expect(second.scopes).toEqual(['content:read']);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    const third: IssuedTokens = await h.refresh.execute({
      refreshToken: second.refreshToken,
      clientId: CLIENT_ID,
      scope: null,
      resource: null,
    });
    expect(third.scopes).toEqual(['content:read', 'content:write']);
    const listed: readonly ConnectedApplicationRecord[] = await h.list.execute('admin');
    expect(listed[0]?.grant.snapshot().lastUsedAt).toEqual(h.clock.now());
    expect(h.store.families.size).toBe(1);
  });

  it('revokes the family when a rotated token is replayed', async (): Promise<void> => {
    const h: Harness = harness();
    const first: IssuedTokens = await tokensFor(h);
    const second: IssuedTokens = await h.refresh.execute({
      refreshToken: first.refreshToken,
      clientId: CLIENT_ID,
      scope: null,
      resource: null,
    });
    expect(
      await oauthError(
        h.refresh.execute({
          refreshToken: first.refreshToken,
          clientId: CLIENT_ID,
          scope: null,
          resource: null,
        }),
      ),
    ).toBe('invalid_grant');
    expect([...h.store.families.values()][0]?.reason).toBe('replay');
    expect(
      await oauthError(
        h.refresh.execute({
          refreshToken: second.refreshToken,
          clientId: CLIENT_ID,
          scope: null,
          resource: null,
        }),
      ),
    ).toBe('invalid_grant');
  });

  it('revokes the family when the conditional rotation loses a race', async (): Promise<void> => {
    const h: Harness = harness();
    const first: IssuedTokens = await tokensFor(h);
    vi.spyOn(h.store.tokenRepository, 'markRotated').mockResolvedValueOnce(false);
    expect(
      await oauthError(
        h.refresh.execute({
          refreshToken: first.refreshToken,
          clientId: CLIENT_ID,
          scope: null,
          resource: null,
        }),
      ),
    ).toBe('invalid_grant');
    expect([...h.store.families.values()][0]?.revokedAt).not.toBeNull();
  });

  it.each([
    ['an unknown token', { refreshToken: 'nope' }, 0, 'invalid_grant'],
    ['another client', { clientId: 'https://other.exemple.org/c.json' }, 0, 'invalid_grant'],
    ['an expired token', {}, 31 * 24 * 3_600_000, 'invalid_grant'],
    ['a wider scope', { scope: 'content:delete' }, 0, 'invalid_scope'],
    ['an unknown scope', { scope: 'contact:read' }, 0, 'invalid_scope'],
    ['another resource', { resource: 'https://exemple.fr/api/contact' }, 0, 'invalid_target'],
  ])(
    'refuses %s',
    async (
      _label: string,
      overrides: Record<string, string>,
      wait: number,
      error: string,
    ): Promise<void> => {
      const h: Harness = harness();
      const first: IssuedTokens = await tokensFor(h);
      h.advance(wait);
      expect(
        await oauthError(
          h.refresh.execute({
            refreshToken: first.refreshToken,
            clientId: CLIENT_ID,
            scope: null,
            resource: null,
            ...overrides,
          }),
        ),
      ).toBe(error);
    },
  );

  it('refuses a token whose family or grant is gone', async (): Promise<void> => {
    const h: Harness = harness();
    const first: IssuedTokens = await tokensFor(h);
    const grant: OAuthGrant | undefined = [...h.store.grants.values()][0];
    if (grant) h.store.grants.delete(grant.id);
    expect(
      await oauthError(
        h.refresh.execute({
          refreshToken: first.refreshToken,
          clientId: CLIENT_ID,
          scope: null,
          resource: null,
        }),
      ),
    ).toBe('invalid_grant');
    h.store.families.clear();
    expect(
      await oauthError(
        h.refresh.execute({
          refreshToken: first.refreshToken,
          clientId: CLIENT_ID,
          scope: null,
          resource: null,
        }),
      ),
    ).toBe('invalid_grant');
  });
});

describe('RevokeOAuthToken', (): void => {
  it('revokes the family of a refresh token and ignores unknown tokens', async (): Promise<void> => {
    const h: Harness = harness();
    const first: IssuedTokens = await tokensFor(h);
    await h.revokeToken.execute({ token: first.accessToken, clientId: CLIENT_ID });
    expect([...h.store.families.values()][0]?.revokedAt).toBeNull();
    expect(
      await oauthError(
        h.revokeToken.execute({
          token: first.refreshToken,
          clientId: 'https://other.exemple.org/c.json',
        }),
      ),
    ).toBe('invalid_request');
    await h.revokeToken.execute({ token: first.refreshToken, clientId: null });
    expect([...h.store.families.values()][0]?.reason).toBe('client');
    h.store.families.clear();
    await expect(
      h.revokeToken.execute({ token: first.refreshToken, clientId: CLIENT_ID }),
    ).resolves.toBeUndefined();
  });
});

describe('RegisterOAuthClient', (): void => {
  it('registers public clients up to the hourly cap and purges abandoned ones', async (): Promise<void> => {
    const h: Harness = harness();
    const metadata: object = { client_name: 'Outil', redirect_uris: ['http://localhost:9999/cb'] };
    for (let index: number = 0; index < MAX_REGISTRATIONS_PER_HOUR; index++) {
      await h.register.execute(metadata);
    }
    expect(await oauthError(h.register.execute(metadata))).toBe('temporarily_unavailable');
    h.advance(25 * 3_600_000);
    const client: OAuthClient = await h.register.execute(metadata);
    expect(h.store.clients.size).toBe(1);
    expect(client.kind).toBe('dynamic');
    expect(await oauthError(h.register.execute({ redirect_uris: ['ftp://x/cb'] }))).toBe(
      'invalid_redirect_uri',
    );
  });
});

describe('ListConnectedApplications and RevokeConnectedApplication', (): void => {
  it('lists active grants and revokes one with its families', async (): Promise<void> => {
    const h: Harness = harness();
    const first: IssuedTokens = await tokensFor(h);
    const listed: readonly ConnectedApplicationRecord[] = await h.list.execute('admin');
    expect(listed.map((record: ConnectedApplicationRecord): string => record.client.id)).toEqual([
      CLIENT_ID,
    ]);
    const grantId: string = listed[0]?.grant.id ?? '';
    await expect(
      h.revokeApplication.execute({ accountId: 'other', grantId }),
    ).rejects.toBeInstanceOf(ConnectedApplicationNotFoundError);
    await h.revokeApplication.execute({ accountId: 'admin', grantId });
    expect(await h.list.execute('admin')).toEqual([]);
    expect([...h.store.families.values()][0]?.reason).toBe('owner');
    expect(
      await oauthError(
        h.refresh.execute({
          refreshToken: first.refreshToken,
          clientId: CLIENT_ID,
          scope: null,
          resource: null,
        }),
      ),
    ).toBe('invalid_grant');
    await expect(
      h.revokeApplication.execute({ accountId: 'admin', grantId }),
    ).rejects.toBeInstanceOf(ConnectedApplicationNotFoundError);
    await expect(
      h.revokeApplication.execute({ accountId: 'admin', grantId: 'nope' }),
    ).rejects.toBeInstanceOf(ConnectedApplicationNotFoundError);
  });

  it('omits a grant whose client is gone', async (): Promise<void> => {
    const h: Harness = harness();
    h.store.grants.set(
      'g',
      OAuthGrant.create(
        { id: 'g', accountId: 'admin', clientId: 'gone', scopes: ['content:read'] },
        START,
      ),
    );
    expect(await h.list.execute('admin')).toEqual([]);
  });
});

describe('InMemoryOAuthStore', (): void => {
  it('expires families whose tokens all expired', async (): Promise<void> => {
    const store: InMemoryOAuthStore = new InMemoryOAuthStore();
    const family: OAuthTokenFamily = {
      id: 'f',
      grantId: 'g',
      accountId: 'a',
      clientId: 'c',
      resource: SETTINGS.resource,
      scopes: ['content:read'],
      createdAt: START,
      persistent: true,
    };
    await store.run(async ({ tokens }): Promise<void> => {
      await tokens.addFamily(family);
      await tokens.add(RefreshToken.issue({ id: 't', tokenHash: 'h' }, family, START));
      expect(await tokens.deleteExpiredFamilies(START)).toBe(0);
      expect(await tokens.deleteExpiredFamilies(new Date(START.getTime() + 91 * 86_400_000))).toBe(
        1,
      );
    });
    await expect(
      store.run(async (): Promise<void> => {
        store.clients.set(
          'x',
          OAuthClient.register('x', { redirect_uris: ['https://a.fr/cb'] }, START),
        );
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');
    expect(store.clients.size).toBe(0);
  });
});
