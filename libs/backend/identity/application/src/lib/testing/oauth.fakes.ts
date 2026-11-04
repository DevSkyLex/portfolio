import {
  AuthorizationCode,
  type AuthorizationRequest,
  type OAuthClient,
  OAuthGrant,
  type OAuthTokenFamily,
  RefreshToken,
  type RefreshTokenProps,
} from '@vfortin/identity-domain';
import type {
  AccessToken,
  RefreshTokenCodec,
} from '@internal/identity-application/lib/ports/identity/identity.ports';
import type {
  AuthorizationCodeRepository,
  AuthorizationRequestRepository,
  ClientMetadataFetcher,
  ConnectedApplicationRecord,
  FetchedClientMetadata,
  LockedTokenFamily,
  OAuthClientRepository,
  OAuthGrantRepository,
  OAuthRepositories,
  OAuthTokenRepository,
  OAuthUnitOfWork,
  PkceVerifier,
  ResourceTokenClaims,
  ResourceTokenSigner,
} from '@internal/identity-application/lib/ports/oauth/oauth.ports';

/**
 * Interface StoredFamily
 * @interface StoredFamily
 *
 * @description
 * Family row of the in-memory store.
 */
export interface StoredFamily extends LockedTokenFamily {
  // #region Properties
  /** Latest use. */
  readonly lastUsedAt: Date | null;
  /** Revocation reason. */
  readonly reason: string | null;
  // #endregion
}

/**
 * Class InMemoryOAuthStore
 * @class InMemoryOAuthStore
 *
 * @description
 * Map-backed authorization-server repositories for use-case tests. Each unit of work snapshots state
 * and restores it on rejection; locks are recorded, concurrency is not simulated.
 */
export class InMemoryOAuthStore implements OAuthUnitOfWork {
  // #region Properties
  /** Clients by identifier. */
  public clients: Map<string, OAuthClient> = new Map<string, OAuthClient>();
  /** Grants by identifier. */
  public grants: Map<string, OAuthGrant> = new Map<string, OAuthGrant>();
  /** Pending requests by identifier. */
  public requests: Map<string, AuthorizationRequest> = new Map<string, AuthorizationRequest>();
  /** Codes by hash. */
  public codes: Map<string, AuthorizationCode> = new Map<string, AuthorizationCode>();
  /** Families by identifier. */
  public families: Map<string, StoredFamily> = new Map<string, StoredFamily>();
  /** Refresh tokens by hash. */
  public tokens: Map<string, RefreshToken> = new Map<string, RefreshToken>();
  /** Lock requests, in order. */
  public readonly locked: string[] = [];

  /** Client repository. */
  public readonly clientRepository: OAuthClientRepository = {
    findById: async (id: string): Promise<OAuthClient | null> => this.clients.get(id) ?? null,
    save: async (client: OAuthClient): Promise<void> => void this.clients.set(client.id, client),
    countDynamicSince: async (since: Date): Promise<number> =>
      [...this.clients.values()].filter(
        (client: OAuthClient): boolean =>
          client.kind === 'dynamic' && client.createdAt.getTime() >= since.getTime(),
      ).length,
    deleteAbandonedDynamic: async (before: Date): Promise<number> => {
      let deleted: number = 0;
      for (const client of [...this.clients.values()]) {
        const consented: boolean = [...this.grants.values()].some(
          (grant: OAuthGrant): boolean => grant.clientId === client.id,
        );
        if (
          client.kind === 'dynamic' &&
          client.createdAt.getTime() < before.getTime() &&
          !consented
        ) {
          this.clients.delete(client.id);
          deleted++;
        }
      }
      return deleted;
    },
  };

  /** Grant repository. */
  public readonly grantRepository: OAuthGrantRepository = {
    lockActive: async (accountId: string, clientId: string): Promise<OAuthGrant | null> => {
      const grant: OAuthGrant | undefined = [...this.grants.values()].find(
        (one: OAuthGrant): boolean =>
          one.accountId === accountId && one.clientId === clientId && one.isActive,
      );
      if (grant) this.locked.push(`grant:${grant.id}`);
      return grant ?? null;
    },
    findById: async (id: string): Promise<OAuthGrant | null> => this.grants.get(id) ?? null,
    lockById: async (id: string): Promise<OAuthGrant | null> => {
      this.locked.push(`grant:${id}`);
      return this.grants.get(id) ?? null;
    },
    add: async (grant: OAuthGrant): Promise<void> => void this.grants.set(grant.id, grant),
    save: async (grant: OAuthGrant): Promise<void> => void this.grants.set(grant.id, grant),
    listActive: async (accountId: string): Promise<readonly ConnectedApplicationRecord[]> =>
      [...this.grants.values()]
        .filter((grant: OAuthGrant): boolean => grant.accountId === accountId && grant.isActive)
        .sort(
          (a: OAuthGrant, b: OAuthGrant): number =>
            b.snapshot().createdAt.getTime() - a.snapshot().createdAt.getTime(),
        )
        .flatMap((grant: OAuthGrant): ConnectedApplicationRecord[] => {
          const client: OAuthClient | undefined = this.clients.get(grant.clientId);
          const used: number[] = [...this.families.values()]
            .filter((family: StoredFamily): boolean => family.grantId === grant.id)
            .map((family: StoredFamily): number => family.lastUsedAt?.getTime() ?? 0);
          const last: number = Math.max(0, ...used);
          return client
            ? [
                {
                  grant: OAuthGrant.rehydrate({
                    ...grant.snapshot(),
                    lastUsedAt: last > 0 ? new Date(last) : null,
                  }),
                  client,
                },
              ]
            : [];
        }),
  };

  /** Request repository. */
  public readonly requestRepository: AuthorizationRequestRepository = {
    add: async (request: AuthorizationRequest): Promise<void> =>
      void this.requests.set(request.values.id, request),
    lockById: async (id: string): Promise<AuthorizationRequest | null> => {
      this.locked.push(`request:${id}`);
      return this.requests.get(id) ?? null;
    },
    save: async (request: AuthorizationRequest): Promise<void> =>
      void this.requests.set(request.values.id, request),
    deleteExpired: async (now: Date): Promise<number> => {
      let deleted: number = 0;
      for (const [id, request] of this.requests) {
        if (request.values.expiresAt.getTime() <= now.getTime()) {
          this.requests.delete(id);
          deleted++;
        }
      }
      return deleted;
    },
  };

  /** Code repository. */
  public readonly codeRepository: AuthorizationCodeRepository = {
    add: async (code: AuthorizationCode): Promise<void> =>
      void this.codes.set(code.values.codeHash, code),
    lockByHash: async (hash: string): Promise<AuthorizationCode | null> => {
      this.locked.push(`code:${hash}`);
      return this.codes.get(hash) ?? null;
    },
    consume: async (id: string, familyId: string, now: Date): Promise<boolean> => {
      const code: AuthorizationCode | undefined = [...this.codes.values()].find(
        (one: AuthorizationCode): boolean => one.values.id === id,
      );
      if (!code || code.isConsumed) return false;
      this.codes.set(
        code.values.codeHash,
        AuthorizationCode.rehydrate({ ...code.snapshot(), consumedAt: now, familyId }),
      );
      return true;
    },
    deleteExpired: async (cutoff: Date): Promise<number> => {
      let deleted: number = 0;
      for (const [hash, code] of this.codes) {
        if (code.values.expiresAt.getTime() <= cutoff.getTime()) {
          this.codes.delete(hash);
          deleted++;
        }
      }
      return deleted;
    },
  };

  /** Token repository. */
  public readonly tokenRepository: OAuthTokenRepository = {
    addFamily: async (family: OAuthTokenFamily): Promise<void> =>
      void this.families.set(family.id, {
        ...family,
        revokedAt: null,
        lastUsedAt: family.createdAt,
        reason: null,
      }),
    lockFamily: async (id: string): Promise<LockedTokenFamily | null> => {
      this.locked.push(`family:${id}`);
      return this.families.get(id) ?? null;
    },
    add: async (token: RefreshToken): Promise<void> =>
      void this.tokens.set(token.snapshot().tokenHash, token),
    findByHash: async (hash: string): Promise<RefreshToken | null> => {
      const token: RefreshToken | undefined = this.tokens.get(hash);
      if (!token) return null;
      const props: RefreshTokenProps = token.snapshot();
      const familyRevokedAt: Date | null = this.families.get(token.familyId)?.revokedAt ?? null;
      return RefreshToken.rehydrate({ ...props, revokedAt: props.revokedAt ?? familyRevokedAt });
    },
    markRotated: async (hash: string, now: Date): Promise<boolean> => {
      const token: RefreshToken | null = await this.tokenRepository.findByHash(hash);
      if (!token || token.isSpent()) return false;
      this.tokens.set(hash, RefreshToken.rehydrate({ ...token.snapshot(), rotatedAt: now }));
      return true;
    },
    touchFamily: async (id: string, now: Date): Promise<void> => {
      const family: StoredFamily | undefined = this.families.get(id);
      if (family) this.families.set(id, { ...family, lastUsedAt: now });
    },
    revokeFamily: async (id: string, now: Date, reason: string): Promise<void> => {
      const family: StoredFamily | undefined = this.families.get(id);
      if (family && family.revokedAt === null) {
        this.families.set(id, { ...family, revokedAt: now, reason });
      }
    },
    revokeByGrant: async (grantId: string, now: Date, reason: string): Promise<number> => {
      let revoked: number = 0;
      for (const family of [...this.families.values()]) {
        if (family.grantId === grantId && family.revokedAt === null) {
          await this.tokenRepository.revokeFamily(family.id, now, reason);
          revoked++;
        }
      }
      return revoked;
    },
    deleteExpiredFamilies: async (now: Date): Promise<number> => {
      let deleted: number = 0;
      for (const id of [...this.families.keys()]) {
        const tokens: RefreshToken[] = [...this.tokens.values()].filter(
          (token: RefreshToken): boolean => token.familyId === id,
        );
        if (
          tokens.length > 0 &&
          tokens.every((token: RefreshToken): boolean => token.isExpired(now))
        ) {
          this.families.delete(id);
          for (const token of tokens) this.tokens.delete(token.snapshot().tokenHash);
          deleted++;
        }
      }
      return deleted;
    },
  };
  // #endregion

  // #region Methods
  /**
   * Method run
   * @method run
   *
   * @description
   * Runs work against the maps and restores them when it rejects.
   *
   * @template T - Work result.
   * @param {(repositories: OAuthRepositories) => Promise<T>} work - Repository operations.
   *
   * @returns {Promise<T>} Work result.
   */
  public async run<T>(work: (repositories: OAuthRepositories) => Promise<T>): Promise<T> {
    const saved: [
      Map<string, OAuthClient>,
      Map<string, OAuthGrant>,
      Map<string, AuthorizationRequest>,
      Map<string, AuthorizationCode>,
      Map<string, StoredFamily>,
      Map<string, RefreshToken>,
    ] = [
      new Map(this.clients),
      new Map(this.grants),
      new Map(this.requests),
      new Map(this.codes),
      new Map(this.families),
      new Map(this.tokens),
    ];
    try {
      return await work({
        clients: this.clientRepository,
        grants: this.grantRepository,
        requests: this.requestRepository,
        codes: this.codeRepository,
        tokens: this.tokenRepository,
      });
    } catch (error: unknown) {
      [this.clients, this.grants, this.requests, this.codes, this.families, this.tokens] = saved;
      throw error;
    }
  }
  // #endregion
}

/**
 * Class FakeClientMetadataFetcher
 * @class FakeClientMetadataFetcher
 *
 * @description
 * Serves configured documents and logos and records each fetch.
 */
export class FakeClientMetadataFetcher implements ClientMetadataFetcher {
  // #region Properties
  /** Documents by URL; an `Error` makes the fetch reject. */
  public readonly documents: Map<string, FetchedClientMetadata | Error> = new Map<
    string,
    FetchedClientMetadata | Error
  >();
  /** Logos by URL. */
  public readonly logos: Map<string, string> = new Map<string, string>();
  /** Fetched URLs, in order. */
  public readonly fetched: string[] = [];
  // #endregion

  // #region Methods
  /**
   * Method fetchDocument
   * @method fetchDocument
   *
   * @description
   * Returns the configured document or rejects.
   *
   * @param {string} url - Document URL.
   *
   * @returns {Promise<FetchedClientMetadata>} Document.
   */
  public async fetchDocument(url: string): Promise<FetchedClientMetadata> {
    this.fetched.push(url);
    const found: FetchedClientMetadata | Error | undefined = this.documents.get(url);
    if (found === undefined || found instanceof Error) {
      throw found ?? new Error('Not found.');
    }
    return found;
  }

  /**
   * Method fetchLogo
   * @method fetchLogo
   *
   * @description
   * Returns the configured logo, or `null`.
   *
   * @param {string} url - Logo URL.
   *
   * @returns {Promise<string | null>} Logo.
   */
  public async fetchLogo(url: string): Promise<string | null> {
    this.fetched.push(url);
    return this.logos.get(url) ?? null;
  }
  // #endregion
}

/**
 * Function challengeFor
 *
 * @description
 * PKCE challenge the fake verifier accepts for a verifier: the verifier reversed.
 *
 * @param {string} verifier - Verifier.
 *
 * @returns {string} Matching challenge.
 */
export function challengeFor(verifier: string): string {
  return [...verifier].reverse().join('');
}

/**
 * Constant fakePkce
 *
 * @description
 * PKCE verifier accepting `challengeFor(verifier)`.
 *
 * @type {PkceVerifier}
 */
export const fakePkce: PkceVerifier = {
  matches: (verifier: string, challenge: string): boolean => challengeFor(verifier) === challenge,
};

/**
 * Constant fakeResourceSigner
 *
 * @description
 * Signer returning a readable token listing its claims.
 *
 * @type {ResourceTokenSigner}
 */
export const fakeResourceSigner: ResourceTokenSigner = {
  sign: async (claims: ResourceTokenClaims): Promise<AccessToken> => ({
    token: `at|${claims.accountId}|${claims.clientId}|${claims.scopes.join(' ')}|${claims.resource}`,
    expiresIn: 300,
  }),
};

/**
 * Class SequenceCodec
 * @class SequenceCodec
 *
 * @description
 * Codec generating `secret-<n>` and hashing to `h:<value>`.
 */
export class SequenceCodec implements RefreshTokenCodec {
  // #region Properties
  /** Generated values so far. */
  private count: number = 0;
  // #endregion

  // #region Methods
  /**
   * Method generate
   * @method generate
   *
   * @description
   * Returns the next secret.
   *
   * @returns {string} Secret.
   */
  public generate(): string {
    this.count++;
    return `secret-${this.count}`;
  }

  /**
   * Method hash
   * @method hash
   *
   * @description
   * Prefixes the value.
   *
   * @param {string} value - Secret.
   *
   * @returns {string} Hash.
   */
  public hash(value: string): string {
    return `h:${value}`;
  }
  // #endregion
}
