import {
  type AdminAccount,
  type LoginChallenge,
  RefreshToken,
  type SessionFamily,
  type TrustedDevice,
  type RefreshTokenProps,
} from '@vfortin/identity-domain';
import type {
  AdminAccountRepository,
  IdentityRepositories,
  IdentityUnitOfWork,
  LoginChallengeRepository,
  PasswordHasher,
  RefreshTokenRepository,
  TotpVerifier,
  TrustedDeviceRepository,
} from '@internal/identity-application/lib/ports/identity/identity.ports';

/**
 * Interface Family
 * @interface Family
 *
 * @description
 * Session-family state held by the in-memory identity store during use-case tests.
 */
interface Family extends SessionFamily {
  // #region Properties
  /**
   * Property revokedAt
   *
   * @description
   * Revocation time, or `null` while this family remains active.
   *
   * @type {Date | null}
   */
  revokedAt: Date | null;
  // #endregion
}

/**
 * Class InMemoryIdentityStore
 * @class InMemoryIdentityStore
 *
 * @description
 * Provides repositories backed by maps for use-case tests. Each unit of work snapshots state and restores it on rejection; row locks are recorded but concurrency is not simulated.
 */
export class InMemoryIdentityStore implements IdentityUnitOfWork {
  // #region Properties
  /**
   * Property accounts
   *
   * @description
   * Account records keyed by their stable identifier.
   *
   * @type {Map<string, AdminAccount>}
   */
  public accounts: Map<string, AdminAccount> = new Map<string, AdminAccount>();

  /**
   * Property tokens
   *
   * @description
   * Refresh-token records keyed by their stored token hash.
   *
   * @type {Map<string, RefreshToken>}
   */
  public tokens: Map<string, RefreshToken> = new Map<string, RefreshToken>();

  /**
   * Property families
   *
   * @description
   * Session families keyed by their identifiers.
   *
   * @type {Map<string, Family>}
   */
  public families: Map<string, Family> = new Map<string, Family>();

  /**
   * Property challenges
   *
   * @description
   * Login challenges keyed by their stored token hash.
   *
   * @type {Map<string, LoginChallenge>}
   */
  public challenges: Map<string, LoginChallenge> = new Map<string, LoginChallenge>();

  /**
   * Property devices
   *
   * @description
   * Trusted devices keyed by their stored token hash.
   *
   * @type {Map<string, TrustedDevice>}
   */
  public devices: Map<string, TrustedDevice> = new Map<string, TrustedDevice>();

  /**
   * Property locked
   * @readonly
   *
   * @description
   * Records account, family and challenge lock requests so tests can inspect transactional ordering.
   *
   * @type {string[]}
   */
  public readonly locked: string[] = [];

  /**
   * Property accountRepository
   * @readonly
   *
   * @description
   * In-memory account repository implementing lookup, lock recording and state replacement.
   *
   * @type {AdminAccountRepository}
   */
  public readonly accountRepository: AdminAccountRepository = {
    count: async (): Promise<number> => this.accounts.size,
    findById: async (id: string): Promise<AdminAccount | null> => this.accounts.get(id) ?? null,
    lockByEmail: async (email: string): Promise<AdminAccount | null> => {
      const account: AdminAccount | null =
        [...this.accounts.values()].find((a: AdminAccount): boolean => a.email === email) ?? null;
      if (account) this.locked.push(`account:${account.id}`);
      return account;
    },
    lockById: async (id: string): Promise<AdminAccount | null> => {
      const account: AdminAccount | null = this.accounts.get(id) ?? null;
      if (account) this.locked.push(`account:${account.id}`);
      return account;
    },
    add: async (account: AdminAccount): Promise<undefined> =>
      void this.accounts.set(account.id, account),
    save: async (account: AdminAccount): Promise<undefined> =>
      void this.accounts.set(account.id, account),
  };

  /**
   * Property tokenRepository
   * @readonly
   *
   * @description
   * In-memory token repository implementing family locking, rotation, revocation and expired-family cleanup.
   *
   * @type {RefreshTokenRepository}
   */
  public readonly tokenRepository: RefreshTokenRepository = {
    addFamily: async (family: SessionFamily): Promise<undefined> =>
      void this.families.set(family.id, { ...family, revokedAt: null }),
    lockFamily: async (
      familyId: string,
    ): Promise<{ id: string; accountId: string; createdAt: Date; persistent: boolean } | null> => {
      this.locked.push(`family:${familyId}`);
      const family: Family | undefined = this.families.get(familyId);
      if (!family) return null;
      return {
        id: family.id,
        accountId: family.accountId,
        createdAt: family.createdAt,
        persistent: family.persistent,
      };
    },
    add: async (token: RefreshToken): Promise<undefined> =>
      void this.tokens.set(token.snapshot().tokenHash, token),
    findByHash: async (hash: string): Promise<RefreshToken | null> => {
      const token: RefreshToken | undefined = this.tokens.get(hash);
      if (!token) return null;
      const familyRevokedAt: Date | null = this.families.get(token.familyId)?.revokedAt ?? null;
      const props: RefreshTokenProps = token.snapshot();
      return RefreshToken.rehydrate({ ...props, revokedAt: props.revokedAt ?? familyRevokedAt });
    },
    markRotated: async (hash: string, now: Date): Promise<boolean> => {
      const token: RefreshToken | null = await this.tokenRepository.findByHash(hash);
      if (!token || token.isSpent()) return false;
      this.tokens.set(hash, RefreshToken.rehydrate({ ...token.snapshot(), rotatedAt: now }));
      return true;
    },
    revokeFamily: async (familyId: string, now: Date): Promise<void> => {
      const family: Family | undefined = this.families.get(familyId);
      if (family && family.revokedAt === null) family.revokedAt = now;
    },
    deleteExpiredFamilies: async (now: Date): Promise<number> => {
      let deleted: number = 0;
      for (const familyId of this.families.keys()) {
        const tokens: RefreshToken[] = [...this.tokens.values()].filter(
          (t: RefreshToken): boolean => t.familyId === familyId,
        );
        if (tokens.length > 0 && tokens.every((t: RefreshToken): boolean => t.isExpired(now))) {
          this.families.delete(familyId);
          for (const t of tokens) this.tokens.delete(t.snapshot().tokenHash);
          deleted++;
        }
      }
      return deleted;
    },
  };

  /**
   * Property challengeRepository
   * @readonly
   *
   * @description
   * In-memory challenge repository implementing lock recording, conditional consumption and expiry cleanup.
   *
   * @type {LoginChallengeRepository}
   */
  public readonly challengeRepository: LoginChallengeRepository = {
    add: async (challenge: LoginChallenge): Promise<undefined> =>
      void this.challenges.set(challenge.snapshot().tokenHash, challenge),
    lockByHash: async (hash: string): Promise<LoginChallenge | null> => {
      const challenge: LoginChallenge | null = this.challenges.get(hash) ?? null;
      if (challenge) this.locked.push(`challenge:${challenge.id}`);
      return challenge;
    },
    save: async (challenge: LoginChallenge): Promise<undefined> =>
      void this.challenges.set(challenge.snapshot().tokenHash, challenge),
    consume: async (id: string, now: Date): Promise<boolean> => {
      const challenge: LoginChallenge | undefined = [...this.challenges.values()].find(
        (c: LoginChallenge): boolean => c.id === id,
      );
      if (!challenge || challenge.snapshot().consumedAt !== null) return false;
      this.challenges.set(challenge.snapshot().tokenHash, challenge.consumed(now));
      return true;
    },
    deleteExpired: async (now: Date): Promise<number> => {
      let deleted: number = 0;
      for (const [hash, challenge] of this.challenges) {
        if (challenge.expiresAt.getTime() <= now.getTime()) {
          this.challenges.delete(hash);
          deleted++;
        }
      }
      return deleted;
    },
  };

  /**
   * Property deviceRepository
   * @readonly
   *
   * @description
   * In-memory trusted-device repository implementing lookup, last-use updates and expiry cleanup.
   *
   * @type {TrustedDeviceRepository}
   */
  public readonly deviceRepository: TrustedDeviceRepository = {
    add: async (device: TrustedDevice): Promise<undefined> =>
      void this.devices.set(device.snapshot().tokenHash, device),
    findByHash: async (hash: string): Promise<TrustedDevice | null> =>
      this.devices.get(hash) ?? null,
    save: async (device: TrustedDevice): Promise<undefined> =>
      void this.devices.set(device.snapshot().tokenHash, device),
    deleteByAccount: async (accountId: string): Promise<number> => {
      let deleted: number = 0;
      for (const [hash, device] of this.devices) {
        if (device.snapshot().accountId === accountId) {
          this.devices.delete(hash);
          deleted++;
        }
      }
      return deleted;
    },
    deleteExpired: async (now: Date): Promise<number> => {
      let deleted: number = 0;
      for (const [hash, device] of this.devices) {
        if (device.expiresAt.getTime() <= now.getTime()) {
          this.devices.delete(hash);
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
   * Runs work against in-memory repositories and restores maps if the callback rejects, simulating transaction rollback for sequential tests.
   *
   * @template T - Result returned by the callback.
   * @param {(repositories: IdentityRepositories) => Promise<T>} work - Repository operations to execute.
   *
   * @returns {Promise<T>} Callback result after successful completion.
   */
  public async run<T>(work: (repositories: IdentityRepositories) => Promise<T>): Promise<T> {
    const saved: {
      accounts: Map<string, AdminAccount>;
      tokens: Map<string, RefreshToken>;
      families: Map<string, Family>;
      challenges: Map<string, LoginChallenge>;
      devices: Map<string, TrustedDevice>;
    } = {
      accounts: new Map(this.accounts),
      tokens: new Map(this.tokens),
      families: new Map(
        [...this.families].map(
          ([id, f]): [
            string,
            {
              revokedAt: Date | null;
              id: string;
              accountId: string;
              createdAt: Date;
              persistent: boolean;
            },
          ] => [id, { ...f }],
        ),
      ),
      challenges: new Map(this.challenges),
      devices: new Map(this.devices),
    };
    try {
      return await work({
        accounts: this.accountRepository,
        tokens: this.tokenRepository,
        challenges: this.challengeRepository,
        devices: this.deviceRepository,
      });
    } catch (error: unknown) {
      this.accounts = saved.accounts;
      this.tokens = saved.tokens;
      this.families = saved.families;
      this.challenges = saved.challenges;
      this.devices = saved.devices;
      throw error;
    }
  }
  // #endregion
}

/**
 * Constant fakeHasher
 *
 * @description
 * Test password service that encodes credentials as `h:<password>` for deterministic use-case assertions.
 *
 * @type {PasswordHasher}
 */
export const fakeHasher: PasswordHasher = {
  hash: async (password: string): Promise<string> => `h:${password}`,
  verify: async (password: string, hash: string): Promise<boolean> => hash === `h:${password}`,
};

/**
 * Constant fakeTotp
 *
 * @description
 * Test TOTP service that parses codes in the `step-<n>` form and returns their numeric step; a code
 * written `<secret>:step-<n>` only matches that secret, to tell the pending secret from the active one.
 *
 * @type {TotpVerifier}
 */
export const fakeTotp: TotpVerifier = {
  generateSecret: (): string => 'SECRET',
  provisioningUri: (secret: string, account: string): string =>
    `otpauth://totp/Portfolio:${account}?secret=${secret}`,
  verify: (secret: string, code: string): number | null => {
    const match: RegExpExecArray | null = /^(?:(\w+):)?step-(\d+)$/.exec(code);
    if (!match || (match[1] !== undefined && match[1] !== secret)) return null;
    return Number(match[2]);
  },
};
