/**
 * Function canonicalResource
 *
 * @description
 * Normalizes a resource indicator (RFC 8707) for comparison: an absolute URL without fragment,
 * scheme and host lower-cased by the URL parser, default port dropped, trailing slash of the path
 * ignored (the MCP specification asks servers to accept those variants of the canonical URI).
 *
 * @param {string} value - Presented or configured resource.
 *
 * @returns {string | null} Comparable form, or `null` when the value is not an acceptable resource.
 */
function canonicalResource(value: string): string | null {
  if (value.includes('#')) {
    return null;
  }
  try {
    const url: URL = new URL(value);
    if (url.username !== '' || url.password !== '') {
      return null;
    }
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}${url.search}`;
  } catch {
    return null;
  }
}

/**
 * Function matchesResource
 *
 * @description
 * Whether the resource a client asked for is the one the authorization server issues tokens for.
 *
 * @param {string} presented - `resource` parameter.
 * @param {string} expected - Configured MCP resource.
 *
 * @returns {boolean} Whether both designate the same resource.
 */
export function matchesResource(presented: string, expected: string): boolean {
  const candidate: string | null = canonicalResource(presented);
  return candidate !== null && candidate === canonicalResource(expected);
}
