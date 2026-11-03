import {
  AdminAccount,
  MAX_FAILED_ATTEMPTS,
  assertPasswordPolicy,
  type AdminAccountProps,
} from '@internal/identity-domain/lib/account/admin-account';
import {
  AccountLockedError,
  WeakPasswordError,
} from '@internal/identity-domain/lib/errors/domain-error';
import {
  LOGIN_CHALLENGE_TTL_MS,
  LoginChallenge,
  MAX_CHALLENGE_ATTEMPTS,
} from '@internal/identity-domain/lib/session/login-challenge/login-challenge';
import {
  PERSISTENT_REFRESH_TTL_MS,
  RefreshToken,
  SESSION_MAX_AGE_MS,
  SESSION_REFRESH_TTL_MS,
  type SessionFamily,
  type RefreshTokenProps,
} from '@internal/identity-domain/lib/session/refresh-token/refresh-token';
import {
  TRUSTED_DEVICE_TTL_MS,
  TrustedDevice,
} from '@internal/identity-domain/lib/session/trusted-device/trusted-device';

/**
 * Constant now
 *
 * @description
 * Fixed instant used to make account lock and refresh expiry assertions deterministic.
 *
 * @type {Date}
 */
const now: Date = new Date('2026-11-02T10:00:00Z');

/**
 * Function account
 *
 * @description
 * Creates a fresh administrator with a deliberately mixed-case, padded email to exercise normalization.
 *
 * @returns {AdminAccount} New domain account fixture.
 */
const account = (): AdminAccount =>
  AdminAccount.create({
    id: 'a1',
    email: ' Moi@Exemple.FR ',
    passwordHash: 'hash',
    totpSecret: 'SECRET',
  });

describe('AdminAccount', (): void => {
  it('normalizes the e-mail address and exposes its credentials', (): void => {
    const created: AdminAccount = account();
    expect(created.email).toBe('moi@exemple.fr');
    expect([created.id, created.passwordHash, created.totpSecret]).toEqual([
      'a1',
      'hash',
      'SECRET',
    ]);
  });

  it(`locks after ${MAX_FAILED_ATTEMPTS} failures, for 15 minutes`, (): void => {
    let current: AdminAccount = account();
    for (let i: number = 0; i < MAX_FAILED_ATTEMPTS; i++) current = current.failed(now);
    expect((): void => current.assertCanAttempt(now)).toThrow(AccountLockedError);
    expect((): void =>
      current.assertCanAttempt(new Date(now.getTime() + 15 * 60_000)),
    ).not.toThrow();
    expect(current.snapshot().failedAttempts).toBe(0);
  });

  it('tells until when the account is locked', (): void => {
    let current: AdminAccount = account();
    for (let i: number = 0; i < MAX_FAILED_ATTEMPTS; i++) current = current.failed(now);
    try {
      current.assertCanAttempt(now);
      expect.unreachable();
    } catch (error: unknown) {
      expect((error as AccountLockedError).until).toEqual(new Date(now.getTime() + 15 * 60_000));
      expect((error as AccountLockedError).code).toBe('identity.locked');
    }
  });

  it('resets the failures after a successful login', (): void => {
    const current: AdminAccountProps = account().failed(now).failed(now).succeeded(42).snapshot();
    expect(current).toMatchObject({ failedAttempts: 0, lastTotpStep: 42, lockedUntil: null });
  });

  it('rejects an already used TOTP code', (): void => {
    const current: AdminAccount = account().succeeded(100);
    expect(current.isFreshTotpStep(100)).toBe(false);
    expect(current.isFreshTotpStep(99)).toBe(false);
    expect(current.isFreshTotpStep(101)).toBe(true);
  });

  it('clears the failures on a trusted device without touching the accepted TOTP step', (): void => {
    const current: AdminAccountProps = account()
      .succeeded(42)
      .failed(now)
      .succeededOnTrustedDevice()
      .snapshot();
    expect(current).toMatchObject({ failedAttempts: 0, lastTotpStep: 42, lockedUntil: null });
  });

  it('rehydrates a stored account unchanged', (): void => {
    const stored: AdminAccountProps = account().succeeded(7).snapshot();
    expect(AdminAccount.rehydrate(stored).snapshot()).toEqual(stored);
  });

  it('requires a 12-character password', (): void => {
    expect((): void => assertPasswordPolicy('too-short')).toThrow(WeakPasswordError);
    expect((): void => assertPasswordPolicy('long-enough-this-time')).not.toThrow();
  });
});

describe('RefreshToken', (): void => {
  /**
   * Function family
   *
   * @description
   * Builds a session family created at the fixed test time.
   *
   * @param {boolean} persistent - Whether the session is remembered.
   * @param {Date} createdAt - Family creation time; defaults to the fixed test time.
   *
   * @returns {SessionFamily} Family fixture.
   */
  const family = (persistent: boolean, createdAt: Date = now): SessionFamily => ({
    id: 'f',
    accountId: 'a',
    createdAt,
    persistent,
  });

  /**
   * Function issued
   *
   * @description
   * Creates a refresh-token fixture with the fixed test time and deterministic identifiers.
   *
   * @param {boolean} persistent - Whether the family is remembered.
   *
   * @returns {RefreshToken} Newly issued token fixture.
   */
  const issued = (persistent: boolean = true): RefreshToken =>
    RefreshToken.issue({ id: 't', tokenHash: 'h' }, family(persistent), now);

  it('expires after thirty days in a remembered session', (): void => {
    const token: RefreshToken = issued();
    expect(PERSISTENT_REFRESH_TTL_MS).toBe(30 * 24 * 3600_000);
    expect(token.expiresAt).toEqual(new Date(now.getTime() + PERSISTENT_REFRESH_TTL_MS));
    expect(token.isExpired(new Date(token.expiresAt.getTime() - 1))).toBe(false);
    expect(token.isExpired(token.expiresAt)).toBe(true);
    expect(token.isSpent()).toBe(false);
    expect([token.familyId, token.accountId]).toEqual(['f', 'a']);
  });

  it('expires after twelve hours in a browser session', (): void => {
    expect(SESSION_REFRESH_TTL_MS).toBe(12 * 3600_000);
    expect(issued(false).expiresAt).toEqual(new Date(now.getTime() + SESSION_REFRESH_TTL_MS));
  });

  it('never outlives the ninety days of its family', (): void => {
    const createdAt: Date = new Date(now.getTime() - SESSION_MAX_AGE_MS + 3600_000);
    const token: RefreshToken = RefreshToken.issue(
      { id: 't', tokenHash: 'h' },
      family(true, createdAt),
      now,
    );
    expect(SESSION_MAX_AGE_MS).toBe(90 * 24 * 3600_000);
    expect(token.expiresAt).toEqual(new Date(createdAt.getTime() + SESSION_MAX_AGE_MS));
  });

  it('is spent once rotated or revoked', (): void => {
    const props: RefreshTokenProps = issued().snapshot();
    expect(RefreshToken.rehydrate({ ...props, rotatedAt: now }).isSpent()).toBe(true);
    expect(RefreshToken.rehydrate({ ...props, revokedAt: now }).isSpent()).toBe(true);
  });
});

describe('LoginChallenge', (): void => {
  /**
   * Function opened
   *
   * @description
   * Opens a challenge fixture at the fixed test time.
   *
   * @returns {LoginChallenge} New challenge fixture.
   */
  const opened = (): LoginChallenge =>
    LoginChallenge.open({ id: 'c', accountId: 'a', tokenHash: 'h', remember: true }, now);

  it('lasts five minutes', (): void => {
    const challenge: LoginChallenge = opened();
    expect(LOGIN_CHALLENGE_TTL_MS).toBe(5 * 60_000);
    expect(challenge.expiresAt).toEqual(new Date(now.getTime() + LOGIN_CHALLENGE_TTL_MS));
    expect(challenge.isUsable(new Date(challenge.expiresAt.getTime() - 1))).toBe(true);
    expect(challenge.isUsable(challenge.expiresAt)).toBe(false);
    expect([challenge.id, challenge.accountId, challenge.remember]).toEqual(['c', 'a', true]);
  });

  it(`is refused after ${MAX_CHALLENGE_ATTEMPTS} wrong codes`, (): void => {
    let challenge: LoginChallenge = opened();
    for (let i: number = 1; i < MAX_CHALLENGE_ATTEMPTS; i++) challenge = challenge.failed();
    expect(challenge.isUsable(now)).toBe(true);
    challenge = challenge.failed();
    expect(challenge.snapshot().attempts).toBe(MAX_CHALLENGE_ATTEMPTS);
    expect(challenge.isUsable(now)).toBe(false);
  });

  it('opens a single session', (): void => {
    const challenge: LoginChallenge = opened().consumed(now);
    expect(challenge.isUsable(now)).toBe(false);
    expect(LoginChallenge.rehydrate(challenge.snapshot()).snapshot().consumedAt).toEqual(now);
  });
});

describe('TrustedDevice', (): void => {
  /**
   * Function trusted
   *
   * @description
   * Trusts a device fixture at the fixed test time.
   *
   * @returns {TrustedDevice} New device fixture.
   */
  const trusted = (): TrustedDevice =>
    TrustedDevice.trust({ id: 'd', accountId: 'a', tokenHash: 'h' }, now);

  it('is trusted for its account only, for thirty days that its use does not extend', (): void => {
    const device: TrustedDevice = trusted();
    expect(TRUSTED_DEVICE_TTL_MS).toBe(30 * 24 * 3600_000);
    expect(device.id).toBe('d');
    expect(device.isTrustedFor('a', now)).toBe(true);
    expect(device.isTrustedFor('b', now)).toBe(false);
    const used: TrustedDevice = device.used(new Date(now.getTime() + 3600_000));
    expect(used.expiresAt).toEqual(new Date(now.getTime() + TRUSTED_DEVICE_TTL_MS));
    expect(used.snapshot().lastUsedAt).toEqual(new Date(now.getTime() + 3600_000));
    expect(used.isTrustedFor('a', used.expiresAt)).toBe(false);
  });

  it('is no longer trusted once revoked', (): void => {
    const device: TrustedDevice = TrustedDevice.rehydrate({
      ...trusted().snapshot(),
      revokedAt: now,
    });
    expect(device.isTrustedFor('a', now)).toBe(false);
  });
});
