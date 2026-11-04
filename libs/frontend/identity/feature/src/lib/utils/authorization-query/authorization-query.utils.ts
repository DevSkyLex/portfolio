import type { ParamMap } from '@angular/router';
import type { AuthorizationReviewRequest } from '@vfortin/identity-web-data-access';

/**
 * Constant AUTHORIZATION_PARAMETERS
 *
 * @description
 * Query parameters of the authorization endpoint forwarded for review; any other is ignored.
 *
 * @type {readonly (keyof AuthorizationReviewRequest)[]}
 */
const AUTHORIZATION_PARAMETERS: readonly (keyof AuthorizationReviewRequest)[] = [
  'response_type',
  'client_id',
  'redirect_uri',
  'scope',
  'state',
  'code_challenge',
  'code_challenge_method',
  'resource',
];

/**
 * Constant LOOPBACK_HOSTS
 *
 * @description
 * Hosts a plain HTTP client redirect may target (the server accepts nothing else either).
 *
 * @type {ReadonlySet<string>}
 */
const LOOPBACK_HOSTS: ReadonlySet<string> = new Set<string>(['127.0.0.1', '[::1]', 'localhost']);

/**
 * Function toAuthorizationQuery
 *
 * @description
 * Collects the authorization parameters of the page URL; a repeated one is forwarded as a list (at
 * most eight values) so the server refuses it.
 *
 * @param {ParamMap} query - Route query parameters.
 *
 * @returns {AuthorizationReviewRequest} Body of the review request.
 */
export function toAuthorizationQuery(query: ParamMap): AuthorizationReviewRequest {
  const request: Record<string, string | string[]> = {};
  for (const name of AUTHORIZATION_PARAMETERS) {
    const values: string[] = query.getAll(name);
    if (values.length === 1) {
      request[name] = values[0] ?? '';
    } else if (values.length > 1) {
      request[name] = values.slice(0, 8);
    }
  }
  return request;
}

/**
 * Function clientRedirectHost
 *
 * @description
 * Host of a redirect the server returned, when the page may follow it: `https`, or plain HTTP to
 * the loopback interface. The server already matched it with the client's registration; this keeps
 * the page from ever leaving for another kind of address.
 *
 * @param {string} url - Redirect URL.
 *
 * @returns {string | null} Its host, or `null` when the page must not follow it.
 */
export function clientRedirectHost(url: string): string | null {
  if (!URL.canParse(url)) {
    return null;
  }
  const target: URL = new URL(url);
  return target.protocol === 'https:' ||
    (target.protocol === 'http:' && LOOPBACK_HOSTS.has(target.hostname))
    ? target.host
    : null;
}
