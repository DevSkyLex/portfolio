import type { OAuthScope } from '@internal/identity-domain/lib/oauth/scope/oauth-scope';

/**
 * Constant AUTHORIZATION_REQUEST_TTL_MS
 *
 * @description
 * Time the owner has to approve or refuse a validated authorization request, in milliseconds.
 *
 * @type {number}
 */
export const AUTHORIZATION_REQUEST_TTL_MS: number = 10 * 60 * 1000;

/**
 * Interface AuthorizationRequestProps
 * @interface AuthorizationRequestProps
 *
 * @description
 * Validated authorization request waiting for the owner's decision, bound to the administrator
 * session that reviewed it.
 */
export interface AuthorizationRequestProps {
  // #region Properties
  /** Request identifier handed to the consent page. */
  readonly id: string;
  /** Administrator who reviewed it. */
  readonly accountId: string;
  /** Administrator session (`sid`) that reviewed it: only that session may decide. */
  readonly sessionId: string;
  /** Client identifier. */
  readonly clientId: string;
  /** Redirect URI as presented, matched against the client's registration. */
  readonly redirectUri: string;
  /** Requested scopes, canonical. */
  readonly scopes: readonly OAuthScope[];
  /** Resource (RFC 8707) the tokens will be audience-bound to. */
  readonly resource: string;
  /** Client `state`, echoed in the redirect; `null` when absent. */
  readonly state: string | null;
  /** PKCE `S256` challenge. */
  readonly codeChallenge: string;
  /** Review instant. */
  readonly createdAt: Date;
  /** Instant from which the decision is refused. */
  readonly expiresAt: Date;
  /** Decision instant, `null` while pending. */
  readonly decidedAt: Date | null;
  // #endregion
}

/**
 * Class AuthorizationRequest
 * @class AuthorizationRequest
 *
 * @description
 * Pending consent (D45). It is decided once, before its expiry, by the administrator session that
 * reviewed it: the bearer-authenticated decision routes cannot be forged cross-site, and binding the
 * session keeps another session from approving a request it never saw.
 */
export class AuthorizationRequest {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores request state.
   *
   * @param {AuthorizationRequestProps} props - Request state.
   */
  private constructor(private readonly props: AuthorizationRequestProps) {}
  // #endregion

  // #region Methods
  /**
   * Method open
   * @method open
   * @static
   *
   * @description
   * Opens a pending request expiring `AUTHORIZATION_REQUEST_TTL_MS` after `now`.
   *
   * @param {Omit<AuthorizationRequestProps, 'createdAt' | 'expiresAt' | 'decidedAt'>} input - Validated parameters.
   * @param {Date} now - Review instant.
   *
   * @returns {AuthorizationRequest} Pending request.
   */
  public static open(
    input: Omit<AuthorizationRequestProps, 'createdAt' | 'expiresAt' | 'decidedAt'>,
    now: Date,
  ): AuthorizationRequest {
    return new AuthorizationRequest({
      ...input,
      createdAt: now,
      expiresAt: new Date(now.getTime() + AUTHORIZATION_REQUEST_TTL_MS),
      decidedAt: null,
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
   * @param {AuthorizationRequestProps} props - Persisted state.
   *
   * @returns {AuthorizationRequest} Restored request.
   */
  public static rehydrate(props: AuthorizationRequestProps): AuthorizationRequest {
    return new AuthorizationRequest(props);
  }

  /**
   * Method values
   * @method values
   *
   * @description
   * Returns the request parameters.
   *
   * @returns {AuthorizationRequestProps} Request state.
   */
  public get values(): AuthorizationRequestProps {
    return this.props;
  }

  /**
   * Method isDecidableBy
   * @method isDecidableBy
   *
   * @description
   * Whether this administrator session may still decide: undecided, before expiry, same account and
   * same session.
   *
   * @param {string} accountId - Deciding administrator.
   * @param {string} sessionId - Deciding session.
   * @param {Date} now - Decision instant.
   *
   * @returns {boolean} Whether the decision is accepted.
   */
  public isDecidableBy(accountId: string, sessionId: string, now: Date): boolean {
    return (
      this.props.decidedAt === null &&
      this.props.expiresAt.getTime() > now.getTime() &&
      this.props.accountId === accountId &&
      this.props.sessionId === sessionId
    );
  }

  /**
   * Method decided
   * @method decided
   *
   * @description
   * Returns the state after the decision.
   *
   * @param {Date} now - Decision instant.
   *
   * @returns {AuthorizationRequest} Decided request.
   */
  public decided(now: Date): AuthorizationRequest {
    return new AuthorizationRequest({ ...this.props, decidedAt: now });
  }

  /**
   * Method snapshot
   * @method snapshot
   *
   * @description
   * Returns a shallow copy for persistence.
   *
   * @returns {AuthorizationRequestProps} Request state.
   */
  public snapshot(): AuthorizationRequestProps {
    return { ...this.props };
  }
  // #endregion
}
