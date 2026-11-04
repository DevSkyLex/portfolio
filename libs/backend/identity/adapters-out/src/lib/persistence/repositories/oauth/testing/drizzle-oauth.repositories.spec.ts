import {
  ApproveAuthorizationRequest,
  type AuthorizationReview,
  type ClientMetadataFetcher,
  type ConnectedApplicationRecord,
  DenyAuthorizationRequest,
  ExchangeAuthorizationCode,
  type FetchedClientMetadata,
  type IssuedTokens,
  ListConnectedApplications,
  type OAuthServerSettings,
  type OAuthTokenServices,
  RefreshResourceToken,
  RegisterOAuthClient,
  ReviewAuthorizationRequest,
  RevokeConnectedApplication,
  RevokeOAuthToken,
} from '@vfortin/identity-application';
import { AdminAccount, OAuthClient, OAuthError, OAuthGrant } from '@vfortin/identity-domain';
import { createHash } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import {
  RandomIdGenerator,
  S256PkceVerifier,
  Sha256RefreshTokenCodec,
} from '@internal/identity-adapters-out/lib/crypto/crypto.adapters';
import {
  type IdentityDatabaseHandle,
  migrateIdentityDatabase,
  openIdentityDatabase,
} from '@internal/identity-adapters-out/lib/persistence/database/identity-database';
import { DrizzleAdminAccountRepository } from '@internal/identity-adapters-out/lib/persistence/repositories/identity/drizzle-identity.repositories';
import {
  DrizzleOAuthClientRepository,
  DrizzleOAuthGrantRepository,
  DrizzleOAuthUnitOfWork,
} from '@internal/identity-adapters-out/lib/persistence/repositories/oauth/drizzle-oauth.repositories';
import {
  oauthAuthorizationCodes,
  oauthClients,
  oauthRefreshTokens,
  oauthTokenFamilies,
} from '@internal/identity-adapters-out/lib/persistence/schema/identity.schema';

const MIGRATIONS: string = fileURLToPath(
  new URL('../../../../../../../../../../apps/identity-service/migrations', import.meta.url),
);
const SETTINGS: OAuthServerSettings = {
  issuer: 'https://exemple.fr/api/auth',
  resource: 'https://exemple.fr/api/content/mcp',
};
const CLIENT_ID = 'https://client.exemple.org/oauth/client.json' as const;
const REDIRECT = 'https://client.exemple.org/callback' as const;
const VERIFIER: string = 'a-verifier-of-forty-three-characters-or-more-x';
const CHALLENGE: string = createHash('sha256').update(VERIFIER).digest('base64url');
const TARGETS: [string, string][] = [
  ['PGlite', 'pglite:memory'],
  ...(process.env['TEST_DATABASE_URL']
    ? [['Postgres', process.env['TEST_DATABASE_URL']] as [string, string]]
    : []),
];

/**
 * Constant fetcher
 *
 * @description
 * Serves the metadata document of `CLIENT_ID` and no logo.
 *
 * @type {ClientMetadataFetcher}
 */
const fetcher: ClientMetadataFetcher = {
  fetchDocument: async (url: string): Promise<FetchedClientMetadata> => {
    if (url !== CLIENT_ID) throw new Error('Not found.');
    return {
      document: {
        client_id: CLIENT_ID,
        client_name: 'Client',
        logo_uri: 'https://client.exemple.org/logo.png',
        redirect_uris: [REDIRECT],
      },
      maxAgeSeconds: 600,
    };
  },
  fetchLogo: async (): Promise<string | null> => 'data:image/png;base64,AA==',
};

/**
 * Function openMigrated
 *
 * @description
 * Opens a target, resets the schema on Postgres, migrates and inserts the administrator.
 *
 * @param {string} url - Connection URL.
 *
 * @returns {Promise<IdentityDatabaseHandle>} Migrated handle.
 */
async function openMigrated(url: string): Promise<IdentityDatabaseHandle> {
  const handle: IdentityDatabaseHandle = await openIdentityDatabase(url);
  if (!url.startsWith('pglite:')) {
    await handle.db.execute(sql`drop schema if exists identity cascade`);
  }
  await migrateIdentityDatabase(handle, MIGRATIONS);
  await new DrizzleAdminAccountRepository(handle.db).add(
    AdminAccount.create({ id: 'admin', email: 'moi@exemple.fr', passwordHash: 'h' }),
  );
  return handle;
}

describe.each(TARGETS)('Drizzle OAuth repositories on %s', (_engine: string, url: string): void => {
  let handle: IdentityDatabaseHandle;
  let uow: DrizzleOAuthUnitOfWork;
  let clock: { current: Date; now: () => Date };
  let services: OAuthTokenServices;

  beforeEach(async (): Promise<void> => {
    handle = await openMigrated(url);
    uow = new DrizzleOAuthUnitOfWork(handle.db);
    clock = { current: new Date('2026-11-04T10:00:00Z'), now: (): Date => new Date(clock.current) };
    services = {
      signer: {
        sign: async (claims): Promise<{ token: string; expiresIn: number }> => ({
          token: `at:${claims.scopes.join(' ')}`,
          expiresIn: 300,
        }),
      },
      codec: new Sha256RefreshTokenCodec(),
      ids: new RandomIdGenerator(),
    };
  });

  afterEach(async (): Promise<void> => {
    await handle.close();
  });

  /**
   * Function authorize
   *
   * @description
   * Reviews and approves a request, returning the code.
   *
   * @param {string} scope - Requested scopes.
   *
   * @returns {Promise<string>} Authorization code.
   */
  async function authorize(scope: string = 'content:read content:write'): Promise<string> {
    const review: AuthorizationReview = await new ReviewAuthorizationRequest(
      uow,
      fetcher,
      SETTINGS,
      services.ids,
      clock,
    ).execute({
      accountId: 'admin',
      sessionId: 'sid',
      parameters: {
        responseType: 'code',
        clientId: CLIENT_ID,
        redirectUri: REDIRECT,
        scope,
        state: 'st',
        codeChallenge: CHALLENGE,
        codeChallengeMethod: 'S256',
        resource: SETTINGS.resource,
        repeated: [],
      },
    });
    if (review.kind !== 'consent') throw new Error('Consent expected.');
    const redirect: string = await new ApproveAuthorizationRequest(
      uow,
      SETTINGS,
      services.codec,
      services.ids,
      clock,
    ).execute({ requestId: review.request.values.id, accountId: 'admin', sessionId: 'sid' });
    return new URL(redirect).searchParams.get('code') ?? '';
  }

  /**
   * Function exchange
   *
   * @description
   * Redeems a code with the real PKCE verifier.
   *
   * @param {string} code - Authorization code.
   *
   * @returns {Promise<IssuedTokens>} Tokens.
   */
  function exchange(code: string): Promise<IssuedTokens> {
    return new ExchangeAuthorizationCode(uow, services, new S256PkceVerifier(), clock).execute({
      code,
      codeVerifier: VERIFIER,
      clientId: CLIENT_ID,
      redirectUri: REDIRECT,
      resource: SETTINGS.resource,
    });
  }

  it('stores the client, grant, hashed code and hashed rotating tokens', async (): Promise<void> => {
    const code: string = await authorize();
    const [stored] = await handle.db.select().from(oauthClients);
    expect(stored).toMatchObject({
      id: CLIENT_ID,
      kind: 'metadata-document',
      name: 'Client',
      logo: 'data:image/png;base64,AA==',
      redirectUris: [REDIRECT],
    });
    const [codeRow] = await handle.db.select().from(oauthAuthorizationCodes);
    expect(codeRow?.codeHash).toBe(services.codec.hash(code));
    expect(JSON.stringify(codeRow)).not.toContain(code);
    const first: IssuedTokens = await exchange(code);
    const [tokenRow] = await handle.db.select().from(oauthRefreshTokens);
    expect(tokenRow?.tokenHash).toBe(services.codec.hash(first.refreshToken));
    clock.current = new Date(clock.current.getTime() + 60_000);
    const refresh: RefreshResourceToken = new RefreshResourceToken(uow, services, clock);
    const second: IssuedTokens = await refresh.execute({
      refreshToken: first.refreshToken,
      clientId: CLIENT_ID,
      scope: 'content:read',
      resource: null,
    });
    expect(second.accessToken).toBe('at:content:read');
    const listed: readonly ConnectedApplicationRecord[] = await new ListConnectedApplications(
      uow,
    ).execute('admin');
    expect(listed).toHaveLength(1);
    expect(listed[0]?.grant.snapshot().lastUsedAt).toEqual(clock.current);
    expect(listed[0]?.client.logo).toBe('data:image/png;base64,AA==');
  });

  it('revokes the family on a replayed code or refresh token', async (): Promise<void> => {
    const code: string = await authorize();
    const first: IssuedTokens = await exchange(code);
    await expect(exchange(code)).rejects.toBeInstanceOf(OAuthError);
    const [family] = await handle.db.select().from(oauthTokenFamilies);
    expect(family).toMatchObject({ revokedReason: 'replay' });
    await expect(
      new RefreshResourceToken(uow, services, clock).execute({
        refreshToken: first.refreshToken,
        clientId: CLIENT_ID,
        scope: null,
        resource: null,
      }),
    ).rejects.toMatchObject({ error: 'invalid_grant' });

    const other: IssuedTokens = await exchange(await authorize());
    const refresh: RefreshResourceToken = new RefreshResourceToken(uow, services, clock);
    await refresh.execute({
      refreshToken: other.refreshToken,
      clientId: CLIENT_ID,
      scope: null,
      resource: null,
    });
    await expect(
      refresh.execute({
        refreshToken: other.refreshToken,
        clientId: CLIENT_ID,
        scope: null,
        resource: null,
      }),
    ).rejects.toMatchObject({ error: 'invalid_grant' });
    const families: (typeof oauthTokenFamilies.$inferSelect)[] = await handle.db
      .select()
      .from(oauthTokenFamilies);
    expect(families.map((row): string | null => row.revokedReason)).toEqual(['replay', 'replay']);
  });

  it('revokes a family from its client and a grant with all its families', async (): Promise<void> => {
    const first: IssuedTokens = await exchange(await authorize());
    const second: IssuedTokens = await exchange(await authorize());
    await new RevokeOAuthToken(uow, services.codec, clock).execute({
      token: first.refreshToken,
      clientId: CLIENT_ID,
    });
    const listed: readonly ConnectedApplicationRecord[] = await new ListConnectedApplications(
      uow,
    ).execute('admin');
    await new RevokeConnectedApplication(uow, clock).execute({
      accountId: 'admin',
      grantId: listed[0]?.grant.id ?? '',
    });
    const families: (typeof oauthTokenFamilies.$inferSelect)[] = await handle.db
      .select()
      .from(oauthTokenFamilies);
    expect(families.map((row): string | null => row.revokedReason).sort()).toEqual([
      'client',
      'owner',
    ]);
    const tokens: (typeof oauthRefreshTokens.$inferSelect)[] = await handle.db
      .select()
      .from(oauthRefreshTokens);
    expect(tokens.every((row): boolean => row.revokedAt !== null)).toBe(true);
    expect(await new ListConnectedApplications(uow).execute('admin')).toEqual([]);
    await expect(
      new RefreshResourceToken(uow, services, clock).execute({
        refreshToken: second.refreshToken,
        clientId: CLIENT_ID,
        scope: null,
        resource: null,
      }),
    ).rejects.toMatchObject({ error: 'invalid_grant' });
    // A new consent after the revocation opens a new grant beside the revoked one.
    await authorize();
    expect(await new ListConnectedApplications(uow).execute('admin')).toHaveLength(1);
  });

  it('closes a denied request and purges expired requests, codes and families', async (): Promise<void> => {
    const review: AuthorizationReview = await new ReviewAuthorizationRequest(
      uow,
      fetcher,
      SETTINGS,
      services.ids,
      clock,
    ).execute({
      accountId: 'admin',
      sessionId: 'sid',
      parameters: {
        responseType: 'code',
        clientId: CLIENT_ID,
        redirectUri: REDIRECT,
        scope: null,
        state: null,
        codeChallenge: CHALLENGE,
        codeChallengeMethod: 'S256',
        resource: SETTINGS.resource,
        repeated: [],
      },
    });
    if (review.kind !== 'consent') throw new Error('Consent expected.');
    const deny: DenyAuthorizationRequest = new DenyAuthorizationRequest(uow, SETTINGS, clock);
    const command: { requestId: string; accountId: string; sessionId: string } = {
      requestId: review.request.values.id,
      accountId: 'admin',
      sessionId: 'sid',
    };
    expect(new URL(await deny.execute(command)).searchParams.get('error')).toBe('access_denied');
    await expect(deny.execute(command)).rejects.toThrow();
    await exchange(await authorize());
    clock.current = new Date(clock.current.getTime() + 100 * 86_400_000);
    await uow.run(async ({ requests, codes, tokens }): Promise<void> => {
      expect(await requests.deleteExpired(clock.now())).toBeGreaterThan(0);
      expect(await codes.deleteExpired(clock.now())).toBe(1);
      expect(await tokens.deleteExpiredFamilies(clock.now())).toBe(1);
    });
  });

  it('registers dynamic clients, counts them and purges the abandoned ones', async (): Promise<void> => {
    const register: RegisterOAuthClient = new RegisterOAuthClient(uow, services.ids, clock);
    const client: OAuthClient = await register.execute({
      client_name: 'Outil',
      redirect_uris: ['http://127.0.0.1/cb'],
    });
    const clients: DrizzleOAuthClientRepository = new DrizzleOAuthClientRepository(handle.db);
    expect((await clients.findById(client.id))?.redirectUris).toEqual(['http://127.0.0.1/cb']);
    expect(await clients.findById('nope')).toBeNull();
    expect(await clients.countDynamicSince(new Date(clock.current.getTime() - 1000))).toBe(1);
    const grants: DrizzleOAuthGrantRepository = new DrizzleOAuthGrantRepository(handle.db);
    const kept: OAuthClient = await register.execute({ redirect_uris: ['https://kept.fr/cb'] });
    await grants.add(
      OAuthGrant.create(
        { id: 'g', accountId: 'admin', clientId: kept.id, scopes: ['content:read'] },
        clock.now(),
      ),
    );
    expect((await grants.findById('g'))?.scopes).toEqual(['content:read']);
    expect(await grants.findById('nope')).toBeNull();
    expect(await grants.lockById('nope')).toBeNull();
    expect(await clients.deleteAbandonedDynamic(new Date(clock.current.getTime() + 1000))).toBe(1);
    expect(await clients.findById(client.id)).toBeNull();
    expect(await clients.findById(kept.id)).not.toBeNull();
  });

  it('keeps one active grant per client, enforced by the database', async (): Promise<void> => {
    await authorize();
    const grants: DrizzleOAuthGrantRepository = new DrizzleOAuthGrantRepository(handle.db);
    await expect(
      grants.add(
        OAuthGrant.create(
          { id: 'dup', accountId: 'admin', clientId: CLIENT_ID, scopes: ['content:read'] },
          clock.now(),
        ),
      ),
    ).rejects.toThrow();
    await handle.db.delete(oauthClients).where(eq(oauthClients.id, CLIENT_ID));
    expect(await new ListConnectedApplications(uow).execute('admin')).toEqual([]);
  });
});
