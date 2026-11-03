import { RefreshToken, type SessionFamily } from '@vfortin/identity-domain';
import type {
  AccessToken,
  IdGenerator,
  RefreshTokenCodec,
  RefreshTokenRepository,
  TokenSigner,
} from '@internal/identity-application/lib/ports/identity/identity.ports';

/**
 * Interface Session
 * @interface Session
 *
 * @description
 * Credentials returned after authentication or refresh, with the refresh expiry and persistence used to set its cookie.
 */
export interface Session {
  // #region Properties
  /**
   * Property access
   * @readonly
   *
   * @description
   * Signed access token and its validity duration for authenticated API requests.
   *
   * @type {AccessToken}
   */
  readonly access: AccessToken;

  /**
   * Property refreshToken
   * @readonly
   *
   * @description
   * Opaque bearer token returned to the HTTP adapter for an `HttpOnly` cookie.
   *
   * @type {string}
   */
  readonly refreshToken: string;

  /**
   * Property refreshExpiresAt
   * @readonly
   *
   * @description
   * Absolute expiry of the refresh token, used as the cookie expiration of a persistent session.
   *
   * @type {Date}
   */
  readonly refreshExpiresAt: Date;

  /**
   * Property persistent
   * @readonly
   *
   * @description
   * Whether the administrator asked to be remembered; otherwise the refresh cookie is a browser-session
   * cookie, dropped when the browser closes.
   *
   * @type {boolean}
   */
  readonly persistent: boolean;
  // #endregion
}

/**
 * Interface SessionServices
 * @interface SessionServices
 *
 * @description
 * Stateless services used when issuing session credentials; transactional token persistence is passed separately.
 */
export interface SessionServices {
  // #region Properties
  /**
   * Property signer
   * @readonly
   *
   * @description
   * Signs the account's short-lived access token.
   *
   * @type {TokenSigner}
   */
  readonly signer: TokenSigner;

  /**
   * Property codec
   * @readonly
   *
   * @description
   * Generates the opaque refresh, challenge and device credentials and hashes them before persistence.
   *
   * @type {RefreshTokenCodec}
   */
  readonly codec: RefreshTokenCodec;

  /**
   * Property ids
   * @readonly
   *
   * @description
   * Generates identifiers for new token, family, challenge and device records.
   *
   * @type {IdGenerator}
   */
  readonly ids: IdGenerator;
  // #endregion
}

/**
 * Function openSession
 *
 * @description
 * Generates and persists a hashed refresh token in the supplied family, then signs an access token bound to that family (`sid`). The caller owns the transaction that makes persistence atomic with the surrounding use case.
 *
 * @param {SessionServices} services - Signing, refresh-token codec and identifier services.
 * @param {RefreshTokenRepository} tokens - Transaction-bound repository that stores the token.
 * @param {SessionFamily} family - Session family used for expiry, rotation and grouped revocation.
 * @param {Date} now - Shared issuance time for token expiry and signing.
 *
 * @returns {Promise<Session>} Access credentials and the opaque refresh token with its expiry.
 */
export async function openSession(
  services: SessionServices,
  tokens: RefreshTokenRepository,
  family: SessionFamily,
  now: Date,
): Promise<Session> {
  const refreshToken: string = services.codec.generate();
  const token: RefreshToken = RefreshToken.issue(
    { id: services.ids.next(), tokenHash: services.codec.hash(refreshToken) },
    family,
    now,
  );
  await tokens.add(token);
  return {
    access: await services.signer.sign(family.accountId, family.id, now),
    refreshToken,
    refreshExpiresAt: token.expiresAt,
    persistent: family.persistent,
  };
}

/**
 * Function startSession
 *
 * @description
 * Opens a new session family for a completed login and issues its first credentials, after deleting the families whose tokens all expired. Runs in the caller's transaction.
 *
 * @param {SessionServices} services - Signing, refresh-token codec and identifier services.
 * @param {RefreshTokenRepository} tokens - Transaction-bound repository that stores the family and token.
 * @param {string} accountId - Account that signed in.
 * @param {boolean} persistent - "Remember me" choice of the login.
 * @param {Date} now - Login time, origin of the family lifetime.
 *
 * @returns {Promise<Session>} First credentials of the session.
 */
export async function startSession(
  services: SessionServices,
  tokens: RefreshTokenRepository,
  accountId: string,
  persistent: boolean,
  now: Date,
): Promise<Session> {
  await tokens.deleteExpiredFamilies(now);
  const family: SessionFamily = { id: services.ids.next(), accountId, createdAt: now, persistent };
  await tokens.addFamily(family);
  return openSession(services, tokens, family, now);
}
