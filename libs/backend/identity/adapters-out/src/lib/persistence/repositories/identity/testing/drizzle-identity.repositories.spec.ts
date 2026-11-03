import {
  ChallengeExpiredError,
  InvalidCredentialsError,
  InvalidSessionError,
  Login,
  Logout,
  type PasswordHasher,
  RefreshSession,
  type Session,
  type SessionServices,
  type TotpVerifier,
  VerifyLoginCode,
  type LoginResult,
  type VerifiedLogin,
} from '@vfortin/identity-application';
import {
  AdminAccount,
  LoginChallenge,
  RefreshToken,
  type SessionFamily,
  TrustedDevice,
} from '@vfortin/identity-domain';
import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import { Sha256RefreshTokenCodec } from '@internal/identity-adapters-out/lib/crypto/crypto.adapters';
import {
  DrizzleAdminAccountRepository,
  DrizzleIdentityUnitOfWork,
  DrizzleLoginChallengeRepository,
  DrizzleRefreshTokenRepository,
  DrizzleTrustedDeviceRepository,
} from '@internal/identity-adapters-out/lib/persistence/repositories/identity/drizzle-identity.repositories';
import {
  type IdentityDatabaseHandle,
  migrateIdentityDatabase,
  openIdentityDatabase,
} from '@internal/identity-adapters-out/lib/persistence/database/identity-database';
import {
  loginChallenges,
  refreshTokenFamilies,
  trustedDevices,
} from '@internal/identity-adapters-out/lib/persistence/schema/identity.schema';

/**
 * Constant MIGRATIONS
 *
 * @description
 * Absolute path to the identity service migrations used to prepare each persistence target.
 *
 * @type {string}
 */
const MIGRATIONS: string = fileURLToPath(
  new URL('../../../../../../../../../../apps/identity-service/migrations', import.meta.url),
);

/**
 * Constant DAY
 *
 * @description
 * Milliseconds in one day for token expiry test boundaries.
 *
 * @type {number}
 */
const DAY: number = 24 * 3600_000;

/**
 * Constant now
 *
 * @description
 * Fixed timestamp shared by persistence and concurrency specifications.
 *
 * @type {Date}
 */
const now: Date = new Date('2026-11-02T10:00:00Z');

/*
 * PGlite always; a real Postgres too when TEST_DATABASE_URL is set (row locks only block across
 * connections there: PGlite has a single one and runs transactions one after the other).
 */

/**
 * Constant TARGETS
 *
 * @description
 * Always runs against in-memory PGlite and adds a real PostgreSQL target when the test connection is configured.
 *
 * @type {[string, string][]}
 */
const TARGETS: [string, string][] = [
  ['PGlite', 'pglite:memory'],
  ...(process.env['TEST_DATABASE_URL']
    ? [['Postgres', process.env['TEST_DATABASE_URL']] as [string, string]]
    : []),
];

/**
 * Function openMigrated
 *
 * @description
 * Opens a database target, clears the identity schema on external PostgreSQL targets, then applies the service migrations.
 *
 * @param {string} url - PGlite or PostgreSQL connection URL.
 *
 * @returns {Promise<IdentityDatabaseHandle>} Migrated database handle.
 */
async function openMigrated(url: string): Promise<IdentityDatabaseHandle> {
  const handle: IdentityDatabaseHandle = await openIdentityDatabase(url);
  if (!url.startsWith('pglite:')) {
    await handle.db.execute(sql`drop schema if exists identity cascade`);
  }
  await migrateIdentityDatabase(handle, MIGRATIONS);
  return handle;
}

// Slow enough for parallel attempts to overlap on Postgres.

/**
 * Constant hasher
 *
 * @description
 * Deterministic password adapter that delays verification so concurrent PostgreSQL sign-in requests can overlap.
 *
 * @type {PasswordHasher}
 */
const hasher: PasswordHasher = {
  hash: async (password: string): Promise<string> => `h:${password}`,
  verify: async (password: string, hash: string): Promise<boolean> => {
    await new Promise((resolve: (value: unknown) => void): NodeJS.Timeout =>
      setTimeout(resolve, 20),
    );
    return hash === `h:${password}`;
  },
};

/**
 * Constant totp
 *
 * @description
 * Test verifier that accepts six-digit codes and uses their numeric value as the replay step.
 *
 * @type {TotpVerifier}
 */
const totp: TotpVerifier = {
  generateSecret: (): string => 'SECRET',
  provisioningUri: (): string => 'otpauth://',
  verify: (_secret: string, code: string): number | null =>
    /^\d{6}$/.test(code) ? Number(code) : null,
};

describe.each(TARGETS)('Identity persistence (%s)', (_target: string, url: string): void => {
  /**
   * Variable handle
   *
   * @description
   * Open migrated database handle for the current target case.
   *
   * @type {IdentityDatabaseHandle}
   */
  let handle: IdentityDatabaseHandle;

  /**
   * Variable accounts
   *
   * @description
   * Drizzle account repository bound to the current target's handle.
   *
   * @type {DrizzleAdminAccountRepository}
   */
  let accounts: DrizzleAdminAccountRepository;

  /**
   * Variable tokens
   *
   * @description
   * Drizzle refresh-token repository bound to the current target's handle.
   *
   * @type {DrizzleRefreshTokenRepository}
   */
  let tokens: DrizzleRefreshTokenRepository;

  /**
   * Variable challenges
   *
   * @description
   * Drizzle login-challenge repository bound to the current target's handle.
   *
   * @type {DrizzleLoginChallengeRepository}
   */
  let challenges: DrizzleLoginChallengeRepository;

  /**
   * Variable devices
   *
   * @description
   * Drizzle trusted-device repository bound to the current target's handle.
   *
   * @type {DrizzleTrustedDeviceRepository}
   */
  let devices: DrizzleTrustedDeviceRepository;

  /**
   * Constant codec
   *
   * @description
   * Refresh-token codec used to derive persisted hashes for fixture credentials.
   *
   * @type {Sha256RefreshTokenCodec}
   */
  const codec: Sha256RefreshTokenCodec = new Sha256RefreshTokenCodec();

  beforeEach(async (): Promise<void> => {
    handle = await openMigrated(url);
    accounts = new DrizzleAdminAccountRepository(handle.db);
    tokens = new DrizzleRefreshTokenRepository(handle.db);
    challenges = new DrizzleLoginChallengeRepository(handle.db);
    devices = new DrizzleTrustedDeviceRepository(handle.db);
    await accounts.add(
      AdminAccount.create({
        id: 'a1',
        email: 'moi@exemple.fr',
        passwordHash: 'h:a-strong-password',
        totpSecret: 'S',
      }),
    );
  });

  afterEach(async (): Promise<void> => {
    await handle.close();
  });

  /**
   * Function family
   *
   * @description
   * Builds a persistent session family of the fixture account created at the shared fixed time.
   *
   * @param {string} id - Family identifier.
   * @param {boolean} persistent - Whether the session is remembered.
   *
   * @returns {SessionFamily} Family fixture.
   */
  const family = (id: string, persistent: boolean = true): SessionFamily => ({
    id,
    accountId: 'a1',
    createdAt: now,
    persistent,
  });

  /**
   * Function issue
   *
   * @description
   * Persists a refresh-token fixture in a persistent family and returns the hash used to retrieve it.
   *
   * @param {string} id - Token record identifier.
   * @param {string} familyId - Owning session family.
   * @param {Date} issuedAt - Token issuance time; defaults to the shared fixed time.
   *
   * @returns {Promise<string>} Stored hash for the generated raw token.
   */
  const issue = async (id: string, familyId: string, issuedAt: Date = now): Promise<string> => {
    const raw: string = `${id}-raw`;
    await tokens.add(
      RefreshToken.issue({ id, tokenHash: codec.hash(raw) }, family(familyId), issuedAt),
    );
    return codec.hash(raw);
  };

  it('reads, locks and saves the account', async (): Promise<void> => {
    const account: AdminAccount | null = await accounts.lockByEmail('moi@exemple.fr');
    if (!account) throw new Error('account missing');
    await accounts.save(account.failed(now).failed(now));
    expect((await accounts.findById('a1'))?.snapshot().failedAttempts).toBe(2);
    await expect(accounts.lockByEmail('autre@exemple.fr')).resolves.toBeNull();
    expect((await accounts.lockById('a1'))?.email).toBe('moi@exemple.fr');
    await expect(accounts.lockById('absent')).resolves.toBeNull();
    await expect(accounts.findById('absent')).resolves.toBeNull();
    await expect(accounts.count()).resolves.toBe(1);
  });

  it('keeps the creation time and the persistence of a family', async (): Promise<void> => {
    await tokens.addFamily(family('f1', false));
    await expect(tokens.lockFamily('f1')).resolves.toEqual(family('f1', false));
    await expect(tokens.lockFamily('absent')).resolves.toBeNull();
  });

  it('lets a token be replaced only once', async (): Promise<void> => {
    await tokens.addFamily(family('f1'));
    const hash: string = await issue('t1', 'f1');
    await tokens.lockFamily('f1');
    await expect(tokens.markRotated(hash, now)).resolves.toBe(true);
    await expect(tokens.markRotated(hash, now)).resolves.toBe(false);
    expect((await tokens.findByHash(hash))?.isSpent()).toBe(true);
    await expect(tokens.findByHash('unknown')).resolves.toBeNull();
  });

  it('revokes the family, including a token issued after the revocation', async (): Promise<void> => {
    await tokens.addFamily(family('f1'));
    const before: string = await issue('t1', 'f1');
    await tokens.revokeFamily('f1', now);
    const after: string = await issue('t2', 'f1');
    expect((await tokens.findByHash(before))?.isSpent()).toBe(true);
    expect((await tokens.findByHash(after))?.isSpent()).toBe(true);
    await expect(tokens.markRotated(after, now)).resolves.toBe(false);
  });

  it('forgets a family only once its most recent token expired', async (): Promise<void> => {
    await tokens.addFamily(family('old'));
    await tokens.addFamily(family('live'));
    await issue('o1', 'old');
    await issue('l1', 'live');
    await issue('l2', 'live', new Date(now.getTime() + 5 * DAY));
    await expect(tokens.deleteExpiredFamilies(new Date(now.getTime() + 31 * DAY))).resolves.toBe(1);
    const families: {
      id: string;
      accountId: string;
      createdAt: Date;
      persistent: boolean;
      revokedAt: Date | null;
    }[] = await handle.db.select().from(refreshTokenFamilies);
    expect(
      families.map(
        (family: {
          id: string;
          accountId: string;
          createdAt: Date;
          persistent: boolean;
          revokedAt: Date | null;
        }): string => family.id,
      ),
    ).toEqual(['live']);
  });

  it('stores a challenge, counts its attempts and consumes it once', async (): Promise<void> => {
    const challenge: LoginChallenge = LoginChallenge.open(
      { id: 'c1', accountId: 'a1', tokenHash: 'hash-c1', remember: true },
      now,
    );
    await challenges.add(challenge);
    await challenges.save(challenge.failed().failed());
    const stored: LoginChallenge | null = await challenges.lockByHash('hash-c1');
    expect(stored?.snapshot()).toEqual({ ...challenge.snapshot(), attempts: 2 });
    await expect(challenges.consume('c1', now)).resolves.toBe(true);
    await expect(challenges.consume('c1', now)).resolves.toBe(false);
    expect((await challenges.lockByHash('hash-c1'))?.snapshot().consumedAt).toEqual(now);
    await expect(challenges.lockByHash('unknown')).resolves.toBeNull();
  });

  it('forgets the expired challenges only', async (): Promise<void> => {
    await challenges.add(
      LoginChallenge.open({ id: 'old', accountId: 'a1', tokenHash: 'h-old', remember: false }, now),
    );
    const later: Date = new Date(now.getTime() + 60_000);
    await challenges.add(
      LoginChallenge.open(
        { id: 'new', accountId: 'a1', tokenHash: 'h-new', remember: false },
        later,
      ),
    );
    await expect(challenges.deleteExpired(new Date(now.getTime() + 5 * 60_000))).resolves.toBe(1);
    const rows: {
      id: string;
      accountId: string;
      tokenHash: string;
      remember: boolean;
      expiresAt: Date;
      attempts: number;
      consumedAt: Date | null;
    }[] = await handle.db.select().from(loginChallenges);
    expect(
      rows.map(
        (row: {
          id: string;
          accountId: string;
          tokenHash: string;
          remember: boolean;
          expiresAt: Date;
          attempts: number;
          consumedAt: Date | null;
        }): string => row.id,
      ),
    ).toEqual(['new']);
  });

  it('stores a trusted device, its last use and its revocation', async (): Promise<void> => {
    const device: TrustedDevice = TrustedDevice.trust(
      { id: 'd1', accountId: 'a1', tokenHash: 'hash-d1' },
      now,
    );
    await devices.add(device);
    expect((await devices.findByHash('hash-d1'))?.snapshot()).toEqual(device.snapshot());
    const used: TrustedDevice = device.used(new Date(now.getTime() + DAY));
    await devices.save(used);
    expect((await devices.findByHash('hash-d1'))?.snapshot()).toEqual(used.snapshot());
    await devices.save(TrustedDevice.rehydrate({ ...used.snapshot(), revokedAt: now }));
    expect((await devices.findByHash('hash-d1'))?.isTrustedFor('a1', now)).toBe(false);
    await expect(devices.findByHash('unknown')).resolves.toBeNull();
  });

  it('forgets the expired devices only', async (): Promise<void> => {
    await devices.add(TrustedDevice.trust({ id: 'old', accountId: 'a1', tokenHash: 'h-old' }, now));
    await devices.add(
      TrustedDevice.trust(
        { id: 'new', accountId: 'a1', tokenHash: 'h-new' },
        new Date(now.getTime() + DAY),
      ),
    );
    await expect(devices.deleteExpired(new Date(now.getTime() + 30 * DAY))).resolves.toBe(1);
    const rows: {
      id: string;
      accountId: string;
      tokenHash: string;
      createdAt: Date;
      expiresAt: Date;
      lastUsedAt: Date | null;
      revokedAt: Date | null;
    }[] = await handle.db.select().from(trustedDevices);
    expect(
      rows.map(
        (row: {
          id: string;
          accountId: string;
          tokenHash: string;
          createdAt: Date;
          expiresAt: Date;
          lastUsedAt: Date | null;
          revokedAt: Date | null;
        }): string => row.id,
      ),
    ).toEqual(['new']);
  });

  it('rolls back the whole unit of work on failure', async (): Promise<void> => {
    const uow: DrizzleIdentityUnitOfWork = new DrizzleIdentityUnitOfWork(handle.db);
    await expect(
      uow.run(async (repositories) => {
        await repositories.tokens.addFamily(family('f1'));
        await repositories.challenges.add(
          LoginChallenge.open({ id: 'c1', accountId: 'a1', tokenHash: 'h', remember: true }, now),
        );
        await repositories.devices.add(
          TrustedDevice.trust({ id: 'd1', accountId: 'a1', tokenHash: 'h' }, now),
        );
        throw new Error('failure after write');
      }),
    ).rejects.toThrow('failure after write');
    await expect(handle.db.select().from(refreshTokenFamilies)).resolves.toEqual([]);
    await expect(handle.db.select().from(loginChallenges)).resolves.toEqual([]);
    await expect(handle.db.select().from(trustedDevices)).resolves.toEqual([]);
  });

  describe('concurrent use cases', (): void => {
    /**
     * Variable login
     *
     * @description
     * Login use case configured with the current database transaction and deterministic test adapters.
     *
     * @type {Login}
     */
    let login: Login;

    /**
     * Variable verifyCode
     *
     * @description
     * Second-step use case configured against the current target's transaction.
     *
     * @type {VerifyLoginCode}
     */
    let verifyCode: VerifyLoginCode;

    /**
     * Variable refresh
     *
     * @description
     * Refresh use case configured against the current target's transaction.
     *
     * @type {RefreshSession}
     */
    let refresh: RefreshSession;

    /**
     * Variable logout
     *
     * @description
     * Logout use case configured against the current target's transaction.
     *
     * @type {Logout}
     */
    let logout: Logout;

    beforeEach((): void => {
      let n: number = 0;
      const clock: { now: () => Date } = { now: (): Date => now };
      const services: SessionServices = {
        signer: {
          sign: async (id: string, sid: string): Promise<{ token: string; expiresIn: number }> => ({
            token: `jwt-${id}-${sid}`,
            expiresIn: 300,
          }),
        },
        codec,
        ids: { next: (): string => `id-${++n}-${Math.random().toString(36).slice(2)}` },
      };
      const uow: DrizzleIdentityUnitOfWork = new DrizzleIdentityUnitOfWork(handle.db);
      login = new Login(uow, services, hasher, clock, 'h:decoy');
      verifyCode = new VerifyLoginCode(uow, services, totp, clock);
      refresh = new RefreshSession(uow, services, clock);
      logout = new Logout(uow, codec, clock);
    });

    /**
     * Function challenge
     *
     * @description
     * Runs the first step with the right password and returns its challenge.
     *
     * @returns {Promise<string>} Opaque challenge.
     */
    const challenge = async (): Promise<string> => {
      const result: LoginResult = await login.execute({
        email: 'moi@exemple.fr',
        password: 'a-strong-password',
        remember: true,
        deviceToken: null,
      });
      if (result.status !== 'totp-required') throw new Error('challenge expected');
      return result.challenge;
    };

    /**
     * Function submit
     *
     * @description
     * Runs the second step for a challenge with the supplied code.
     *
     * @param {string} value - Challenge of the first step.
     * @param {string} code - Candidate one-time password.
     *
     * @returns {ReturnType<VerifyLoginCode['execute']>} Second-step outcome.
     */
    const submit = (value: string, code: string): Promise<VerifiedLogin> =>
      verifyCode.execute({ challenge: value, totp: code, trustDevice: false });

    /**
     * Function signIn
     *
     * @description
     * Runs both steps and returns the opened session.
     *
     * @param {string} code - One-time password of the login.
     *
     * @returns {Promise<Session>} Opened session.
     */
    const signIn = async (code: string): Promise<Session> =>
      (await submit(await challenge(), code)).session;

    it('accepts a challenge only once, even for simultaneous submissions', async (): Promise<void> => {
      const value: string = await challenge();
      const results: [
        PromiseSettledResult<VerifiedLogin>,
        PromiseSettledResult<VerifiedLogin>,
        PromiseSettledResult<VerifiedLogin>,
      ] = await Promise.allSettled([
        submit(value, '000100'),
        submit(value, '000100'),
        submit(value, '000100'),
      ]);
      expect(
        results.filter((r: PromiseSettledResult<VerifiedLogin>) => r.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        results
          .filter((r: PromiseSettledResult<VerifiedLogin>) => r.status === 'rejected')
          .map((r: PromiseRejectedResult) => r.reason),
      ).toEqual([expect.any(ChallengeExpiredError), expect.any(ChallengeExpiredError)]);
      await expect(handle.db.select().from(refreshTokenFamilies)).resolves.toHaveLength(1);
    });

    it('accepts a TOTP code only once, even on two simultaneous challenges', async (): Promise<void> => {
      const [first, second] = [await challenge(), await challenge()];
      const results: [PromiseSettledResult<VerifiedLogin>, PromiseSettledResult<VerifiedLogin>] =
        await Promise.allSettled([submit(first, '000150'), submit(second, '000150')]);
      expect(
        results.filter((r: PromiseSettledResult<VerifiedLogin>) => r.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        results
          .filter((r: PromiseSettledResult<VerifiedLogin>) => r.status === 'rejected')
          .map((r: PromiseRejectedResult) => r.reason),
      ).toEqual([expect.any(InvalidCredentialsError)]);
    });

    it('counts every simultaneous wrong code, on the challenge and the account', async (): Promise<void> => {
      const value: string = await challenge();
      const results: PromiseSettledResult<VerifiedLogin>[] = await Promise.allSettled(
        Array.from({ length: 8 }, (): Promise<VerifiedLogin> => submit(value, 'wrong')),
      );
      expect(
        results.every((r: PromiseSettledResult<VerifiedLogin>) => r.status === 'rejected'),
      ).toBe(true);
      const [row] = await handle.db.select().from(loginChallenges);
      expect(row?.attempts).toBe(5);
      expect((await accounts.findById('a1'))?.snapshot().lockedUntil).not.toBeNull();
    });

    it('counts every simultaneous failure and locks the account', async (): Promise<void> => {
      await Promise.allSettled(
        Array.from({ length: 8 }, (): Promise<LoginResult> =>
          login.execute({
            email: 'moi@exemple.fr',
            password: 'wrong',
            remember: false,
            deviceToken: null,
          }),
        ),
      );
      expect((await accounts.findById('a1'))?.snapshot().lockedUntil).not.toBeNull();
    });

    it('revokes the family when a token is used twice at the same time', async (): Promise<void> => {
      const session: Session = await signIn('000200');
      const results: [PromiseSettledResult<Session>, PromiseSettledResult<Session>] =
        await Promise.allSettled([
          refresh.execute(session.refreshToken),
          refresh.execute(session.refreshToken),
        ]);
      const issued: Session[] = results.flatMap((r: PromiseSettledResult<Session>): Session[] =>
        r.status === 'fulfilled' ? [r.value] : [],
      );
      expect(issued).toHaveLength(1);
      await expect(refresh.execute(issued[0]?.refreshToken ?? '')).rejects.toBeInstanceOf(
        InvalidSessionError,
      );
    });

    it('leaves no usable token when a refresh and a logout race', async (): Promise<void> => {
      const session: Session = await signIn('000300');
      const [refreshed] = await Promise.allSettled([
        refresh.execute(session.refreshToken),
        logout.execute(session.refreshToken),
      ]);
      if (refreshed.status === 'fulfilled') {
        await expect(refresh.execute(refreshed.value.refreshToken)).rejects.toBeInstanceOf(
          InvalidSessionError,
        );
      }
      await expect(refresh.execute(session.refreshToken)).rejects.toBeInstanceOf(
        InvalidSessionError,
      );
    });
  });
});
