import type {
  AuthorizationCodeRepository,
  AuthorizationRequestRepository,
  ConnectedApplicationRecord,
  LockedTokenFamily,
  OAuthClientRepository,
  OAuthGrantRepository,
  OAuthRepositories,
  OAuthTokenRepository,
  OAuthUnitOfWork,
} from '@vfortin/identity-application';
import {
  AuthorizationCode,
  AuthorizationRequest,
  OAuthClient,
  OAuthGrant,
  type OAuthClientProps,
  type OAuthScope,
  type OAuthTokenFamily,
  RefreshToken,
  isOAuthScope,
} from '@vfortin/identity-domain';
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  max,
  notExists,
} from 'drizzle-orm';
import type { IdentityDatabase } from '@internal/identity-adapters-out/lib/persistence/database/identity-database';
import {
  oauthAuthorizationCodes,
  oauthAuthorizationRequests,
  oauthClients,
  oauthGrants,
  oauthRefreshTokens,
  oauthTokenFamilies,
} from '@internal/identity-adapters-out/lib/persistence/schema/identity.schema';

/**
 * Function scopesOf
 *
 * @description
 * Reads a stored scope list, keeping only grantable scopes.
 *
 * @param {readonly string[]} stored - `scopes` column.
 *
 * @returns {readonly OAuthScope[]} Scopes.
 */
function scopesOf(stored: readonly string[]): readonly OAuthScope[] {
  return stored.filter((scope: string): scope is OAuthScope => isOAuthScope(scope));
}

/**
 * Function toClient
 *
 * @description
 * Rehydrates a client row.
 *
 * @param {typeof oauthClients.$inferSelect} row - Client row.
 *
 * @returns {OAuthClient} Client.
 */
function toClient(row: typeof oauthClients.$inferSelect): OAuthClient {
  return OAuthClient.rehydrate({
    id: row.id,
    kind: row.kind,
    name: row.name,
    clientUri: row.clientUri,
    logoUri: row.logoUri,
    logo: row.logo,
    logoFetchedAt: row.logoFetchedAt,
    redirectUris: row.redirectUris,
    createdAt: row.createdAt,
    metadataExpiresAt: row.metadataExpiresAt,
  });
}

/**
 * Function toGrant
 *
 * @description
 * Rehydrates a grant row with the last use derived from its families.
 *
 * @param {typeof oauthGrants.$inferSelect} row - Grant row.
 * @param {Date | null} lastUsedAt - Latest family use.
 *
 * @returns {OAuthGrant} Grant.
 */
function toGrant(row: typeof oauthGrants.$inferSelect, lastUsedAt: Date | null): OAuthGrant {
  return OAuthGrant.rehydrate({
    id: row.id,
    accountId: row.accountId,
    clientId: row.clientId,
    scopes: scopesOf(row.scopes),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastUsedAt,
    revokedAt: row.revokedAt,
  });
}

/**
 * Interface ListedGrantRow
 * @interface ListedGrantRow
 *
 * @description
 * Row of the connected-application listing.
 */
interface ListedGrantRow {
  // #region Properties
  readonly grant: typeof oauthGrants.$inferSelect;
  readonly client: typeof oauthClients.$inferSelect;
  readonly lastUsedAt: Date | null;
  // #endregion
}

/**
 * Class DrizzleOAuthClientRepository
 * @class DrizzleOAuthClientRepository
 * @implements OAuthClientRepository
 *
 * @description
 * Persists OAuth clients; a fetched metadata document replaces the stored copy.
 */
export class DrizzleOAuthClientRepository implements OAuthClientRepository {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Binds the repository to a database or transaction.
   *
   * @param {IdentityDatabase} db - Connection used for queries.
   */
  public constructor(private readonly db: IdentityDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method findById
   * @method findById
   *
   * @description
   * Loads a client by identifier.
   *
   * @param {string} id - `client_id`.
   *
   * @returns {Promise<OAuthClient | null>} Client, or `null`.
   */
  public async findById(id: string): Promise<OAuthClient | null> {
    const [row] = await this.db.select().from(oauthClients).where(eq(oauthClients.id, id));
    return row ? toClient(row) : null;
  }

  /**
   * Method save
   * @method save
   *
   * @description
   * Inserts the client, or updates every stored field but its creation time.
   *
   * @param {OAuthClient} client - Client state.
   *
   * @returns {Promise<void>} Completion after the upsert.
   */
  public async save(client: OAuthClient): Promise<void> {
    const state: OAuthClientProps = client.snapshot();
    const values: Omit<typeof oauthClients.$inferInsert, 'id' | 'createdAt'> = {
      kind: state.kind,
      name: state.name,
      clientUri: state.clientUri,
      logoUri: state.logoUri,
      logo: state.logo,
      logoFetchedAt: state.logoFetchedAt,
      redirectUris: [...state.redirectUris],
      // Audit only: the domain carries no update instant.
      updatedAt: new Date(),
      metadataExpiresAt: state.metadataExpiresAt,
    };
    await this.db
      .insert(oauthClients)
      .values({ id: state.id, createdAt: state.createdAt, ...values })
      .onConflictDoUpdate({ target: oauthClients.id, set: values });
  }

  /**
   * Method countDynamicSince
   * @method countDynamicSince
   *
   * @description
   * Counts dynamic registrations created at or after `since`.
   *
   * @param {Date} since - Window start.
   *
   * @returns {Promise<number>} Registrations.
   */
  public async countDynamicSince(since: Date): Promise<number> {
    const [row] = await this.db
      .select({ total: count() })
      .from(oauthClients)
      .where(and(eq(oauthClients.kind, 'dynamic'), gte(oauthClients.createdAt, since)));
    return row?.total ?? 0;
  }

  /**
   * Method deleteAbandonedDynamic
   * @method deleteAbandonedDynamic
   *
   * @description
   * Deletes dynamic registrations older than `before` without any grant (their pending requests and
   * codes go with them, by cascade).
   *
   * @param {Date} before - Creation cutoff.
   *
   * @returns {Promise<number>} Deleted registrations.
   */
  public async deleteAbandonedDynamic(before: Date): Promise<number> {
    const deleted: { id: string }[] = await this.db
      .delete(oauthClients)
      .where(
        and(
          eq(oauthClients.kind, 'dynamic'),
          lt(oauthClients.createdAt, before),
          notExists(
            this.db
              .select({ id: oauthGrants.id })
              .from(oauthGrants)
              .where(eq(oauthGrants.clientId, oauthClients.id)),
          ),
        ),
      )
      .returning({ id: oauthClients.id });
    return deleted.length;
  }
  // #endregion
}

/**
 * Class DrizzleOAuthGrantRepository
 * @class DrizzleOAuthGrantRepository
 * @implements OAuthGrantRepository
 *
 * @description
 * Persists consents; the last use is the latest use of the grant's families.
 */
export class DrizzleOAuthGrantRepository implements OAuthGrantRepository {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Binds the repository to a database or transaction.
   *
   * @param {IdentityDatabase} db - Connection used for queries.
   */
  public constructor(private readonly db: IdentityDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method lockActive
   * @method lockActive
   *
   * @description
   * Selects and locks the active grant of an account to a client.
   *
   * @param {string} accountId - Administrator.
   * @param {string} clientId - Client.
   *
   * @returns {Promise<OAuthGrant | null>} Grant, or `null`.
   */
  public async lockActive(accountId: string, clientId: string): Promise<OAuthGrant | null> {
    const [row] = await this.db
      .select()
      .from(oauthGrants)
      .where(
        and(
          eq(oauthGrants.accountId, accountId),
          eq(oauthGrants.clientId, clientId),
          isNull(oauthGrants.revokedAt),
        ),
      )
      .for('update');
    return row ? toGrant(row, null) : null;
  }

  /**
   * Method findById
   * @method findById
   *
   * @description
   * Reads a grant without a lock.
   *
   * @param {string} id - Grant identifier.
   *
   * @returns {Promise<OAuthGrant | null>} Grant, or `null`.
   */
  public async findById(id: string): Promise<OAuthGrant | null> {
    const [row] = await this.db.select().from(oauthGrants).where(eq(oauthGrants.id, id));
    return row ? toGrant(row, null) : null;
  }

  /**
   * Method lockById
   * @method lockById
   *
   * @description
   * Selects and locks a grant.
   *
   * @param {string} id - Grant identifier.
   *
   * @returns {Promise<OAuthGrant | null>} Grant, or `null`.
   */
  public async lockById(id: string): Promise<OAuthGrant | null> {
    const [row] = await this.db
      .select()
      .from(oauthGrants)
      .where(eq(oauthGrants.id, id))
      .for('update');
    return row ? toGrant(row, null) : null;
  }

  /**
   * Method add
   * @method add
   *
   * @description
   * Inserts a grant.
   *
   * @param {OAuthGrant} grant - Grant state.
   *
   * @returns {Promise<void>} Completion after insertion.
   */
  public async add(grant: OAuthGrant): Promise<void> {
    const state: ReturnType<OAuthGrant['snapshot']> = grant.snapshot();
    await this.db.insert(oauthGrants).values({
      id: state.id,
      accountId: state.accountId,
      clientId: state.clientId,
      scopes: [...state.scopes],
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
      revokedAt: state.revokedAt,
    });
  }

  /**
   * Method save
   * @method save
   *
   * @description
   * Updates the scopes, update and revocation instants.
   *
   * @param {OAuthGrant} grant - Updated state, read under its lock.
   *
   * @returns {Promise<void>} Completion after the update.
   */
  public async save(grant: OAuthGrant): Promise<void> {
    const state: ReturnType<OAuthGrant['snapshot']> = grant.snapshot();
    await this.db
      .update(oauthGrants)
      .set({ scopes: [...state.scopes], updatedAt: state.updatedAt, revokedAt: state.revokedAt })
      .where(eq(oauthGrants.id, state.id));
  }

  /**
   * Method listActive
   * @method listActive
   *
   * @description
   * Lists the active grants of an account with their clients and last use, newest first.
   *
   * @param {string} accountId - Administrator.
   *
   * @returns {Promise<readonly ConnectedApplicationRecord[]>} Connected applications.
   */
  public async listActive(accountId: string): Promise<readonly ConnectedApplicationRecord[]> {
    const rows: ListedGrantRow[] = await this.db
      .select({
        grant: oauthGrants,
        client: oauthClients,
        lastUsedAt: max(oauthTokenFamilies.lastUsedAt),
      })
      .from(oauthGrants)
      .innerJoin(oauthClients, eq(oauthClients.id, oauthGrants.clientId))
      .leftJoin(oauthTokenFamilies, eq(oauthTokenFamilies.grantId, oauthGrants.id))
      .where(and(eq(oauthGrants.accountId, accountId), isNull(oauthGrants.revokedAt)))
      .groupBy(oauthGrants.id, oauthClients.id)
      .orderBy(desc(oauthGrants.createdAt));
    return rows.map((row): ConnectedApplicationRecord => ({
      grant: toGrant(row.grant, row.lastUsedAt),
      client: toClient(row.client),
    }));
  }
  // #endregion
}

/**
 * Class DrizzleAuthorizationRequestRepository
 * @class DrizzleAuthorizationRequestRepository
 * @implements AuthorizationRequestRepository
 *
 * @description
 * Persists pending authorization requests; a row lock serializes their decisions.
 */
export class DrizzleAuthorizationRequestRepository implements AuthorizationRequestRepository {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Binds the repository to a database or transaction.
   *
   * @param {IdentityDatabase} db - Connection used for queries.
   */
  public constructor(private readonly db: IdentityDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method add
   * @method add
   *
   * @description
   * Inserts a pending request.
   *
   * @param {AuthorizationRequest} request - Request state.
   *
   * @returns {Promise<void>} Completion after insertion.
   */
  public async add(request: AuthorizationRequest): Promise<void> {
    const { scopes, ...state } = request.snapshot();
    await this.db.insert(oauthAuthorizationRequests).values({ ...state, scopes: [...scopes] });
  }

  /**
   * Method lockById
   * @method lockById
   *
   * @description
   * Selects and locks a request.
   *
   * @param {string} id - Request identifier.
   *
   * @returns {Promise<AuthorizationRequest | null>} Request, or `null`.
   */
  public async lockById(id: string): Promise<AuthorizationRequest | null> {
    const [row] = await this.db
      .select()
      .from(oauthAuthorizationRequests)
      .where(eq(oauthAuthorizationRequests.id, id))
      .for('update');
    return row ? AuthorizationRequest.rehydrate({ ...row, scopes: scopesOf(row.scopes) }) : null;
  }

  /**
   * Method save
   * @method save
   *
   * @description
   * Records the decision instant.
   *
   * @param {AuthorizationRequest} request - Decided request.
   *
   * @returns {Promise<void>} Completion after the update.
   */
  public async save(request: AuthorizationRequest): Promise<void> {
    await this.db
      .update(oauthAuthorizationRequests)
      .set({ decidedAt: request.values.decidedAt })
      .where(eq(oauthAuthorizationRequests.id, request.values.id));
  }

  /**
   * Method deleteExpired
   * @method deleteExpired
   *
   * @description
   * Deletes the requests expired at `now`.
   *
   * @param {Date} now - Expiry cutoff.
   *
   * @returns {Promise<number>} Deleted rows.
   */
  public async deleteExpired(now: Date): Promise<number> {
    const deleted: { id: string }[] = await this.db
      .delete(oauthAuthorizationRequests)
      .where(lte(oauthAuthorizationRequests.expiresAt, now))
      .returning({ id: oauthAuthorizationRequests.id });
    return deleted.length;
  }
  // #endregion
}

/**
 * Class DrizzleAuthorizationCodeRepository
 * @class DrizzleAuthorizationCodeRepository
 * @implements AuthorizationCodeRepository
 *
 * @description
 * Persists hashed authorization codes; a row lock serializes redemptions and consumption is a
 * conditional update.
 */
export class DrizzleAuthorizationCodeRepository implements AuthorizationCodeRepository {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Binds the repository to a database or transaction.
   *
   * @param {IdentityDatabase} db - Connection used for queries.
   */
  public constructor(private readonly db: IdentityDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method add
   * @method add
   *
   * @description
   * Inserts an issued code.
   *
   * @param {AuthorizationCode} code - Code state (hash only).
   *
   * @returns {Promise<void>} Completion after insertion.
   */
  public async add(code: AuthorizationCode): Promise<void> {
    const { scopes, ...state } = code.snapshot();
    await this.db.insert(oauthAuthorizationCodes).values({ ...state, scopes: [...scopes] });
  }

  /**
   * Method lockByHash
   * @method lockByHash
   *
   * @description
   * Selects and locks a code by hash.
   *
   * @param {string} codeHash - Hash of the presented code.
   *
   * @returns {Promise<AuthorizationCode | null>} Code, or `null`.
   */
  public async lockByHash(codeHash: string): Promise<AuthorizationCode | null> {
    const [row] = await this.db
      .select()
      .from(oauthAuthorizationCodes)
      .where(eq(oauthAuthorizationCodes.codeHash, codeHash))
      .for('update');
    return row ? AuthorizationCode.rehydrate({ ...row, scopes: scopesOf(row.scopes) }) : null;
  }

  /**
   * Method consume
   * @method consume
   *
   * @description
   * Marks the code consumed only while unused, in one conditional update.
   *
   * @param {string} id - Code identifier.
   * @param {string} familyId - Family opened.
   * @param {Date} now - Redemption instant.
   *
   * @returns {Promise<boolean>} Whether exactly one unused code was marked.
   */
  public async consume(id: string, familyId: string, now: Date): Promise<boolean> {
    const updated: { id: string }[] = await this.db
      .update(oauthAuthorizationCodes)
      .set({ consumedAt: now, familyId })
      .where(and(eq(oauthAuthorizationCodes.id, id), isNull(oauthAuthorizationCodes.consumedAt)))
      .returning({ id: oauthAuthorizationCodes.id });
    return updated.length === 1;
  }

  /**
   * Method deleteExpired
   * @method deleteExpired
   *
   * @description
   * Deletes the codes whose expiry is at or before `cutoff`.
   *
   * @param {Date} cutoff - Expiry cutoff.
   *
   * @returns {Promise<number>} Deleted rows.
   */
  public async deleteExpired(cutoff: Date): Promise<number> {
    const deleted: { id: string }[] = await this.db
      .delete(oauthAuthorizationCodes)
      .where(lte(oauthAuthorizationCodes.expiresAt, cutoff))
      .returning({ id: oauthAuthorizationCodes.id });
    return deleted.length;
  }
  // #endregion
}

/**
 * Class DrizzleOAuthTokenRepository
 * @class DrizzleOAuthTokenRepository
 * @implements OAuthTokenRepository
 *
 * @description
 * Persists MCP refresh tokens and families with the conditional rotation and family revocation of
 * `DrizzleRefreshTokenRepository` (D27), on their own tables.
 */
export class DrizzleOAuthTokenRepository implements OAuthTokenRepository {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Binds the repository to a database or transaction.
   *
   * @param {IdentityDatabase} db - Connection used for queries.
   */
  public constructor(private readonly db: IdentityDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method addFamily
   * @method addFamily
   *
   * @description
   * Inserts a family, used at its creation.
   *
   * @param {OAuthTokenFamily} family - New family.
   *
   * @returns {Promise<void>} Completion after insertion.
   */
  public async addFamily(family: OAuthTokenFamily): Promise<void> {
    await this.db.insert(oauthTokenFamilies).values({
      id: family.id,
      grantId: family.grantId,
      accountId: family.accountId,
      clientId: family.clientId,
      resource: family.resource,
      scopes: [...family.scopes],
      createdAt: family.createdAt,
      lastUsedAt: family.createdAt,
    });
  }

  /**
   * Method lockFamily
   * @method lockFamily
   *
   * @description
   * Selects and locks a family.
   *
   * @param {string} id - Family identifier.
   *
   * @returns {Promise<LockedTokenFamily | null>} Family, or `null`.
   */
  public async lockFamily(id: string): Promise<LockedTokenFamily | null> {
    const [row] = await this.db
      .select()
      .from(oauthTokenFamilies)
      .where(eq(oauthTokenFamilies.id, id))
      .for('update');
    if (row === undefined) {
      return null;
    }
    return {
      id: row.id,
      grantId: row.grantId,
      accountId: row.accountId,
      clientId: row.clientId,
      resource: row.resource,
      scopes: scopesOf(row.scopes),
      createdAt: row.createdAt,
      persistent: true,
      revokedAt: row.revokedAt,
    };
  }

  /**
   * Method add
   * @method add
   *
   * @description
   * Inserts a refresh token (hash only).
   *
   * @param {RefreshToken} token - Token state.
   *
   * @returns {Promise<void>} Completion after insertion.
   */
  public async add(token: RefreshToken): Promise<void> {
    await this.db.insert(oauthRefreshTokens).values(token.snapshot());
  }

  /**
   * Method findByHash
   * @method findByHash
   *
   * @description
   * Loads a token and projects its family's revocation onto it.
   *
   * @param {string} tokenHash - Hash of the presented token.
   *
   * @returns {Promise<RefreshToken | null>} Token, or `null`.
   */
  public async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    const [row] = await this.db
      .select({
        id: oauthRefreshTokens.id,
        familyId: oauthRefreshTokens.familyId,
        accountId: oauthRefreshTokens.accountId,
        tokenHash: oauthRefreshTokens.tokenHash,
        expiresAt: oauthRefreshTokens.expiresAt,
        rotatedAt: oauthRefreshTokens.rotatedAt,
        revokedAt: oauthRefreshTokens.revokedAt,
        familyRevokedAt: oauthTokenFamilies.revokedAt,
      })
      .from(oauthRefreshTokens)
      .innerJoin(oauthTokenFamilies, eq(oauthTokenFamilies.id, oauthRefreshTokens.familyId))
      .where(eq(oauthRefreshTokens.tokenHash, tokenHash));
    if (row === undefined) {
      return null;
    }
    const { familyRevokedAt, ...token } = row;
    return RefreshToken.rehydrate({ ...token, revokedAt: token.revokedAt ?? familyRevokedAt });
  }

  /**
   * Method markRotated
   * @method markRotated
   *
   * @description
   * One conditional update: only an unspent token of an unrevoked family rotates.
   *
   * @param {string} tokenHash - Token hash.
   * @param {Date} now - Rotation instant.
   *
   * @returns {Promise<boolean>} Whether exactly one token was marked.
   */
  public async markRotated(tokenHash: string, now: Date): Promise<boolean> {
    const updated: { id: string }[] = await this.db
      .update(oauthRefreshTokens)
      .set({ rotatedAt: now })
      .where(
        and(
          eq(oauthRefreshTokens.tokenHash, tokenHash),
          isNull(oauthRefreshTokens.rotatedAt),
          isNull(oauthRefreshTokens.revokedAt),
          notExists(
            this.db
              .select({ id: oauthTokenFamilies.id })
              .from(oauthTokenFamilies)
              .where(
                and(
                  eq(oauthTokenFamilies.id, oauthRefreshTokens.familyId),
                  isNotNull(oauthTokenFamilies.revokedAt),
                ),
              ),
          ),
        ),
      )
      .returning({ id: oauthRefreshTokens.id });
    return updated.length === 1;
  }

  /**
   * Method touchFamily
   * @method touchFamily
   *
   * @description
   * Records the latest use of a family.
   *
   * @param {string} id - Family identifier.
   * @param {Date} now - Use instant.
   *
   * @returns {Promise<void>} Completion after the update.
   */
  public async touchFamily(id: string, now: Date): Promise<void> {
    await this.db
      .update(oauthTokenFamilies)
      .set({ lastUsedAt: now })
      .where(eq(oauthTokenFamilies.id, id));
  }

  /**
   * Method revokeFamily
   * @method revokeFamily
   *
   * @description
   * Revokes the family (keeping the first reason) and its unrevoked tokens.
   *
   * @param {string} id - Family identifier.
   * @param {Date} now - Revocation instant.
   * @param {string} reason - Revocation reason.
   *
   * @returns {Promise<void>} Completion after both updates.
   */
  public async revokeFamily(id: string, now: Date, reason: string): Promise<void> {
    await this.db
      .update(oauthTokenFamilies)
      .set({ revokedAt: now, revokedReason: reason })
      .where(and(eq(oauthTokenFamilies.id, id), isNull(oauthTokenFamilies.revokedAt)));
    await this.db
      .update(oauthRefreshTokens)
      .set({ revokedAt: now })
      .where(and(eq(oauthRefreshTokens.familyId, id), isNull(oauthRefreshTokens.revokedAt)));
  }

  /**
   * Method revokeByGrant
   * @method revokeByGrant
   *
   * @description
   * Revokes the active families of a grant, then their tokens.
   *
   * @param {string} grantId - Grant identifier.
   * @param {Date} now - Revocation instant.
   * @param {string} reason - Revocation reason.
   *
   * @returns {Promise<number>} Revoked families.
   */
  public async revokeByGrant(grantId: string, now: Date, reason: string): Promise<number> {
    const revoked: { id: string }[] = await this.db
      .update(oauthTokenFamilies)
      .set({ revokedAt: now, revokedReason: reason })
      .where(and(eq(oauthTokenFamilies.grantId, grantId), isNull(oauthTokenFamilies.revokedAt)))
      .returning({ id: oauthTokenFamilies.id });
    if (revoked.length > 0) {
      await this.db
        .update(oauthRefreshTokens)
        .set({ revokedAt: now })
        .where(
          and(
            inArray(
              oauthRefreshTokens.familyId,
              revoked.map((family: { id: string }): string => family.id),
            ),
            isNull(oauthRefreshTokens.revokedAt),
          ),
        );
    }
    return revoked.length;
  }

  /**
   * Method deleteExpiredFamilies
   * @method deleteExpiredFamilies
   *
   * @description
   * Deletes the families whose latest token expired by `now` (tokens by cascade).
   *
   * @param {Date} now - Expiry cutoff.
   *
   * @returns {Promise<number>} Deleted families.
   */
  public async deleteExpiredFamilies(now: Date): Promise<number> {
    const deleted: { id: string }[] = await this.db
      .delete(oauthTokenFamilies)
      .where(
        inArray(
          oauthTokenFamilies.id,
          this.db
            .select({ id: oauthRefreshTokens.familyId })
            .from(oauthRefreshTokens)
            .groupBy(oauthRefreshTokens.familyId)
            .having(lte(max(oauthRefreshTokens.expiresAt), now)),
        ),
      )
      .returning({ id: oauthTokenFamilies.id });
    return deleted.length;
  }
  // #endregion
}

/**
 * Class DrizzleOAuthUnitOfWork
 * @class DrizzleOAuthUnitOfWork
 * @implements OAuthUnitOfWork
 *
 * @description
 * Runs authorization-server work in one PostgreSQL transaction; row locks last until it completes.
 */
export class DrizzleOAuthUnitOfWork implements OAuthUnitOfWork {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores the connection that starts each transaction.
   *
   * @param {IdentityDatabase} db - Drizzle database.
   */
  public constructor(private readonly db: IdentityDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method run
   * @method run
   *
   * @description
   * Runs the work with repositories bound to the transaction handle.
   *
   * @template T - Work result.
   * @param {(repositories: OAuthRepositories) => Promise<T>} work - Repository work.
   *
   * @returns {Promise<T>} Result after commit; rejects and rolls back when the work rejects.
   */
  public run<T>(work: (repositories: OAuthRepositories) => Promise<T>): Promise<T> {
    return this.db.transaction((tx): Promise<T> =>
      work({
        clients: new DrizzleOAuthClientRepository(tx),
        grants: new DrizzleOAuthGrantRepository(tx),
        requests: new DrizzleAuthorizationRequestRepository(tx),
        codes: new DrizzleAuthorizationCodeRepository(tx),
        tokens: new DrizzleOAuthTokenRepository(tx),
      }),
    );
  }
  // #endregion
}
