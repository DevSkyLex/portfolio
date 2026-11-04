import type { Mock } from 'vitest';
import {
  AccountLockedError,
  AdminAccount,
  LoginChallenge,
  TrustedDevice,
  TwoFactorStateError,
  WeakPasswordError,
  type AdminAccountProps,
  type LoginChallengeProps,
  type TrustedDeviceProps,
  type RefreshToken,
} from '@vfortin/identity-domain';
import {
  AlreadyBootstrappedError,
  ChallengeExpiredError,
  InvalidCredentialsError,
  InvalidSessionError,
  PasswordMismatchError,
  TotpInvalidError,
} from '@internal/identity-application/lib/errors/application-error';
import { BootstrapAdmin } from '@internal/identity-application/lib/use-cases/bootstrap-admin/bootstrap-admin.use-case';
import { DisableTwoFactor } from '@internal/identity-application/lib/use-cases/disable-two-factor/disable-two-factor.use-case';
import { EnableTwoFactor } from '@internal/identity-application/lib/use-cases/enable-two-factor/enable-two-factor.use-case';
import { GetTwoFactorStatus } from '@internal/identity-application/lib/use-cases/get-two-factor-status/get-two-factor-status.use-case';
import {
  StartTwoFactorSetup,
  type TwoFactorEnrollment,
} from '@internal/identity-application/lib/use-cases/start-two-factor-setup/start-two-factor-setup.use-case';
import {
  Login,
  type LoginCommand,
  type LoginResult,
} from '@internal/identity-application/lib/use-cases/login/login.use-case';
import { Logout } from '@internal/identity-application/lib/use-cases/logout/logout.use-case';
import type {
  Session,
  SessionServices,
} from '@internal/identity-application/lib/use-cases/open-session/open-session';
import { RefreshSession } from '@internal/identity-application/lib/use-cases/refresh-session/refresh-session.use-case';
import {
  type VerifiedLogin,
  VerifyLoginCode,
} from '@internal/identity-application/lib/use-cases/verify-login-code/verify-login-code.use-case';
import {
  InMemoryIdentityStore,
  fakeHasher,
  fakeTotp,
} from '@internal/identity-application/lib/testing/identity.fakes';

/**
 * Constant HOUR
 *
 * @description
 * Milliseconds in one hour, used to advance the injected clock across session lifetimes.
 *
 * @type {number}
 */
const HOUR = 3600_000 as const;

/**
 * Constant DAY
 *
 * @description
 * Milliseconds in one day, used to advance the injected clock across refresh-token and device expiry boundaries.
 *
 * @type {number}
 */
const DAY: number = 24 * HOUR;

/**
 * Constant START
 *
 * @description
 * Initial clock value of every specification.
 *
 * @type {number}
 */
const START: number = Date.parse('2026-11-02T10:00:00Z');

/**
 * Deterministic identity use cases, spies and clock controls shared by the session tests.
 */
interface SessionFixtures {
  readonly store: InMemoryIdentityStore;
  readonly now: { value: Date };
  readonly verify: Mock<typeof fakeHasher.verify>;
  readonly bootstrap: BootstrapAdmin;
  readonly login: Login;
  readonly verifyCode: VerifyLoginCode;
  readonly refresh: RefreshSession;
  readonly logout: Logout;
  readonly startSetup: StartTwoFactorSetup;
  readonly enable: EnableTwoFactor;
  readonly disable: DisableTwoFactor;
  readonly status: GetTwoFactorStatus;
  advance(ms: number): void;
  challenge(command?: Partial<LoginCommand>): Promise<string>;
  signIn(options?: {
    code?: string;
    remember?: boolean;
    trustDevice?: boolean;
  }): Promise<VerifiedLogin>;
}

/**
 * Function setup
 *
 * @description
 * Creates an in-memory identity store, deterministic session services, a bootstrapped administrator and the use cases exercised by the specifications.
 *
 * @param {boolean} twoFactor - Whether the administrator has enrolled the one-time code (secret `SECRET`, step 0 accepted).
 *
 * @returns {Promise<SessionFixtures>} Test fixtures with a mutable clock, spies and helpers.
 */
async function setup(twoFactor: boolean = true): Promise<SessionFixtures> {
  const store: InMemoryIdentityStore = new InMemoryIdentityStore();
  let n: number = 0;
  let counter: number = 0;
  const now: { value: Date } = { value: new Date(START) };
  const clock: { now: () => Date } = { now: (): Date => now.value };
  const services: SessionServices = {
    signer: {
      sign: async (id: string, sid: string): Promise<{ token: string; expiresIn: number }> => ({
        token: `jwt-${id}-${sid}`,
        expiresIn: 300,
      }),
    },
    codec: {
      generate: (): string => `opaque-${++counter}`,
      hash: (token: string): string => `#${token}`,
    },
    ids: { next: (): string => `id-${++n}` },
  };
  const verify: Mock<typeof fakeHasher.verify> = vi.spyOn(fakeHasher, 'verify');
  const bootstrap: BootstrapAdmin = new BootstrapAdmin(
    store.accountRepository,
    fakeHasher,
    services.ids,
  );
  await bootstrap.execute('moi@exemple.fr', 'a-strong-password');
  if (twoFactor) {
    const created: AdminAccount | undefined = [...store.accounts.values()][0];
    if (!created) throw new Error('account missing');
    store.accounts.set(created.id, created.startTwoFactorSetup('SECRET').enableTwoFactor(0));
  }
  const login: Login = new Login(store, services, fakeHasher, clock, 'h:decoy');
  const verifyCode: VerifyLoginCode = new VerifyLoginCode(store, services, fakeTotp, clock);
  /**
   * Function advance
   *
   * @description
   * Moves the injected clock forward.
   *
   * @param {number} ms - Milliseconds to add.
   *
   * @returns {void} Completes after the clock moves.
   */
  const advance = (ms: number): void => {
    now.value = new Date(now.value.getTime() + ms);
  };
  /**
   * Function challenge
   *
   * @description
   * Runs the first step and returns its challenge, failing when the session opened at once.
   *
   * @param {Partial<LoginCommand>} command - Overrides of the valid first-step command.
   *
   * @returns {Promise<string>} Opaque challenge.
   */
  const challenge = async (command: Partial<LoginCommand> = {}): Promise<string> => {
    const result: LoginResult = await login.execute({ ...good, ...command });
    if (result.status !== 'totp-required') throw new Error('challenge expected');
    return result.challenge;
  };
  /**
   * Function signIn
   *
   * @description
   * Runs both steps with the given code and choices.
   *
   * @param {{ code?: string; remember?: boolean; trustDevice?: boolean }} options - Code and choices of the login.
   *
   * @returns {Promise<VerifiedLogin>} Opened session and optional device.
   */
  const signIn = async (
    options: { code?: string; remember?: boolean; trustDevice?: boolean } = {},
  ): Promise<VerifiedLogin> =>
    verifyCode.execute({
      challenge: await challenge({ remember: options.remember ?? true }),
      totp: options.code ?? 'step-10',
      trustDevice: options.trustDevice ?? false,
    });
  return {
    store,
    now,
    advance,
    verify,
    bootstrap,
    login,
    verifyCode,
    challenge,
    signIn,
    refresh: new RefreshSession(store, services, clock),
    logout: new Logout(store, services.codec, clock),
    startSetup: new StartTwoFactorSetup(store, fakeHasher, fakeTotp, clock),
    enable: new EnableTwoFactor(store, fakeTotp, clock),
    disable: new DisableTwoFactor(store, fakeHasher, fakeTotp, clock),
    status: new GetTwoFactorStatus(store),
  };
}

/**
 * Constant good
 *
 * @description
 * Valid first-step fixture with mixed-case whitespace around the email to exercise normalization.
 *
 * @type {LoginCommand}
 */
const good: LoginCommand = {
  email: ' Moi@exemple.fr ',
  password: 'a-strong-password',
  remember: true,
  deviceToken: null,
};

/**
 * Function account
 *
 * @description
 * Returns the snapshot of the first stored account for concise state assertions in use-case tests.
 *
 * @param {InMemoryIdentityStore} store - Test store containing the account records.
 *
 * @returns {ReturnType<AdminAccount['snapshot']> | undefined} Account state when one exists.
 */
const account = (store: InMemoryIdentityStore): AdminAccountProps | undefined =>
  [...store.accounts.values()][0]?.snapshot();

/**
 * Function sessionOf
 *
 * @description
 * Narrows a first-step result to the session opened on a trusted device.
 *
 * @param {LoginResult} result - First-step result.
 *
 * @returns {Session} Opened session.
 */
const sessionOf = (result: LoginResult): Session => {
  if (result.status !== 'authenticated') throw new Error('session expected');
  return result.session;
};

/**
 * Function withFailures
 *
 * @description
 * Stores the account with a given failure counter.
 *
 * @param {InMemoryIdentityStore} store - Test store holding the single account.
 * @param {number} failedAttempts - Counter to store.
 *
 * @returns {void} Completes after the account is replaced.
 */
const withFailures = (store: InMemoryIdentityStore, failedAttempts: number): void => {
  const state: AdminAccountProps | undefined = [...store.accounts.values()][0]?.snapshot();
  if (!state) throw new Error('account missing');
  store.accounts.set(state.id, AdminAccount.rehydrate({ ...state, failedAttempts }));
};

afterEach((): void => {
  vi.restoreAllMocks();
});

describe('Login', (): void => {
  it('asks for the code after a right password, through a hashed five-minute challenge', async (): Promise<void> => {
    const { login, store } = await setup();
    withFailures(store, 2);
    const result: LoginResult = await login.execute(good);
    expect(result).toEqual({ status: 'totp-required', challenge: 'opaque-1', expiresIn: 300 });
    const stored: LoginChallengeProps | undefined = store.challenges.get('#opaque-1')?.snapshot();
    expect(stored).toMatchObject({ remember: true, attempts: 0, consumedAt: null });
    expect(stored?.expiresAt).toEqual(new Date(START + 5 * 60_000));
    expect(store.locked[0]).toMatch(/^account:/);
    // A right password alone does not prove the second factor: the counter stays.
    expect(account(store)?.failedAttempts).toBe(2);
    expect(store.families.size).toBe(0);
  });

  it('refuses without saying why, and still verifies a hash for an unknown address', async (): Promise<void> => {
    const { login, verify } = await setup();
    await expect(login.execute({ ...good, password: 'wrong' })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    await expect(login.execute({ ...good, email: 'autre@exemple.fr' })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(verify).toHaveBeenLastCalledWith('a-strong-password', 'h:decoy');
  });

  it('commits the failure counter even though the attempt is refused', async (): Promise<void> => {
    const { login, store } = await setup();
    await expect(login.execute({ ...good, password: 'wrong' })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(account(store)?.failedAttempts).toBe(1);
  });

  it('locks the account after five failures, and still verifies the hash while locked', async (): Promise<void> => {
    const { login, verify } = await setup();
    for (let i: number = 0; i < 5; i++) {
      await expect(login.execute({ ...good, password: 'wrong' })).rejects.toBeInstanceOf(
        InvalidCredentialsError,
      );
    }
    verify.mockClear();
    await expect(login.execute(good)).rejects.toBeInstanceOf(AccountLockedError);
    expect(verify).toHaveBeenCalledWith('a-strong-password', 'h:a-strong-password');
  });

  it('opens the session at once on a device trusted by the account', async (): Promise<void> => {
    const { login, store, signIn, advance } = await setup();
    const { device } = await signIn({ trustDevice: true });
    withFailures(store, 3);
    advance(HOUR);
    const result: LoginResult = await login.execute({
      ...good,
      remember: false,
      deviceToken: device?.token ?? '',
    });
    const session: Session = sessionOf(result);
    expect(session.persistent).toBe(false);
    expect(session.access.token).toMatch(/^jwt-id-1-/);
    expect(account(store)).toMatchObject({ failedAttempts: 0, lastTotpStep: 10 });
    const stored: TrustedDeviceProps | undefined = store.devices
      .get(`#${device?.token}`)
      ?.snapshot();
    expect(stored?.lastUsedAt).toEqual(new Date(START + HOUR));
    expect(stored?.expiresAt).toEqual(new Date(START + 30 * DAY));
    expect(store.families.size).toBe(2);
  });

  it.each([
    ['unknown', (): string => 'unknown-device'],
    [
      'trusted by another account',
      (store: InMemoryIdentityStore): string => {
        store.devices.set(
          '#other',
          TrustedDevice.trust(
            { id: 'd', accountId: 'other', tokenHash: '#other' },
            new Date(START),
          ),
        );
        return 'other';
      },
    ],
    [
      'revoked',
      (store: InMemoryIdentityStore): string => {
        const device: TrustedDevice = TrustedDevice.trust(
          { id: 'd', accountId: 'id-1', tokenHash: '#revoked' },
          new Date(START),
        );
        store.devices.set(
          '#revoked',
          TrustedDevice.rehydrate({ ...device.snapshot(), revokedAt: new Date(START) }),
        );
        return 'revoked';
      },
    ],
  ])(
    'still asks for the code with a device %s',
    async (_label: string, plant: (store: InMemoryIdentityStore) => string): Promise<void> => {
      const { login, store } = await setup();
      const result: LoginResult = await login.execute({ ...good, deviceToken: plant(store) });
      expect(result.status).toBe('totp-required');
      expect(store.families.size).toBe(0);
    },
  );

  it('asks for the code again once the device trust expired', async (): Promise<void> => {
    const { login, signIn, advance } = await setup();
    const { device } = await signIn({ trustDevice: true });
    advance(30 * DAY);
    const result: LoginResult = await login.execute({ ...good, deviceToken: device?.token ?? '' });
    expect(result.status).toBe('totp-required');
  });

  it('forgets the expired challenges', async (): Promise<void> => {
    const { challenge, store, advance } = await setup();
    await challenge();
    advance(5 * 60_000);
    await challenge();
    expect([...store.challenges.keys()]).toEqual(['#opaque-2']);
  });
});

describe('VerifyLoginCode', (): void => {
  it('opens a remembered session once the code is right, and consumes the challenge', async (): Promise<void> => {
    const { verifyCode, challenge, store } = await setup();
    withFailures(store, 2);
    const value: string = await challenge();
    store.locked.length = 0;
    const { session, device } = await verifyCode.execute({
      challenge: value,
      totp: 'step-10',
      trustDevice: false,
    });
    expect(session.access.token).toBe('jwt-id-1-id-3');
    expect(session.refreshToken).toBe('opaque-2');
    expect(session.persistent).toBe(true);
    expect(session.refreshExpiresAt).toEqual(new Date(START + 30 * DAY));
    expect(device).toBeNull();
    expect(store.devices.size).toBe(0);
    expect(store.families.get('id-3')).toMatchObject({ persistent: true, accountId: 'id-1' });
    expect(store.locked).toEqual(['challenge:id-2', 'account:id-1']);
    expect(store.challenges.get(`#${value}`)?.snapshot().consumedAt).toEqual(new Date(START));
    expect(account(store)).toMatchObject({ lastTotpStep: 10, failedAttempts: 0 });
  });

  it('opens a browser session when the administrator did not ask to be remembered', async (): Promise<void> => {
    const { signIn, store } = await setup();
    const { session } = await signIn({ remember: false });
    expect(session.persistent).toBe(false);
    expect(session.refreshExpiresAt).toEqual(new Date(START + 12 * HOUR));
    expect([...store.families.values()][0]?.persistent).toBe(false);
  });

  it('trusts the device for thirty days, storing only the hash of its token', async (): Promise<void> => {
    const { signIn, store } = await setup();
    const { device } = await signIn({ trustDevice: true });
    expect(device).toEqual({ token: 'opaque-3', expiresAt: new Date(START + 30 * DAY) });
    expect(store.devices.get('#opaque-3')?.snapshot()).toMatchObject({
      accountId: 'id-1',
      tokenHash: '#opaque-3',
      lastUsedAt: null,
    });
  });

  it('forgets the expired devices when trusting a new one', async (): Promise<void> => {
    const { signIn, store, advance } = await setup();
    await signIn({ trustDevice: true });
    advance(30 * DAY);
    await signIn({ trustDevice: true, code: 'step-20' });
    expect([...store.devices.keys()]).toEqual(['#opaque-6']);
  });

  it('refuses a replayed challenge', async (): Promise<void> => {
    const { verifyCode, challenge } = await setup();
    const value: string = await challenge();
    await verifyCode.execute({ challenge: value, totp: 'step-10', trustDevice: false });
    await expect(
      verifyCode.execute({ challenge: value, totp: 'step-11', trustDevice: false }),
    ).rejects.toBeInstanceOf(ChallengeExpiredError);
  });

  it('refuses an unknown or expired challenge', async (): Promise<void> => {
    const { verifyCode, challenge, advance } = await setup();
    const value: string = await challenge();
    await expect(
      verifyCode.execute({ challenge: 'unknown', totp: 'step-10', trustDevice: false }),
    ).rejects.toBeInstanceOf(ChallengeExpiredError);
    advance(5 * 60_000);
    await expect(
      verifyCode.execute({ challenge: value, totp: 'step-10', trustDevice: false }),
    ).rejects.toBeInstanceOf(ChallengeExpiredError);
  });

  it('counts a wrong code on the challenge and toward the lockout', async (): Promise<void> => {
    const { verifyCode, challenge, store } = await setup();
    const value: string = await challenge();
    await expect(
      verifyCode.execute({ challenge: value, totp: 'wrong', trustDevice: false }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(store.challenges.get(`#${value}`)?.snapshot().attempts).toBe(1);
    expect(account(store)?.failedAttempts).toBe(1);
    await expect(
      verifyCode.execute({ challenge: value, totp: 'step-10', trustDevice: false }),
    ).resolves.toBeDefined();
  });

  it('refuses a challenge out of attempts, even with the right code', async (): Promise<void> => {
    const { verifyCode, challenge, store } = await setup();
    const value: string = await challenge();
    const stored: LoginChallenge | undefined = store.challenges.get(`#${value}`);
    if (!stored) throw new Error('challenge missing');
    store.challenges.set(
      `#${value}`,
      LoginChallenge.rehydrate({ ...stored.snapshot(), attempts: 5 }),
    );
    await expect(
      verifyCode.execute({ challenge: value, totp: 'step-10', trustDevice: false }),
    ).rejects.toBeInstanceOf(ChallengeExpiredError);
  });

  it('locks the account after five wrong codes', async (): Promise<void> => {
    const { verifyCode, challenge, login } = await setup();
    const value: string = await challenge();
    for (let i: number = 0; i < 5; i++) {
      await expect(
        verifyCode.execute({ challenge: value, totp: 'wrong', trustDevice: false }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    }
    await expect(login.execute(good)).rejects.toBeInstanceOf(AccountLockedError);
  });

  it('refuses the code while the account is locked, and leaves the challenge untouched', async (): Promise<void> => {
    const { verifyCode, challenge, store } = await setup();
    const value: string = await challenge();
    const state: AdminAccountProps | undefined = [...store.accounts.values()][0]?.snapshot();
    if (!state) throw new Error('account missing');
    store.accounts.set(
      state.id,
      AdminAccount.rehydrate({ ...state, lockedUntil: new Date(START + 60_000) }),
    );
    await expect(
      verifyCode.execute({ challenge: value, totp: 'step-10', trustDevice: false }),
    ).rejects.toBeInstanceOf(AccountLockedError);
    expect(store.challenges.get(`#${value}`)?.snapshot().attempts).toBe(0);
  });

  it('rejects a TOTP code already used', async (): Promise<void> => {
    const { signIn } = await setup();
    await signIn();
    await expect(signIn()).rejects.toBeInstanceOf(InvalidCredentialsError);
    await expect(signIn({ code: 'step-11' })).resolves.toBeDefined();
  });

  it('refuses the challenge of a deleted account', async (): Promise<void> => {
    const { verifyCode, challenge, store } = await setup();
    const value: string = await challenge();
    store.accounts.clear();
    await expect(
      verifyCode.execute({ challenge: value, totp: 'step-10', trustDevice: false }),
    ).rejects.toBeInstanceOf(ChallengeExpiredError);
  });

  it('opens nothing when the challenge was consumed meanwhile', async (): Promise<void> => {
    const { verifyCode, challenge, store } = await setup();
    const value: string = await challenge();
    vi.spyOn(store.challengeRepository, 'consume').mockResolvedValue(false);
    await expect(
      verifyCode.execute({ challenge: value, totp: 'step-10', trustDevice: false }),
    ).rejects.toBeInstanceOf(ChallengeExpiredError);
    expect(store.families.size).toBe(0);
  });

  it('forgets the families whose tokens all expired', async (): Promise<void> => {
    const { signIn, store, advance } = await setup();
    await signIn();
    advance(31 * DAY);
    await signIn({ code: 'step-20' });
    expect(store.families.size).toBe(1);
    expect(store.tokens.size).toBe(1);
  });
});

describe('RefreshSession', (): void => {
  it('replaces the token on every use, within the same family', async (): Promise<void> => {
    const { signIn, refresh, store } = await setup();
    const { session: first } = await signIn();
    const second: Session = await refresh.execute(first.refreshToken);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(second.access.token).toBe(first.access.token);
    await expect(refresh.execute(second.refreshToken)).resolves.toBeDefined();
    expect(store.families.size).toBe(1);
    expect(store.locked.filter((l: string): boolean => l.startsWith('family:'))).toHaveLength(2);
  });

  it('slides a remembered session by thirty days on each use', async (): Promise<void> => {
    const { signIn, refresh, advance } = await setup();
    const { session } = await signIn();
    advance(20 * DAY);
    const next: Session = await refresh.execute(session.refreshToken);
    expect(next.persistent).toBe(true);
    expect(next.refreshExpiresAt).toEqual(new Date(START + 50 * DAY));
  });

  it('keeps a browser session a browser session', async (): Promise<void> => {
    const { signIn, refresh, advance } = await setup();
    const { session } = await signIn({ remember: false });
    advance(11 * HOUR);
    const next: Session = await refresh.execute(session.refreshToken);
    expect(next.persistent).toBe(false);
    expect(next.refreshExpiresAt).toEqual(new Date(START + 23 * HOUR));
  });

  it('ends a session ninety days after the login, however often it is used', async (): Promise<void> => {
    const { signIn, refresh, advance } = await setup();
    let { session } = await signIn();
    for (let day: number = 20; day <= 80; day += 20) {
      advance(20 * DAY);
      session = await refresh.execute(session.refreshToken);
    }
    expect(session.refreshExpiresAt).toEqual(new Date(START + 90 * DAY));
    advance(10 * DAY);
    await expect(refresh.execute(session.refreshToken)).rejects.toBeInstanceOf(InvalidSessionError);
  });

  it('revokes the whole family when an old token is replayed, descendants included', async (): Promise<void> => {
    const { signIn, refresh, store } = await setup();
    const { session: first } = await signIn();
    const second: Session = await refresh.execute(first.refreshToken);
    await expect(refresh.execute(first.refreshToken)).rejects.toBeInstanceOf(InvalidSessionError);
    expect([...store.families.values()][0]?.revokedAt).not.toBeNull();
    await expect(refresh.execute(second.refreshToken)).rejects.toBeInstanceOf(InvalidSessionError);
  });

  it('detects the replay of an expired, already rotated token', async (): Promise<void> => {
    const { signIn, refresh, store, advance } = await setup();
    const { session: first } = await signIn();
    advance(29 * DAY);
    await refresh.execute(first.refreshToken);
    advance(2 * DAY);
    await expect(refresh.execute(first.refreshToken)).rejects.toBeInstanceOf(InvalidSessionError);
    expect([...store.families.values()][0]?.revokedAt).not.toBeNull();
  });

  it('rejects an expired or unknown token without revoking anything', async (): Promise<void> => {
    const { signIn, refresh, store, advance } = await setup();
    const { session } = await signIn();
    advance(31 * DAY);
    await expect(refresh.execute(session.refreshToken)).rejects.toBeInstanceOf(InvalidSessionError);
    await expect(refresh.execute('unknown')).rejects.toBeInstanceOf(InvalidSessionError);
    expect([...store.families.values()][0]?.revokedAt).toBeNull();
    expect([...store.tokens.values()][0]?.isSpent()).toBe(false);
  });

  it('keeps the token read before the lock if it vanished meanwhile', async (): Promise<void> => {
    const { signIn, refresh, store } = await setup();
    const { session } = await signIn();
    const findByHash: (tokenHash: string) => Promise<RefreshToken | null> =
      store.tokenRepository.findByHash.bind(store.tokenRepository);
    let calls: number = 0;
    vi.spyOn(store.tokenRepository, 'findByHash').mockImplementation(
      async (hash: string): Promise<RefreshToken | null> =>
        ++calls === 2 ? null : findByHash(hash),
    );
    await expect(refresh.execute(session.refreshToken)).resolves.toBeDefined();
  });

  it('rejects the token of a family deleted meanwhile', async (): Promise<void> => {
    const { signIn, refresh, store } = await setup();
    const { session } = await signIn();
    vi.spyOn(store.tokenRepository, 'lockFamily').mockResolvedValue(null);
    await expect(refresh.execute(session.refreshToken)).rejects.toBeInstanceOf(InvalidSessionError);
  });

  it('rejects the token of a deleted account', async (): Promise<void> => {
    const { signIn, refresh, store } = await setup();
    const { session } = await signIn();
    store.accounts.clear();
    await expect(refresh.execute(session.refreshToken)).rejects.toBeInstanceOf(InvalidSessionError);
  });
});

describe('Logout', (): void => {
  it('makes every token of the session unusable, and keeps the trusted device', async (): Promise<void> => {
    const { signIn, refresh, logout, login } = await setup();
    const { session: first, device } = await signIn({ trustDevice: true });
    const second: Session = await refresh.execute(first.refreshToken);
    await logout.execute(second.refreshToken);
    await expect(refresh.execute(second.refreshToken)).rejects.toBeInstanceOf(InvalidSessionError);
    const again: LoginResult = await login.execute({ ...good, deviceToken: device?.token ?? '' });
    expect(again.status).toBe('authenticated');
  });

  it('ignores an unknown token', async (): Promise<void> => {
    const { logout, store } = await setup();
    await expect(logout.execute('unknown')).resolves.toBeUndefined();
    expect(store.locked).toEqual([]);
  });
});

describe('BootstrapAdmin', (): void => {
  it('creates the account only once, with a normalized address and no second factor', async (): Promise<void> => {
    const { bootstrap, store } = await setup(false);
    expect(account(store)).toMatchObject({
      email: 'moi@exemple.fr',
      totpSecret: null,
      pendingTotpSecret: null,
    });
    await expect(bootstrap.execute('b@exemple.fr', 'another-password')).rejects.toBeInstanceOf(
      AlreadyBootstrappedError,
    );
  });

  it('applies the password policy and returns the address only', async (): Promise<void> => {
    const store: InMemoryIdentityStore = new InMemoryIdentityStore();
    const bootstrap: BootstrapAdmin = new BootstrapAdmin(store.accountRepository, fakeHasher, {
      next: (): string => 'a1',
    });
    await expect(bootstrap.execute('moi@exemple.fr', 'short')).rejects.toBeInstanceOf(
      WeakPasswordError,
    );
    await expect(bootstrap.execute(' Moi@Exemple.fr', 'a-strong-password')).resolves.toEqual({
      email: 'moi@exemple.fr',
    });
    expect(store.accounts.get('a1')).toBeInstanceOf(AdminAccount);
  });
});

describe('Login without a second factor', (): void => {
  it('opens the session after the password alone and resets the failures', async (): Promise<void> => {
    const { login, store } = await setup(false);
    withFailures(store, 3);
    const session: Session = sessionOf(await login.execute({ ...good, remember: false }));
    expect(session.persistent).toBe(false);
    expect(session.access.token).toMatch(/^jwt-id-1-/);
    expect(account(store)).toMatchObject({ failedAttempts: 0, lastTotpStep: 0 });
    expect(store.challenges.size).toBe(0);
    expect(store.families.size).toBe(1);
  });

  it('opens a remembered session and ignores a device cookie', async (): Promise<void> => {
    const { login } = await setup(false);
    const session: Session = sessionOf(
      await login.execute({ ...good, deviceToken: 'unknown-device' }),
    );
    expect(session.persistent).toBe(true);
    expect(session.refreshExpiresAt).toEqual(new Date(START + 30 * DAY));
  });

  it('still counts a wrong password and locks the account', async (): Promise<void> => {
    const { login, store } = await setup(false);
    for (let i: number = 0; i < 5; i++) {
      await expect(login.execute({ ...good, password: 'wrong' })).rejects.toBeInstanceOf(
        InvalidCredentialsError,
      );
    }
    await expect(login.execute(good)).rejects.toBeInstanceOf(AccountLockedError);
    expect(store.families.size).toBe(0);
  });

  it('refuses a challenge opened before the second factor was turned off', async (): Promise<void> => {
    const { challenge, verifyCode, disable } = await setup();
    const value: string = await challenge();
    await disable.execute({ accountId: 'id-1', password: good.password, totp: 'step-5' });
    await expect(
      verifyCode.execute({ challenge: value, totp: 'step-10', trustDevice: false }),
    ).rejects.toBeInstanceOf(ChallengeExpiredError);
  });
});

describe('StartTwoFactorSetup', (): void => {
  it('checks the password under the account lock and stores a pending secret', async (): Promise<void> => {
    const { startSetup, store } = await setup(false);
    store.locked.length = 0;
    const enrollment: TwoFactorEnrollment = await startSetup.execute({
      accountId: 'id-1',
      password: good.password,
    });
    expect(enrollment).toEqual({
      secret: 'SECRET',
      provisioningUri: 'otpauth://totp/Portfolio:moi@exemple.fr?secret=SECRET',
    });
    expect(store.locked).toEqual(['account:id-1']);
    expect(account(store)).toMatchObject({ totpSecret: null, pendingTotpSecret: 'SECRET' });
  });

  it('replaces a previous pending secret', async (): Promise<void> => {
    const { startSetup, store } = await setup(false);
    await startSetup.execute({ accountId: 'id-1', password: good.password });
    vi.spyOn(fakeTotp, 'generateSecret').mockReturnValueOnce('NEWER');
    await startSetup.execute({ accountId: 'id-1', password: good.password });
    expect(account(store)?.pendingTotpSecret).toBe('NEWER');
  });

  it('counts a wrong password towards the lockout, then answers like a locked login', async (): Promise<void> => {
    const { startSetup, store, login } = await setup(false);
    await expect(
      startSetup.execute({ accountId: 'id-1', password: 'wrong' }),
    ).rejects.toBeInstanceOf(PasswordMismatchError);
    expect(account(store)).toMatchObject({ failedAttempts: 1, pendingTotpSecret: null });
    for (let i: number = 1; i < 5; i++) {
      await expect(
        startSetup.execute({ accountId: 'id-1', password: 'wrong' }),
      ).rejects.toBeInstanceOf(PasswordMismatchError);
    }
    await expect(
      startSetup.execute({ accountId: 'id-1', password: good.password }),
    ).rejects.toBeInstanceOf(AccountLockedError);
    await expect(login.execute(good)).rejects.toBeInstanceOf(AccountLockedError);
  });

  it('refuses while the second factor is on, and for an unknown account', async (): Promise<void> => {
    const { startSetup } = await setup();
    await expect(
      startSetup.execute({ accountId: 'id-1', password: good.password }),
    ).rejects.toBeInstanceOf(TwoFactorStateError);
    await expect(
      startSetup.execute({ accountId: 'absent', password: good.password }),
    ).rejects.toBeInstanceOf(InvalidSessionError);
  });
});

describe('EnableTwoFactor', (): void => {
  it('activates the pending secret with a fresh code, then the login asks for it', async (): Promise<void> => {
    const { startSetup, enable, store, login, status } = await setup(false);
    await startSetup.execute({ accountId: 'id-1', password: good.password });
    await expect(enable.execute({ accountId: 'id-1', totp: 'SECRET:step-7' })).resolves.toBe(
      undefined,
    );
    expect(account(store)).toMatchObject({
      totpSecret: 'SECRET',
      pendingTotpSecret: null,
      lastTotpStep: 7,
    });
    await expect(status.execute('id-1')).resolves.toEqual({ enabled: true });
    expect((await login.execute(good)).status).toBe('totp-required');
  });

  it('refuses a code of another secret or a replayed step, without counting a failure', async (): Promise<void> => {
    const { startSetup, enable, store } = await setup(false);
    await startSetup.execute({ accountId: 'id-1', password: good.password });
    await expect(
      enable.execute({ accountId: 'id-1', totp: 'OTHER:step-7' }),
    ).rejects.toBeInstanceOf(TotpInvalidError);
    await expect(enable.execute({ accountId: 'id-1', totp: 'wrong' })).rejects.toBeInstanceOf(
      TotpInvalidError,
    );
    await expect(enable.execute({ accountId: 'id-1', totp: 'step-0' })).rejects.toBeInstanceOf(
      TotpInvalidError,
    );
    expect(account(store)).toMatchObject({
      totpSecret: null,
      pendingTotpSecret: 'SECRET',
      failedAttempts: 0,
    });
  });

  it('refuses without a pending setup, while active, and for an unknown account', async (): Promise<void> => {
    const { enable } = await setup(false);
    await expect(enable.execute({ accountId: 'id-1', totp: 'step-7' })).rejects.toBeInstanceOf(
      TwoFactorStateError,
    );
    await expect(enable.execute({ accountId: 'absent', totp: 'step-7' })).rejects.toBeInstanceOf(
      InvalidSessionError,
    );
    const active: SessionFixtures = await setup();
    await expect(
      active.enable.execute({ accountId: 'id-1', totp: 'step-7' }),
    ).rejects.toBeInstanceOf(TwoFactorStateError);
  });
});

describe('DisableTwoFactor', (): void => {
  it('removes the secret and forgets every trusted device of the account', async (): Promise<void> => {
    const { signIn, disable, store, login, status } = await setup();
    await signIn({ trustDevice: true });
    store.devices.set(
      '#other',
      TrustedDevice.trust({ id: 'd', accountId: 'other', tokenHash: '#other' }, new Date(START)),
    );
    await disable.execute({ accountId: 'id-1', password: good.password, totp: 'step-11' });
    expect(account(store)).toMatchObject({
      totpSecret: null,
      pendingTotpSecret: null,
      lastTotpStep: 0,
    });
    expect([...store.devices.keys()]).toEqual(['#other']);
    await expect(status.execute('id-1')).resolves.toEqual({ enabled: false });
    expect((await login.execute(good)).status).toBe('authenticated');
  });

  it('lets a new secret be enabled in the same step as the removal', async (): Promise<void> => {
    const { signIn, disable, startSetup, enable, store } = await setup();
    await signIn();
    await disable.execute({ accountId: 'id-1', password: good.password, totp: 'step-11' });
    await startSetup.execute({ accountId: 'id-1', password: good.password });
    await expect(enable.execute({ accountId: 'id-1', totp: 'SECRET:step-11' })).resolves.toBe(
      undefined,
    );
    expect(account(store)).toMatchObject({ totpSecret: 'SECRET', lastTotpStep: 11 });
  });

  it('counts a wrong password or a wrong or replayed code towards the lockout', async (): Promise<void> => {
    const { signIn, disable, store } = await setup();
    await signIn();
    await expect(
      disable.execute({ accountId: 'id-1', password: 'wrong', totp: 'step-11' }),
    ).rejects.toBeInstanceOf(PasswordMismatchError);
    await expect(
      disable.execute({ accountId: 'id-1', password: good.password, totp: 'wrong' }),
    ).rejects.toBeInstanceOf(TotpInvalidError);
    await expect(
      disable.execute({ accountId: 'id-1', password: good.password, totp: 'step-10' }),
    ).rejects.toBeInstanceOf(TotpInvalidError);
    expect(account(store)).toMatchObject({ failedAttempts: 3, totpSecret: 'SECRET' });
  });

  it('answers a locked account like a locked login, even with both factors right', async (): Promise<void> => {
    const { disable, store } = await setup();
    withFailures(store, 4);
    await expect(
      disable.execute({ accountId: 'id-1', password: 'wrong', totp: 'step-1' }),
    ).rejects.toBeInstanceOf(PasswordMismatchError);
    await expect(
      disable.execute({ accountId: 'id-1', password: good.password, totp: 'step-1' }),
    ).rejects.toBeInstanceOf(AccountLockedError);
    expect(account(store)?.totpSecret).toBe('SECRET');
  });

  it('refuses while the second factor is off, and for an unknown account', async (): Promise<void> => {
    const { disable } = await setup(false);
    await expect(
      disable.execute({ accountId: 'id-1', password: good.password, totp: 'step-1' }),
    ).rejects.toBeInstanceOf(TwoFactorStateError);
    await expect(
      disable.execute({ accountId: 'absent', password: good.password, totp: 'step-1' }),
    ).rejects.toBeInstanceOf(InvalidSessionError);
  });
});

describe('GetTwoFactorStatus', (): void => {
  it('reports the state, and refuses an unknown account', async (): Promise<void> => {
    const { status, startSetup } = await setup(false);
    await startSetup.execute({ accountId: 'id-1', password: good.password });
    await expect(status.execute('id-1')).resolves.toEqual({ enabled: false });
    await expect(status.execute('absent')).rejects.toBeInstanceOf(InvalidSessionError);
  });
});
