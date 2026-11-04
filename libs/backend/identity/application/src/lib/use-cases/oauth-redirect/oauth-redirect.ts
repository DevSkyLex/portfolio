/**
 * Function authorizationRedirect
 *
 * @description
 * Builds the authorization response sent back through the browser (RFC 6749 §4.1.2): the validated
 * redirect URI with its own query kept, the given parameters appended form-encoded, then `iss`
 * (RFC 9207), which MCP clients compare with the issuer they discovered to defeat mix-up attacks.
 * Absent (`null`) parameters are left out.
 *
 * @param {string} redirectUri - Redirect URI already matched against the client's registration.
 * @param {Readonly<Record<string, string | null>>} parameters - `code` or `error` fields and `state`.
 * @param {string} issuer - Issuer identifier of the authorization server.
 *
 * @returns {string} Absolute URL to send the browser to.
 */
export function authorizationRedirect(
  redirectUri: string,
  parameters: Readonly<Record<string, string | null>>,
  issuer: string,
): string {
  const url: URL = new URL(redirectUri);
  for (const [name, value] of Object.entries(parameters)) {
    if (value !== null) {
      url.searchParams.append(name, value);
    }
  }
  url.searchParams.append('iss', issuer);
  return url.href;
}
