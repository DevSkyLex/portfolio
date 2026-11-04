import { OAuthError } from '@internal/identity-domain/lib/errors/domain-error';

/**
 * Constant MAX_URI_LENGTH
 *
 * @description
 * Longest accepted client identifier, redirect, client or logo URI, in characters.
 *
 * @type {number}
 */
export const MAX_URI_LENGTH = 512 as const;

/**
 * Constant LOOPBACK_HOSTS
 *
 * @description
 * Hosts of the loopback interface accepted in plain HTTP redirect URIs (RFC 8252 §7.3; `localhost` is
 * tolerated because native MCP clients use it).
 *
 * @type {ReadonlySet<string>}
 */
const LOOPBACK_HOSTS: ReadonlySet<string> = new Set<string>(['127.0.0.1', '[::1]', 'localhost']);

/**
 * Function parseUrl
 *
 * @description
 * Parses an absolute URL, or returns `null`.
 *
 * @param {string} value - Candidate URL.
 *
 * @returns {URL | null} Parsed URL.
 */
function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/**
 * Function isLoopbackUrl
 *
 * @description
 * Whether a parsed URL is plain HTTP to the loopback interface.
 *
 * @param {URL} url - Parsed URL.
 *
 * @returns {boolean} Whether the URL targets this computer over HTTP.
 */
function isLoopbackUrl(url: URL): boolean {
  return url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname);
}

/**
 * Function assertRedirectUri
 *
 * @description
 * Checks a redirect URI a client registers or presents: absolute, at most `MAX_URI_LENGTH`, without
 * fragment or user information, and either `https` or plain HTTP to the loopback interface (the MCP
 * authorization specification allows nothing else; private-use schemes are refused).
 *
 * @param {string} value - Redirect URI.
 *
 * @returns {string} The same value, unchanged: redirect URIs are compared as strings.
 *
 * @throws {OAuthError} `invalid_redirect_uri` when a rule fails.
 */
export function assertRedirectUri(value: string): string {
  const url: URL | null = value.length <= MAX_URI_LENGTH ? parseUrl(value) : null;
  if (
    url === null ||
    url.hash !== '' ||
    value.includes('#') ||
    url.username !== '' ||
    url.password !== '' ||
    (url.protocol !== 'https:' && !isLoopbackUrl(url))
  ) {
    throw new OAuthError(
      'invalid_redirect_uri',
      'Redirect URIs must be https or loopback http, without fragment or credentials.',
    );
  }
  return value;
}

/**
 * Function isLoopbackRedirect
 *
 * @description
 * Whether a redirect URI goes to this computer, where any local program could listen: the consent
 * screen warns about it.
 *
 * @param {string} value - Registered or presented redirect URI.
 *
 * @returns {boolean} Whether it is plain HTTP to the loopback interface.
 */
export function isLoopbackRedirect(value: string): boolean {
  const url: URL | null = parseUrl(value);
  return url !== null && isLoopbackUrl(url);
}

/**
 * Function redirectUriMatches
 *
 * @description
 * Compares a presented redirect URI with a registered one: exact string equality, except that a
 * loopback HTTP URI may use any port, as native clients bind an ephemeral one (RFC 8252 §7.3,
 * OAuth 2.1 §8.4.2); scheme, host, path and query must still be identical.
 *
 * @param {string} registered - URI from the client's metadata.
 * @param {string} presented - URI of the authorization request.
 *
 * @returns {boolean} Whether the presented URI is allowed by the registered one.
 */
export function redirectUriMatches(registered: string, presented: string): boolean {
  if (registered === presented) {
    return true;
  }
  const expected: URL | null = parseUrl(registered);
  const actual: URL | null = parseUrl(presented);
  if (expected === null || actual === null || !isLoopbackUrl(expected) || !isLoopbackUrl(actual)) {
    return false;
  }
  return (
    expected.hostname === actual.hostname &&
    expected.pathname === actual.pathname &&
    expected.search === actual.search &&
    !presented.includes('#')
  );
}

/**
 * Function hostOf
 *
 * @description
 * Host (with a non-default port) of a URI, shown to the owner on the consent screen and the list of
 * connected applications.
 *
 * @param {string} value - URI.
 *
 * @returns {string} Its host, or the value itself when it does not parse.
 */
export function hostOf(value: string): string {
  return parseUrl(value)?.host ?? value;
}
