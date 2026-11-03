import { TrustedDevice, type AdminAccount, type LoginChallenge } from '@vfortin/identity-domain';
import {
  ChallengeExpiredError,
  InvalidCredentialsError,
} from '@internal/identity-application/lib/errors/application-error';
import type {
  Clock,
  IdentityUnitOfWork,
  TotpVerifier,
} from '@internal/identity-application/lib/ports/identity/identity.ports';
import {
  type Session,
  type SessionServices,
  startSession,
} from '@internal/identity-application/lib/use-cases/open-session/open-session';

/**
 * Interface VerifyLoginCodeCommand
 * @interface VerifyLoginCodeCommand
 *
 * @description
 * Second login step: the challenge of the first step, the one-time code and the trust choice.
 */
export interface VerifyLoginCodeCommand {
  // #region Properties
  /**
   * Property challenge
   * @readonly
   *
   * @description
   * Opaque challenge returned by `Login`.
   *
   * @type {string}
   */
  readonly challenge: string;

  /**
   * Property totp
   * @readonly
   *
   * @description
   * Time-based one-time password checked against the account secret and current time.
   *
   * @type {string}
   */
  readonly totp: string;

  /**
   * Property trustDevice
   * @readonly
   *
   * @description
   * Whether this browser may skip the code at the next logins of the same account.
   *
   * @type {boolean}
   */
  readonly trustDevice: boolean;
  // #endregion
}

/**
 * Interface IssuedDevice
 * @interface IssuedDevice
 *
 * @description
 * Trusted-device credential returned to the HTTP adapter for its cookie.
 */
export interface IssuedDevice {
  // #region Properties
  /**
   * Property token
   * @readonly
   *
   * @description
   * Opaque bearer token; only its hash is stored.
   *
   * @type {string}
   */
  readonly token: string;

  /**
   * Property expiresAt
   * @readonly
   *
   * @description
   * Fixed expiry of the trust, used as the cookie expiration.
   *
   * @type {Date}
   */
  readonly expiresAt: Date;
  // #endregion
}

/**
 * Interface VerifiedLogin
 * @interface VerifiedLogin
 *
 * @description
 * Session opened by the second step, and the trusted device when one was requested.
 */
export interface VerifiedLogin {
  // #region Properties
  /**
   * Property session
   * @readonly
   *
   * @description
   * Access and refresh credentials of the new session.
   *
   * @type {Session}
   */
  readonly session: Session;

  /**
   * Property device
   * @readonly
   *
   * @description
   * New trusted device, or `null` when the browser was not to be trusted.
   *
   * @type {IssuedDevice | null}
   */
  readonly device: IssuedDevice | null;
  // #endregion
}

/**
 * Class VerifyLoginCode
 * @class VerifyLoginCode
 *
 * @description
 * Second login step. The challenge row is locked first, then the account row, so parallel submissions of one challenge run one after the other: the first right code consumes it and the others find it used.
 */
export class VerifyLoginCode {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Supplies transaction, one-time-code and time dependencies.
   *
   * @param {IdentityUnitOfWork} unitOfWork - Transaction boundary for challenge, account, device and token updates.
   * @param {SessionServices} services - Token signing, opaque-token and identifier services.
   * @param {TotpVerifier} totp - Time-based code verifier.
   * @param {Clock} clock - Source of the attempt timestamp.
   */
  public constructor(
    private readonly unitOfWork: IdentityUnitOfWork,
    private readonly services: SessionServices,
    private readonly totp: TotpVerifier,
    private readonly clock: Clock,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * An unknown, used, expired or exhausted challenge rejects with `ChallengeExpiredError`; an active account lock propagates `AccountLockedError`. A wrong or replayed code commits one more attempt on the challenge and one more failure on the account (toward the lockout), then rejects with `InvalidCredentialsError`. A right code consumes the challenge, records the TOTP step and opens a session with the challenge's "remember me" choice.
   *
   * @param {VerifyLoginCodeCommand} command - Challenge, code and trust choice.
   *
   * @returns {Promise<VerifiedLogin>} New session and, when asked, the trusted device.
   */
  public async execute(command: VerifyLoginCodeCommand): Promise<VerifiedLogin> {
    const now: Date = this.clock.now();
    const { codec, ids } = this.services;
    const hash: string = codec.hash(command.challenge);
    const verified: VerifiedLogin | null = await this.unitOfWork.run(
      async ({ accounts, tokens, challenges, devices }): Promise<VerifiedLogin | null> => {
        const challenge: LoginChallenge | null = await challenges.lockByHash(hash);
        if (challenge === null || !challenge.isUsable(now)) {
          throw new ChallengeExpiredError();
        }
        const account: AdminAccount | null = await accounts.lockById(challenge.accountId);
        if (account === null) {
          throw new ChallengeExpiredError();
        }
        account.assertCanAttempt(now);

        const step: number | null = this.totp.verify(account.totpSecret, command.totp, now);
        if (step === null || !account.isFreshTotpStep(step)) {
          // Returned rather than thrown: both counters must be committed.
          await challenges.save(challenge.failed());
          await accounts.save(account.failed(now));
          return null;
        }
        if (!(await challenges.consume(challenge.id, now))) {
          throw new ChallengeExpiredError();
        }
        await accounts.save(account.succeeded(step));
        const session: Session = await startSession(
          this.services,
          tokens,
          account.id,
          challenge.remember,
          now,
        );
        if (!command.trustDevice) {
          return { session, device: null };
        }

        await devices.deleteExpired(now);
        const token: string = codec.generate();
        const device: TrustedDevice = TrustedDevice.trust(
          { id: ids.next(), accountId: account.id, tokenHash: codec.hash(token) },
          now,
        );
        await devices.add(device);
        return { session, device: { token, expiresAt: device.expiresAt } };
      },
    );
    if (verified === null) {
      throw new InvalidCredentialsError();
    }
    return verified;
  }
  // #endregion
}
