/** Canonicalizes legacy page URLs without redirecting assets or service endpoints. */
export function legacyLocaleRedirect(path: string, originalUrl: string): string | null {
  if (
    /^\/(?:fr|en)(?:\/|$)/.test(path) ||
    /^\/(?:api|media|health)(?:\/|$)/.test(path) ||
    /\.[^/]+$/.test(path)
  )
    return null;
  // Prefixing a local request target preserves its query without accepting an external redirect.
  return `/fr${originalUrl.startsWith('/') ? originalUrl : path}`;
}
