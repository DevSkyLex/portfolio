/**
 * Class DomainError
 * @class DomainError
 *
 * @description
 * Represents an identity business-rule failure with a stable code consumed by transport mapping.
 */
export class DomainError extends Error {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Sets the stable identity error code and message used by application and transport layers.
   *
   * @param {string} code - Stable code identifying the failed business rule.
   * @param {string} message - Human-readable explanation of the failure.
   */
  public constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
  // #endregion
}

/**
 * Class AccountLockedError
 * @class AccountLockedError
 * @extends DomainError
 *
 * @description
 * Indicates that repeated failed sign-ins temporarily prevent further authentication attempts.
 */
export class AccountLockedError extends DomainError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Records the instant when authentication can resume and assigns the stable lock error code.
   *
   * @param {Date} until - Instant when the account lock expires.
   */
  public constructor(public readonly until: Date) {
    super('identity.locked', 'Account locked after several failures; try again later.');
    this.name = 'AccountLockedError';
  }
  // #endregion
}

/**
 * Class WeakPasswordError
 * @class WeakPasswordError
 * @extends DomainError
 *
 * @description
 * Indicates that a password is shorter than the minimum length required for administrator credentials.
 */
export class WeakPasswordError extends DomainError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Assigns the stable weak-password code used by identity error mapping.
   */
  public constructor() {
    super('identity.weak-password', 'The password must be at least 12 characters long.');
    this.name = 'WeakPasswordError';
  }
  // #endregion
}

/**
 * Class TwoFactorStateError
 * @class TwoFactorStateError
 * @extends DomainError
 *
 * @description
 * Indicates a second-factor change the current state does not allow: an enrollment or confirmation while
 * the code is on, a confirmation without a pending enrollment, or a removal while it is off.
 */
export class TwoFactorStateError extends DomainError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Assigns the stable second-factor state code.
   */
  public constructor() {
    super('identity.totp-state', 'The one-time code cannot change from its current state.');
    this.name = 'TwoFactorStateError';
  }
  // #endregion
}

/**
 * Type OAuthErrorCode
 * @type OAuthErrorCode
 *
 * @description
 * Error codes of the OAuth protocol responses: RFC 6749 §4.1.2.1 and §5.2, RFC 7591 §3.2.2 and
 * RFC 8707 (`invalid_target`).
 */
export type OAuthErrorCode =
  | 'invalid_request'
  | 'invalid_client'
  | 'invalid_grant'
  | 'unauthorized_client'
  | 'unsupported_grant_type'
  | 'unsupported_response_type'
  | 'invalid_scope'
  | 'access_denied'
  | 'invalid_target'
  | 'invalid_redirect_uri'
  | 'invalid_client_metadata'
  | 'temporarily_unavailable';

/**
 * Class OAuthError
 * @class OAuthError
 * @extends DomainError
 *
 * @description
 * Refusal of an OAuth request (D45), carrying the protocol error code and an English description
 * safe to return to the client: it never echoes a secret (code, verifier, token).
 */
export class OAuthError extends DomainError {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Sets the protocol error, mirrored in the stable code `oauth.<error>`.
   *
   * @param {OAuthErrorCode} error - Protocol error code.
   * @param {string} description - Human-readable `error_description`.
   */
  public constructor(
    public readonly error: OAuthErrorCode,
    public readonly description: string,
  ) {
    super(`oauth.${error}`, description);
    this.name = 'OAuthError';
  }
  // #endregion
}
