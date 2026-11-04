import { OAuthError } from '@internal/identity-domain/lib/errors/domain-error';

/**
 * Constant OAUTH_SCOPES
 *
 * @description
 * Closed list of the scopes the authorization server grants, in canonical order (D45): reading,
 * writing, publishing and deleting the content administration. No scope reaches the contact messages.
 * Mirrors `MCP_SCOPES` of the identity contracts (checked by the composition tests).
 */
export const OAUTH_SCOPES = [
  'content:read',
  'content:write',
  'content:publish',
  'content:delete',
] as const;

/**
 * Type OAuthScope
 * @type OAuthScope
 *
 * @description
 * One grantable scope.
 */
export type OAuthScope = (typeof OAUTH_SCOPES)[number];

/**
 * Constant OFFLINE_ACCESS
 *
 * @description
 * Scope some clients add to ask for a refresh token: accepted and dropped, since every code exchange
 * already returns one.
 *
 * @type {string}
 */
export const OFFLINE_ACCESS = 'offline_access' as const;

/**
 * Constant DEFAULT_OAUTH_SCOPES
 *
 * @description
 * Scopes of a request that names none: reading only, the least privilege.
 *
 * @type {readonly OAuthScope[]}
 */
export const DEFAULT_OAUTH_SCOPES: readonly OAuthScope[] = ['content:read'];

/**
 * Constant MAX_SCOPE_LENGTH
 *
 * @description
 * Longest accepted `scope` parameter, in characters.
 *
 * @type {number}
 */
export const MAX_SCOPE_LENGTH = 512 as const;

/**
 * Function isOAuthScope
 *
 * @description
 * Narrows a token to a grantable scope.
 *
 * @param {string} value - Candidate scope token.
 *
 * @returns {boolean} Whether the token is one of `OAUTH_SCOPES`.
 */
export function isOAuthScope(value: string): value is OAuthScope {
  return (OAUTH_SCOPES as readonly string[]).includes(value);
}

/**
 * Function canonicalScopes
 *
 * @description
 * Deduplicates scopes and puts them in the canonical order of `OAUTH_SCOPES`.
 *
 * @param {Iterable<OAuthScope>} scopes - Scopes in any order.
 *
 * @returns {readonly OAuthScope[]} Ordered distinct scopes.
 */
export function canonicalScopes(scopes: Iterable<OAuthScope>): readonly OAuthScope[] {
  const set: Set<OAuthScope> = new Set<OAuthScope>(scopes);
  return OAUTH_SCOPES.filter((scope: OAuthScope): boolean => set.has(scope));
}

/**
 * Function parseScopes
 *
 * @description
 * Parses a space-delimited `scope` parameter (RFC 6749 §3.3). `offline_access` is dropped; an empty or
 * absent parameter gives `DEFAULT_OAUTH_SCOPES`; an unknown token, including any contact scope, fails.
 *
 * @param {string | null} raw - Parameter value, `null` when absent.
 *
 * @returns {readonly OAuthScope[]} Requested scopes in canonical order.
 *
 * @throws {OAuthError} `invalid_scope` for an unknown token or an over-long parameter.
 */
export function parseScopes(raw: string | null): readonly OAuthScope[] {
  if (raw !== null && raw.length > MAX_SCOPE_LENGTH) {
    throw new OAuthError('invalid_scope', 'The scope parameter is too long.');
  }
  const tokens: string[] = (raw ?? '')
    .split(' ')
    .filter((token: string): boolean => token !== '' && token !== OFFLINE_ACCESS);
  const unknown: string | undefined = tokens.find((token: string): boolean => !isOAuthScope(token));
  if (unknown !== undefined) {
    throw new OAuthError('invalid_scope', 'A requested scope is not supported.');
  }
  return tokens.length === 0
    ? DEFAULT_OAUTH_SCOPES
    : canonicalScopes(tokens.filter((token: string): token is OAuthScope => isOAuthScope(token)));
}

/**
 * Function formatScopes
 *
 * @description
 * Formats scopes as the space-delimited `scope` value of a token or a response.
 *
 * @param {readonly OAuthScope[]} scopes - Scopes to format.
 *
 * @returns {string} Canonical space-delimited list.
 */
export function formatScopes(scopes: readonly OAuthScope[]): string {
  return canonicalScopes(scopes).join(' ');
}

/**
 * Function includesScopes
 *
 * @description
 * Whether a granted set contains every requested scope, compared literally: a refresh may narrow the
 * scopes of its grant but never widen them.
 *
 * @param {readonly OAuthScope[]} granted - Scopes held.
 * @param {readonly OAuthScope[]} requested - Scopes asked for.
 *
 * @returns {boolean} Whether `requested` is a subset of `granted`.
 */
export function includesScopes(
  granted: readonly OAuthScope[],
  requested: readonly OAuthScope[],
): boolean {
  return requested.every((scope: OAuthScope): boolean => granted.includes(scope));
}
