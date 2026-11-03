/**
 * Constant HOUR_MS
 *
 * @description
 * Milliseconds in one hour, the unit of the session lifetimes below.
 *
 * @type {number}
 */
const HOUR_MS: number = 3600 * 1000;

/**
 * Constant PERSISTENT_REFRESH_TTL_MS
 *
 * @description
 * Lifetime of a refresh token in a "remember me" session, in milliseconds from issuance. Each rotation
 * issues a new token, so the session slides while it is used, up to `SESSION_MAX_AGE_MS`.
 *
 * @type {number}
 */
export const PERSISTENT_REFRESH_TTL_MS: number = 30 * 24 * HOUR_MS;

/**
 * Constant SESSION_REFRESH_TTL_MS
 *
 * @description
 * Lifetime of a refresh token in a browser session (no "remember me"), in milliseconds from issuance;
 * its cookie also ends with the browser session.
 *
 * @type {number}
 */
export const SESSION_REFRESH_TTL_MS: number = 12 * HOUR_MS;

/**
 * Constant SESSION_MAX_AGE_MS
 *
 * @description
 * Absolute lifetime of a session family from its creation, in milliseconds: no rotation extends a token
 * beyond it, so a stolen but regularly refreshed session still ends.
 *
 * @type {number}
 */
export const SESSION_MAX_AGE_MS: number = 90 * 24 * HOUR_MS;

/**
 * Interface SessionFamily
 * @interface SessionFamily
 *
 * @description
 * Login session grouping the refresh tokens of one sign-in; its creation time and persistence decide the
 * expiry of every token issued in it.
 */
export interface SessionFamily {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Family identifier, also the `sid` claim of the access tokens issued for the session.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property accountId
   * @readonly
   *
   * @description
   * Account that owns the session.
   *
   * @type {string}
   */
  readonly accountId: string;

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * Sign-in instant, origin of `SESSION_MAX_AGE_MS`.
   *
   * @type {Date}
   */
  readonly createdAt: Date;

  /**
   * Property persistent
   * @readonly
   *
   * @description
   * Whether the administrator asked to be remembered: selects the token lifetime and a persistent cookie.
   *
   * @type {boolean}
   */
  readonly persistent: boolean;
  // #endregion
}

/**
 * Interface RefreshTokenProps
 * @interface RefreshTokenProps
 *
 * @description
 * Persisted token state, including its owning session family and rotation or revocation timestamps.
 */
export interface RefreshTokenProps {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable identifier assigned when the token is issued.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property familyId
   * @readonly
   *
   * @description
   * Identifier shared by tokens from one login and used to revoke the session family on replay.
   *
   * @type {string}
   */
  readonly familyId: string;

  /**
   * Property accountId
   * @readonly
   *
   * @description
   * Identifier of the account that owns this refresh token.
   *
   * @type {string}
   */
  readonly accountId: string;

  /**
   * Property tokenHash
   * @readonly
   *
   * @description
   * Hash used to look up the token; the bearer value itself is not persisted.
   *
   * @type {string}
   */
  readonly tokenHash: string;

  /**
   * Property expiresAt
   * @readonly
   *
   * @description
   * Expiry instant, at which the token is considered expired.
   *
   * @type {Date}
   */
  readonly expiresAt: Date;

  /**
   * Property rotatedAt
   * @readonly
   *
   * @description
   * Replacement instant, or `null` while the token has not been exchanged.
   *
   * @type {Date | null}
   */
  readonly rotatedAt: Date | null;

  /**
   * Property revokedAt
   * @readonly
   *
   * @description
   * Revocation instant, or `null` while the token remains unrevoked.
   *
   * @type {Date | null}
   */
  readonly revokedAt: Date | null;
  // #endregion
}

/**
 * Class RefreshToken
 * @class RefreshToken
 *
 * @description
 * Models a persisted refresh token whose use replaces it and whose family can be revoked on replay.
 */
export class RefreshToken {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores token state created by issuance or restored from persistence.
   *
   * @param {RefreshTokenProps} props - Token state to retain.
   */
  private constructor(private readonly props: RefreshTokenProps) {}
  // #endregion

  // #region Methods
  /**
   * Method issue
   * @method issue
   * @static
   *
   * @description
   * Creates an unspent token in the family. It lives `PERSISTENT_REFRESH_TTL_MS` or
   * `SESSION_REFRESH_TTL_MS` from `now`, capped at the family's `SESSION_MAX_AGE_MS`.
   *
   * @param {Pick<RefreshTokenProps, 'id' | 'tokenHash'>} input - Token identifier and stored hash.
   * @param {SessionFamily} family - Session the token belongs to.
   * @param {Date} now - Issuance time used as the lifetime origin.
   *
   * @returns {RefreshToken} Newly issued token state.
   */
  public static issue(
    input: Pick<RefreshTokenProps, 'id' | 'tokenHash'>,
    family: SessionFamily,
    now: Date,
  ): RefreshToken {
    const ttl: number = family.persistent ? PERSISTENT_REFRESH_TTL_MS : SESSION_REFRESH_TTL_MS;
    const cap: number = family.createdAt.getTime() + SESSION_MAX_AGE_MS;
    return new RefreshToken({
      ...input,
      familyId: family.id,
      accountId: family.accountId,
      expiresAt: new Date(Math.min(now.getTime() + ttl, cap)),
      rotatedAt: null,
      revokedAt: null,
    });
  }

  /**
   * Method rehydrate
   * @method rehydrate
   * @static
   *
   * @description
   * Restores token state exactly as persisted, without recalculating expiry or timestamps.
   *
   * @param {RefreshTokenProps} props - Persisted token state.
   *
   * @returns {RefreshToken} Restored token.
   */
  public static rehydrate(props: RefreshTokenProps): RefreshToken {
    return new RefreshToken(props);
  }

  /**
   * Method familyId
   * @method familyId
   *
   * @description
   * Returns the session family identifier used for grouped revocation.
   *
   * @returns {string} Session family identifier.
   */
  public get familyId(): string {
    return this.props.familyId;
  }

  /**
   * Method accountId
   * @method accountId
   *
   * @description
   * Returns the identifier of the account that owns the token.
   *
   * @returns {string} Owner account identifier.
   */
  public get accountId(): string {
    return this.props.accountId;
  }

  /**
   * Method expiresAt
   * @method expiresAt
   *
   * @description
   * Returns the expiry instant calculated at issuance or restored from storage.
   *
   * @returns {Date} Token expiry instant.
   */
  public get expiresAt(): Date {
    return this.props.expiresAt;
  }

  /**
   * Method isSpent
   * @method isSpent
   *
   * @description
   * Reports whether this token was replaced or revoked and therefore cannot be used again.
   *
   * @returns {boolean} Whether the token has a rotation or revocation timestamp.
   */
  public isSpent(): boolean {
    return this.props.rotatedAt !== null || this.props.revokedAt !== null;
  }

  /**
   * Method isExpired
   * @method isExpired
   *
   * @description
   * Treats the expiry instant itself as expired, using the supplied clock value.
   *
   * @param {Date} now - Time against which expiry is evaluated.
   *
   * @returns {boolean} Whether expiry is at or before `now`.
   */
  public isExpired(now: Date): boolean {
    return this.props.expiresAt.getTime() <= now.getTime();
  }

  /**
   * Method snapshot
   * @method snapshot
   *
   * @description
   * Returns a shallow copy of token state for persistence.
   *
   * @returns {RefreshTokenProps} Copy of the current token state.
   */
  public snapshot(): RefreshTokenProps {
    return { ...this.props };
  }
  // #endregion
}
