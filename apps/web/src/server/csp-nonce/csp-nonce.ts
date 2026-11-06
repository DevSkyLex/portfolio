/**
 * Value of `ngCspNonce` on `<app-root>` in `index.html` (D20 revision). The build copies it onto
 * Angular's inline scripts (event replay contract) and the server render onto the replay call; each
 * response replaces it with the request's nonce.
 */
export const CSP_NONCE_PLACEHOLDER = 'ng-csp-nonce-placeholder' as const;

/** Request header through which Nginx passes the nonce of its `Content-Security-Policy` header. */
export const CSP_NONCE_HEADER = 'x-csp-nonce' as const;

/**
 * Returns the nonce Nginx put in the response's CSP (`$request_id`, 32 hex digits), or a fresh random
 * one when the request did not come through Nginx (development server, e2e preview): the placeholder
 * must never reach a page as a reusable value.
 */
export function cspNonce(header: string | string[] | undefined): string {
  return typeof header === 'string' && /^[0-9a-f]{32}$/.test(header)
    ? header
    : Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte: number): string =>
        byte.toString(16).padStart(2, '0'),
      ).join('');
}

/** Puts the request's nonce in place of every placeholder of a rendered page. */
export function withCspNonce(html: string, nonce: string): string {
  return html.replaceAll(CSP_NONCE_PLACEHOLDER, nonce);
}
