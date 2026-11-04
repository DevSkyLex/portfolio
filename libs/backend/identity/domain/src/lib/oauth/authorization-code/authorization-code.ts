import type { OAuthScope } from '@internal/identity-domain/lib/oauth/scope/oauth-scope';

/**
 * Constant AUTHORIZATION_CODE_TTL_MS
 *
 * @description
 * Lifetime of an authorization code, in milliseconds: the client redeems it right after the redirect
 * (OAuth 2.1 recommends at most ten minutes; D45 keeps one).
 *
 * @type {number}
 */
export const AUTHORIZATION_CODE_TTL_MS: number = 60 * 1000;

/**
 * Interface AuthorizationCodeProps
 * @interface AuthorizationCodeProps
 *
 * @description
 * Persisted authorization code: only its hash is stored, with everything the token request must
 * match and the family it opened once redeemed.
 */
export interface AuthorizationCodeProps {
  // #region Properties
  /** Code identifier. */
  readonly id: string;
  /** Hash of the opaque code handed to the client. */
  readonly codeHash: string;
  /** Administrator who consented. */
  readonly accountId: string;
  /** Client the code was issued to. */
  readonly clientId: string;
  /** Grant the code was issued under. */
  readonly grantId: string;
  /** Redirect URI of the authorization request, required again at redemption. */
  readonly redirectUri: string;
  /** Approved scopes. */
  readonly scopes: readonly OAuthScope[];
  /** Resource the tokens are bound to. */
  readonly resource: string;
  /** PKCE `S256` challenge. */
  readonly codeChallenge: string;
  /** Issuance instant. */
  readonly createdAt: Date;
  /** Instant from which the code is refused. */
  readonly expiresAt: Date;
  /** Redemption instant, `null` while unused. */
  readonly consumedAt: Date | null;
  /** Token family opened by the redemption, revoked if the code is replayed. */
  readonly familyId: string | null;
  // #endregion
}

/**
 * Class AuthorizationCode
 * @class AuthorizationCode
 *
 * @description
 * Single-use, short-lived authorization code (D45). A second redemption is a replay: it is refused
 * and the tokens issued from the first one are revoked (OAuth 2.1 §4.1.3).
 */
export class AuthorizationCode {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores code state.
   *
   * @param {AuthorizationCodeProps} props - Code state.
   */
  private constructor(private readonly props: AuthorizationCodeProps) {}
  // #endregion

  // #region Methods
  /**
   * Method issue
   * @method issue
   * @static
   *
   * @description
   * Issues an unused code expiring `AUTHORIZATION_CODE_TTL_MS` after `now`.
   *
   * @param {Omit<AuthorizationCodeProps, 'createdAt' | 'expiresAt' | 'consumedAt' | 'familyId'>} input - Code hash and bound parameters.
   * @param {Date} now - Issuance instant.
   *
   * @returns {AuthorizationCode} New code.
   */
  public static issue(
    input: Omit<AuthorizationCodeProps, 'createdAt' | 'expiresAt' | 'consumedAt' | 'familyId'>,
    now: Date,
  ): AuthorizationCode {
    return new AuthorizationCode({
      ...input,
      createdAt: now,
      expiresAt: new Date(now.getTime() + AUTHORIZATION_CODE_TTL_MS),
      consumedAt: null,
      familyId: null,
    });
  }

  /**
   * Method rehydrate
   * @method rehydrate
   * @static
   *
   * @description
   * Restores persisted state.
   *
   * @param {AuthorizationCodeProps} props - Persisted state.
   *
   * @returns {AuthorizationCode} Restored code.
   */
  public static rehydrate(props: AuthorizationCodeProps): AuthorizationCode {
    return new AuthorizationCode(props);
  }

  /**
   * Method values
   * @method values
   *
   * @description
   * Returns the code state.
   *
   * @returns {AuthorizationCodeProps} Code state.
   */
  public get values(): AuthorizationCodeProps {
    return this.props;
  }

  /**
   * Method isConsumed
   * @method isConsumed
   *
   * @description
   * Whether the code was already redeemed.
   *
   * @returns {boolean} Whether a redemption would be a replay.
   */
  public get isConsumed(): boolean {
    return this.props.consumedAt !== null;
  }

  /**
   * Method isExpired
   * @method isExpired
   *
   * @description
   * Treats the expiry instant itself as expired.
   *
   * @param {Date} now - Current time.
   *
   * @returns {boolean} Whether the code is too old.
   */
  public isExpired(now: Date): boolean {
    return this.props.expiresAt.getTime() <= now.getTime();
  }

  /**
   * Method snapshot
   * @method snapshot
   *
   * @description
   * Returns a shallow copy for persistence.
   *
   * @returns {AuthorizationCodeProps} Code state.
   */
  public snapshot(): AuthorizationCodeProps {
    return { ...this.props };
  }
  // #endregion
}
