import type {
  AdminAccountRepository,
  IdentityRepositories,
  IdentityUnitOfWork,
  LoginChallengeRepository,
  RefreshTokenRepository,
  TrustedDeviceRepository,
} from '@vfortin/identity-application';
import {
  AdminAccount,
  LoginChallenge,
  RefreshToken,
  type SessionFamily,
  TrustedDevice,
  type AdminAccountProps,
  type LoginChallengeProps,
  type TrustedDeviceProps,
} from '@vfortin/identity-domain';
import {
  and,
  count,
  eq,
  getTableColumns,
  inArray,
  isNotNull,
  isNull,
  lte,
  max,
  notExists,
} from 'drizzle-orm';
import type { IdentityDatabase } from '@internal/identity-adapters-out/lib/persistence/database/identity-database';
import {
  adminAccounts,
  loginChallenges,
  refreshTokenFamilies,
  refreshTokens,
  trustedDevices,
} from '@internal/identity-adapters-out/lib/persistence/schema/identity.schema';

/**
 * Class DrizzleAdminAccountRepository
 * @class DrizzleAdminAccountRepository
 * @implements AdminAccountRepository
 *
 * @description
 * Persists administrator credential state with Drizzle and acquires a row lock for serialized sign-in attempts.
 */
export class DrizzleAdminAccountRepository implements AdminAccountRepository {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Binds repository operations to the transaction-aware identity database instance.
   *
   * @param {IdentityDatabase} db - Database or transaction connection used for queries.
   */
  public constructor(private readonly db: IdentityDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method count
   * @method count
   *
   * @description
   * Counts administrator records for bootstrap checks.
   *
   * @returns {Promise<number>} Number of stored accounts.
   */
  public async count(): Promise<number> {
    const [row] = await this.db.select({ total: count() }).from(adminAccounts);
    return row?.total ?? 0;
  }

  /**
   * Method findById
   * @method findById
   *
   * @description
   * Loads account state by identifier and rehydrates the domain entity when present.
   *
   * @param {string} id - Account identifier.
   *
   * @returns {Promise<AdminAccount | null>} Rehydrated account, or `null` when absent.
   */
  public async findById(id: string): Promise<AdminAccount | null> {
    const [row] = await this.db.select().from(adminAccounts).where(eq(adminAccounts.id, id));
    return row ? AdminAccount.rehydrate(row) : null;
  }

  /**
   * Method lockByEmail
   * @method lockByEmail
   *
   * @description
   * Selects and locks the matching account row until transaction completion to serialize authentication state updates.
   *
   * @param {string} email - Normalized email address.
   *
   * @returns {Promise<AdminAccount | null>} Locked rehydrated account, or `null` when absent.
   */
  public async lockByEmail(email: string): Promise<AdminAccount | null> {
    const [row] = await this.db
      .select()
      .from(adminAccounts)
      .where(eq(adminAccounts.email, email))
      .for('update');
    return row ? AdminAccount.rehydrate(row) : null;
  }

  /**
   * Method lockById
   * @method lockById
   *
   * @description
   * Selects and locks the account row by identifier until transaction completion, like `lockByEmail`.
   *
   * @param {string} id - Account identifier.
   *
   * @returns {Promise<AdminAccount | null>} Locked rehydrated account, or `null` when absent.
   */
  public async lockById(id: string): Promise<AdminAccount | null> {
    const [row] = await this.db
      .select()
      .from(adminAccounts)
      .where(eq(adminAccounts.id, id))
      .for('update');
    return row ? AdminAccount.rehydrate(row) : null;
  }

  /**
   * Method add
   * @method add
   *
   * @description
   * Inserts the snapshot of a newly bootstrapped account.
   *
   * @param {AdminAccount} account - Domain state to persist.
   *
   * @returns {Promise<void>} Completion after insertion.
   */
  public async add(account: AdminAccount): Promise<void> {
    await this.db.insert(adminAccounts).values(account.snapshot());
  }

  /**
   * Method save
   * @method save
   *
   * @description
   * Updates password verifier, sign-in and second-factor state without rewriting the account's stable email.
   *
   * @param {AdminAccount} account - Updated domain state.
   *
   * @returns {Promise<void>} Completion after update.
   */
  public async save(account: AdminAccount): Promise<void> {
    const state: AdminAccountProps = account.snapshot();
    await this.db
      .update(adminAccounts)
      .set({
        passwordHash: state.passwordHash,
        totpSecret: state.totpSecret,
        pendingTotpSecret: state.pendingTotpSecret,
        lastTotpStep: state.lastTotpStep,
        failedAttempts: state.failedAttempts,
        lockedUntil: state.lockedUntil,
      })
      .where(eq(adminAccounts.id, state.id));
  }
  // #endregion
}

/**
 * Class DrizzleRefreshTokenRepository
 * @class DrizzleRefreshTokenRepository
 * @implements RefreshTokenRepository
 *
 * @description
 * Persists refresh tokens and session families with conditional rotation and family-level locking and revocation.
 */
export class DrizzleRefreshTokenRepository implements RefreshTokenRepository {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Binds token operations to the transaction-aware identity database instance.
   *
   * @param {IdentityDatabase} db - Database or transaction connection used for queries.
   */
  public constructor(private readonly db: IdentityDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method addFamily
   * @method addFamily
   *
   * @description
   * Inserts the family row that scopes a login session's refresh tokens.
   *
   * @param {SessionFamily} family - New session family.
   *
   * @returns {Promise<void>} Completion after insertion.
   */
  public async addFamily(family: SessionFamily): Promise<void> {
    await this.db.insert(refreshTokenFamilies).values({
      id: family.id,
      accountId: family.accountId,
      createdAt: family.createdAt,
      persistent: family.persistent,
    });
  }

  /**
   * Method lockFamily
   * @method lockFamily
   *
   * @description
   * Acquires a row lock held until transaction completion to serialize family rotation and revocation.
   *
   * @param {string} familyId - Session family to lock.
   *
   * @returns {Promise<SessionFamily | null>} Locked family, or `null` when absent.
   */
  public async lockFamily(familyId: string): Promise<SessionFamily | null> {
    const [row] = await this.db
      .select({
        id: refreshTokenFamilies.id,
        accountId: refreshTokenFamilies.accountId,
        createdAt: refreshTokenFamilies.createdAt,
        persistent: refreshTokenFamilies.persistent,
      })
      .from(refreshTokenFamilies)
      .where(eq(refreshTokenFamilies.id, familyId))
      .for('update');
    return row ?? null;
  }

  /**
   * Method add
   * @method add
   *
   * @description
   * Inserts the refresh-token snapshot, which contains the hash rather than the bearer value.
   *
   * @param {RefreshToken} token - Domain token state to persist.
   *
   * @returns {Promise<void>} Completion after insertion.
   */
  public async add(token: RefreshToken): Promise<void> {
    await this.db.insert(refreshTokens).values(token.snapshot());
  }

  /**
   * Method findByHash
   * @method findByHash
   *
   * @description
   * Loads token and family state by hash, then projects family revocation onto the rehydrated token.
   *
   * @param {string} tokenHash - Persisted lookup hash.
   *
   * @returns {Promise<RefreshToken | null>} Rehydrated token, or `null` when absent.
   */
  public async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    const [row] = await this.db
      .select({
        ...getTableColumns(refreshTokens),
        familyRevokedAt: refreshTokenFamilies.revokedAt,
      })
      .from(refreshTokens)
      .innerJoin(refreshTokenFamilies, eq(refreshTokenFamilies.id, refreshTokens.familyId))
      .where(eq(refreshTokens.tokenHash, tokenHash));
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
   * Performs one conditional update so only an unspent token in an active family can rotate successfully.
   *
   * @param {string} tokenHash - Hash identifying the token.
   * @param {Date} now - Rotation instant.
   *
   * @returns {Promise<boolean>} Whether exactly one eligible token was updated.
   */
  public async markRotated(tokenHash: string, now: Date): Promise<boolean> {
    // A single conditional update: two uses of the same token cannot both succeed.
    const updated: { id: string }[] = await this.db
      .update(refreshTokens)
      .set({ rotatedAt: now })
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.rotatedAt),
          isNull(refreshTokens.revokedAt),
          notExists(
            this.db
              .select({ id: refreshTokenFamilies.id })
              .from(refreshTokenFamilies)
              .where(
                and(
                  eq(refreshTokenFamilies.id, refreshTokens.familyId),
                  isNotNull(refreshTokenFamilies.revokedAt),
                ),
              ),
          ),
        ),
      )
      .returning({ id: refreshTokens.id });
    return updated.length === 1;
  }

  /**
   * Method revokeFamily
   * @method revokeFamily
   *
   * @description
   * Marks the family and each existing unrevoked token as revoked at the same instant.
   *
   * @param {string} familyId - Session family identifier.
   * @param {Date} now - Revocation instant.
   *
   * @returns {Promise<void>} Completion after both updates.
   */
  public async revokeFamily(familyId: string, now: Date): Promise<void> {
    await this.db
      .update(refreshTokenFamilies)
      .set({ revokedAt: now })
      .where(and(eq(refreshTokenFamilies.id, familyId), isNull(refreshTokenFamilies.revokedAt)));
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: now })
      .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)));
  }

  /**
   * Method deleteExpiredFamilies
   * @method deleteExpiredFamilies
   *
   * @description
   * Deletes families whose latest token expires by `now`; token rows are removed by the foreign-key cascade.
   *
   * @param {Date} now - Expiry cutoff.
   *
   * @returns {Promise<number>} Number of deleted family rows.
   */
  public async deleteExpiredFamilies(now: Date): Promise<number> {
    // A family dies with its most recent token; its tokens go with it (cascade).
    const deleted: { id: string }[] = await this.db
      .delete(refreshTokenFamilies)
      .where(
        inArray(
          refreshTokenFamilies.id,
          this.db
            .select({ id: refreshTokens.familyId })
            .from(refreshTokens)
            .groupBy(refreshTokens.familyId)
            .having(lte(max(refreshTokens.expiresAt), now)),
        ),
      )
      .returning({ id: refreshTokenFamilies.id });
    return deleted.length;
  }
  // #endregion
}

/**
 * Class DrizzleLoginChallengeRepository
 * @class DrizzleLoginChallengeRepository
 * @implements LoginChallengeRepository
 *
 * @description
 * Persists login challenges with Drizzle; a row lock serializes the submissions of one challenge and
 * consumption is a conditional update.
 */
export class DrizzleLoginChallengeRepository implements LoginChallengeRepository {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Binds challenge operations to the transaction-aware identity database instance.
   *
   * @param {IdentityDatabase} db - Database or transaction connection used for queries.
   */
  public constructor(private readonly db: IdentityDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method add
   * @method add
   *
   * @description
   * Inserts the challenge snapshot, which contains the hash rather than the bearer value.
   *
   * @param {LoginChallenge} challenge - Domain challenge state to persist.
   *
   * @returns {Promise<void>} Completion after insertion.
   */
  public async add(challenge: LoginChallenge): Promise<void> {
    await this.db.insert(loginChallenges).values(challenge.snapshot());
  }

  /**
   * Method lockByHash
   * @method lockByHash
   *
   * @description
   * Selects and locks the challenge row until transaction completion.
   *
   * @param {string} tokenHash - Persisted lookup hash.
   *
   * @returns {Promise<LoginChallenge | null>} Locked rehydrated challenge, or `null` when absent.
   */
  public async lockByHash(tokenHash: string): Promise<LoginChallenge | null> {
    const [row] = await this.db
      .select()
      .from(loginChallenges)
      .where(eq(loginChallenges.tokenHash, tokenHash))
      .for('update');
    return row ? LoginChallenge.rehydrate(row) : null;
  }

  /**
   * Method save
   * @method save
   *
   * @description
   * Updates the attempt counter; consumption only goes through `consume`.
   *
   * @param {LoginChallenge} challenge - Updated domain state.
   *
   * @returns {Promise<void>} Completion after update.
   */
  public async save(challenge: LoginChallenge): Promise<void> {
    const state: LoginChallengeProps = challenge.snapshot();
    await this.db
      .update(loginChallenges)
      .set({ attempts: state.attempts })
      .where(eq(loginChallenges.id, state.id));
  }

  /**
   * Method consume
   * @method consume
   *
   * @description
   * Performs one conditional update so a challenge can only be consumed once, even without the row lock.
   *
   * @param {string} id - Challenge identifier.
   * @param {Date} now - Consumption instant.
   *
   * @returns {Promise<boolean>} Whether exactly one unused challenge was updated.
   */
  public async consume(id: string, now: Date): Promise<boolean> {
    const updated: { id: string }[] = await this.db
      .update(loginChallenges)
      .set({ consumedAt: now })
      .where(and(eq(loginChallenges.id, id), isNull(loginChallenges.consumedAt)))
      .returning({ id: loginChallenges.id });
    return updated.length === 1;
  }

  /**
   * Method deleteExpired
   * @method deleteExpired
   *
   * @description
   * Deletes the challenges whose expiry is at or before `now`, consumed or not.
   *
   * @param {Date} now - Expiry cutoff.
   *
   * @returns {Promise<number>} Number of deleted rows.
   */
  public async deleteExpired(now: Date): Promise<number> {
    const deleted: { id: string }[] = await this.db
      .delete(loginChallenges)
      .where(lte(loginChallenges.expiresAt, now))
      .returning({ id: loginChallenges.id });
    return deleted.length;
  }
  // #endregion
}

/**
 * Class DrizzleTrustedDeviceRepository
 * @class DrizzleTrustedDeviceRepository
 * @implements TrustedDeviceRepository
 *
 * @description
 * Persists trusted devices with Drizzle, looked up by the hash of their cookie token.
 */
export class DrizzleTrustedDeviceRepository implements TrustedDeviceRepository {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Binds device operations to the transaction-aware identity database instance.
   *
   * @param {IdentityDatabase} db - Database or transaction connection used for queries.
   */
  public constructor(private readonly db: IdentityDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method add
   * @method add
   *
   * @description
   * Inserts the device snapshot, which contains the hash rather than the bearer value.
   *
   * @param {TrustedDevice} device - Domain device state to persist.
   *
   * @returns {Promise<void>} Completion after insertion.
   */
  public async add(device: TrustedDevice): Promise<void> {
    await this.db.insert(trustedDevices).values(device.snapshot());
  }

  /**
   * Method findByHash
   * @method findByHash
   *
   * @description
   * Loads the device by hash and rehydrates it, whatever its account, expiry or revocation.
   *
   * @param {string} tokenHash - Persisted lookup hash.
   *
   * @returns {Promise<TrustedDevice | null>} Rehydrated device, or `null` when absent.
   */
  public async findByHash(tokenHash: string): Promise<TrustedDevice | null> {
    const [row] = await this.db
      .select()
      .from(trustedDevices)
      .where(eq(trustedDevices.tokenHash, tokenHash));
    return row ? TrustedDevice.rehydrate(row) : null;
  }

  /**
   * Method save
   * @method save
   *
   * @description
   * Updates the last use and revocation of the device; its expiry never moves.
   *
   * @param {TrustedDevice} device - Updated domain state.
   *
   * @returns {Promise<void>} Completion after update.
   */
  public async save(device: TrustedDevice): Promise<void> {
    const state: TrustedDeviceProps = device.snapshot();
    await this.db
      .update(trustedDevices)
      .set({ lastUsedAt: state.lastUsedAt, revokedAt: state.revokedAt })
      .where(eq(trustedDevices.id, state.id));
  }

  /**
   * Method deleteByAccount
   * @method deleteByAccount
   *
   * @description
   * Deletes every device of the account, expired, revoked or not.
   *
   * @param {string} accountId - Owning account.
   *
   * @returns {Promise<number>} Number of deleted rows.
   */
  public async deleteByAccount(accountId: string): Promise<number> {
    const deleted: { id: string }[] = await this.db
      .delete(trustedDevices)
      .where(eq(trustedDevices.accountId, accountId))
      .returning({ id: trustedDevices.id });
    return deleted.length;
  }

  /**
   * Method deleteExpired
   * @method deleteExpired
   *
   * @description
   * Deletes the devices whose expiry is at or before `now`.
   *
   * @param {Date} now - Expiry cutoff.
   *
   * @returns {Promise<number>} Number of deleted rows.
   */
  public async deleteExpired(now: Date): Promise<number> {
    const deleted: { id: string }[] = await this.db
      .delete(trustedDevices)
      .where(lte(trustedDevices.expiresAt, now))
      .returning({ id: trustedDevices.id });
    return deleted.length;
  }
  // #endregion
}

/**
 * Class DrizzleIdentityUnitOfWork
 * @class DrizzleIdentityUnitOfWork
 * @implements IdentityUnitOfWork
 *
 * @description
 * Runs identity repository work in a PostgreSQL transaction; repository row locks remain held until the transaction completes.
 */
export class DrizzleIdentityUnitOfWork implements IdentityUnitOfWork {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores the identity database connection used to start each transaction.
   *
   * @param {IdentityDatabase} db - Drizzle database instance.
   */
  public constructor(private readonly db: IdentityDatabase) {}
  // #endregion

  // #region Methods
  /**
   * Method run
   * @method run
   *
   * @description
   * Runs the callback in a Drizzle transaction and supplies repositories bound to its transaction handle.
   *
   * @template T - Callback result type.
   * @param {(repositories: IdentityRepositories) => Promise<T>} work - Asynchronous repository work to commit atomically.
   *
   * @returns {Promise<T>} Callback result after transaction completion; rejects when the callback or transaction rejects.
   */
  public run<T>(work: (repositories: IdentityRepositories) => Promise<T>): Promise<T> {
    return this.db.transaction((tx): Promise<T> =>
      work({
        accounts: new DrizzleAdminAccountRepository(tx),
        tokens: new DrizzleRefreshTokenRepository(tx),
        challenges: new DrizzleLoginChallengeRepository(tx),
        devices: new DrizzleTrustedDeviceRepository(tx),
      }),
    );
  }
  // #endregion
}
