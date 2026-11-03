import {
  LOGIN_CHALLENGE_TTL_MS,
  LoginChallenge,
  type AdminAccount,
  type TrustedDevice,
} from '@vfortin/identity-domain';
import { InvalidCredentialsError } from '@internal/identity-application/lib/errors/application-error';
import type {
  Clock,
  IdentityUnitOfWork,
  PasswordHasher,
} from '@internal/identity-application/lib/ports/identity/identity.ports';
import {
  type Session,
  type SessionServices,
  startSession,
} from '@internal/identity-application/lib/use-cases/open-session/open-session';

/**
 * Interface LoginCommand
 * @interface LoginCommand
 *
 * @description
 * First login step: credentials, "remember me" choice and the trusted-device token the browser holds.
 */
export interface LoginCommand {
  // #region Properties
  /**
   * Property email
   * @readonly
   *
   * @description
   * Address used to locate the account; the use case trims and lowercases it before lookup.
   *
   * @type {string}
   */
  readonly email: string;

  /**
   * Property password
   * @readonly
   *
   * @description
   * Plain credential verified against the account hash, or a decoy hash for unknown addresses.
   *
   * @type {string}
   */
  readonly password: string;

  /**
   * Property remember
   * @readonly
   *
   * @description
   * Whether the session opened by this login must outlive the browser session.
   *
   * @type {boolean}
   */
  readonly remember: boolean;

  /**
   * Property deviceToken
   * @readonly
   *
   * @description
   * Opaque trusted-device token read from the browser cookie, or `null` when the browser has none.
   *
   * @type {string | null}
   */
  readonly deviceToken: string | null;
  // #endregion
}

/**
 * Type LoginResult
 * @type LoginResult
 *
 * @description
 * Outcome of a correct password: a session at once on a trusted device, otherwise a single-use challenge
 * to send back with the one-time code before `expiresIn` seconds.
 */
export type LoginResult =
  | { readonly status: 'authenticated'; readonly session: Session }
  | { readonly status: 'totp-required'; readonly challenge: string; readonly expiresIn: number };

/**
 * Class Login
 * @class Login
 *
 * @description
 * First login step. Verifies the password under the account lock (so failed counts cannot race), then either opens the session for a device trusted by this account or opens a one-time-code challenge (`VerifyLoginCode`).
 */
export class Login {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Supplies transaction, credential and time dependencies; the decoy hash keeps unknown-address checks on the password-verification path.
   *
   * @param {IdentityUnitOfWork} unitOfWork - Transaction boundary for account, challenge, device and token updates.
   * @param {SessionServices} services - Token signing, opaque-token and identifier services.
   * @param {PasswordHasher} hasher - Password hash implementation.
   * @param {Clock} clock - Source of the attempt timestamp.
   * @param {string} decoyHash - Hash checked when the normalized email has no account.
   */
  public constructor(
    private readonly unitOfWork: IdentityUnitOfWork,
    private readonly services: SessionServices,
    private readonly hasher: PasswordHasher,
    private readonly clock: Clock,
    /** Hash verified when the address is unknown: same response time as a wrong password. */
    private readonly decoyHash: string,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * A wrong password commits the failed attempt and rejects with `InvalidCredentialsError`; an active lock propagates `AccountLockedError`. A right password resets the failures only when a trusted device skips the code: a challenge alone leaves the counter as it is, since the second factor is still unproven.
   *
   * @param {LoginCommand} command - Email, password, "remember me" and device token of the attempt.
   *
   * @returns {Promise<LoginResult>} Open session or one-time-code challenge.
   */
  public async execute(command: LoginCommand): Promise<LoginResult> {
    const now: Date = this.clock.now();
    const email: string = command.email.trim().toLowerCase();
    const { codec, ids } = this.services;
    const deviceHash: string | null =
      command.deviceToken === null ? null : codec.hash(command.deviceToken);
    const result: LoginResult | null = await this.unitOfWork.run(
      async ({ accounts, tokens, challenges, devices }): Promise<LoginResult | null> => {
        const account: AdminAccount | null = await accounts.lockByEmail(email);
        if (account === null) {
          await this.hasher.verify(command.password, this.decoyHash);
          throw new InvalidCredentialsError();
        }

        // Hash verified before the lock check: a locked account answers as slowly as the others.
        const passwordOk: boolean = await this.hasher.verify(
          command.password,
          account.passwordHash,
        );
        account.assertCanAttempt(now);
        if (!passwordOk) {
          // Returned rather than thrown: the failure must be committed.
          await accounts.save(account.failed(now));
          return null;
        }

        const device: TrustedDevice | null =
          deviceHash === null ? null : await devices.findByHash(deviceHash);
        if (device !== null && device.isTrustedFor(account.id, now)) {
          await devices.save(device.used(now));
          await accounts.save(account.succeededOnTrustedDevice());
          const session: Session = await startSession(
            this.services,
            tokens,
            account.id,
            command.remember,
            now,
          );
          return { status: 'authenticated', session };
        }

        await challenges.deleteExpired(now);
        const challenge: string = codec.generate();
        await challenges.add(
          LoginChallenge.open(
            {
              id: ids.next(),
              accountId: account.id,
              tokenHash: codec.hash(challenge),
              remember: command.remember,
            },
            now,
          ),
        );
        return { status: 'totp-required', challenge, expiresIn: LOGIN_CHALLENGE_TTL_MS / 1000 };
      },
    );
    if (result === null) {
      throw new InvalidCredentialsError();
    }
    return result;
  }
  // #endregion
}
