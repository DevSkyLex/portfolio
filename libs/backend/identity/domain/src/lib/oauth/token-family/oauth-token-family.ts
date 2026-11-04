import type { OAuthScope } from '@internal/identity-domain/lib/oauth/scope/oauth-scope';
import type { SessionFamily } from '@internal/identity-domain/lib/session/refresh-token/refresh-token';

/**
 * Interface OAuthTokenFamily
 * @interface OAuthTokenFamily
 *
 * @description
 * Refresh-token family opened by one authorization-code redemption (D45). It reuses the session
 * family design of D27: its refresh tokens are `RefreshToken`s, always "persistent" (30 days sliding,
 * 90 days at most from the redemption), rotated under the family row lock, and a replayed token
 * revokes the whole family. The tables are separate from the administrator sessions, so an MCP
 * refresh token can never open an administrator session.
 */
export interface OAuthTokenFamily extends SessionFamily {
  // #region Properties
  /**
   * Property grantId
   * @readonly
   *
   * @description
   * Consent the family was issued under; revoking the grant revokes the family.
   *
   * @type {string}
   */
  readonly grantId: string;

  /**
   * Property clientId
   * @readonly
   *
   * @description
   * Client the tokens belong to; a refresh by another client is refused.
   *
   * @type {string}
   */
  readonly clientId: string;

  /**
   * Property resource
   * @readonly
   *
   * @description
   * Audience of every access token of the family.
   *
   * @type {string}
   */
  readonly resource: string;

  /**
   * Property scopes
   * @readonly
   *
   * @description
   * Scopes approved for the code; a refresh may narrow them, never widen them.
   *
   * @type {readonly OAuthScope[]}
   */
  readonly scopes: readonly OAuthScope[];
  // #endregion
}

/**
 * Function openTokenFamily
 *
 * @description
 * Opens the family of a code redemption, persistent so that `RefreshToken.issue` gives its tokens the
 * 30-day sliding lifetime within the 90-day cap.
 *
 * @param {Omit<OAuthTokenFamily, 'createdAt' | 'persistent'>} input - Family identity and bindings.
 * @param {Date} now - Redemption instant, origin of the 90-day cap.
 *
 * @returns {OAuthTokenFamily} New family.
 */
export function openTokenFamily(
  input: Omit<OAuthTokenFamily, 'createdAt' | 'persistent'>,
  now: Date,
): OAuthTokenFamily {
  return { ...input, createdAt: now, persistent: true };
}
