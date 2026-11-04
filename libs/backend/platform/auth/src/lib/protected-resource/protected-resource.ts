import {
  MCP_SCOPES,
  MCP_SCOPE_IMPLICATIONS,
  type McpScopeName,
  PROTECTED_RESOURCE_METADATA_SUFFIX,
  type ProtectedResourceMetadata,
} from '@vfortin/identity-contracts';

/**
 * Function protectedResourceMetadataUrl
 *
 * @description
 * Public URL of a resource's RFC 9728 metadata: the well-known suffix inserted between the origin and
 * the path, e.g. `https://valentin-fortin.pro/.well-known/oauth-protected-resource/api/content/mcp`
 * for `https://valentin-fortin.pro/api/content/mcp`, the first URL MCP clients try. Nginx maps it onto
 * the service's `/api/content/mcp/.well-known/oauth-protected-resource` (D45).
 *
 * @param {string} resource - Canonical resource URI.
 *
 * @returns {string} Metadata URL, also the `resource_metadata` of the `WWW-Authenticate` challenges.
 */
export function protectedResourceMetadataUrl(resource: string): string {
  const url: URL = new URL(resource);
  const path: string = url.pathname === '/' ? '' : url.pathname;
  return `${url.origin}${PROTECTED_RESOURCE_METADATA_SUFFIX}${path}`;
}

/**
 * Interface ProtectedResourceMetadataInput
 * @interface ProtectedResourceMetadataInput
 *
 * @description
 * What the MCP resource states about itself.
 */
export interface ProtectedResourceMetadataInput {
  // #region Properties
  /** Canonical resource URI, the `aud` of its tokens. */
  readonly resource: string;
  /** Issuer of the authorization server (`AUTH_ISSUER`). */
  readonly authorizationServer: string;
  /** Scopes to advertise; every MCP scope by default. */
  readonly scopesSupported?: readonly McpScopeName[];
  /** Human-readable name. */
  readonly resourceName?: string;
  // #endregion
}

/**
 * Function protectedResourceMetadata
 *
 * @description
 * Builds the RFC 9728 document the MCP resource serves: its identifier, the one authorization server,
 * the scopes (never `offline_access`, which is no resource requirement) and Bearer tokens in the
 * `Authorization` header only.
 *
 * @param {ProtectedResourceMetadataInput} input - Resource statements.
 *
 * @returns {ProtectedResourceMetadata} Metadata document.
 */
export function protectedResourceMetadata(
  input: ProtectedResourceMetadataInput,
): ProtectedResourceMetadata {
  return {
    resource: input.resource,
    authorization_servers: [input.authorizationServer],
    scopes_supported: [...(input.scopesSupported ?? MCP_SCOPES)],
    bearer_methods_supported: ['header'],
    ...(input.resourceName === undefined ? {} : { resource_name: input.resourceName }),
  };
}

/**
 * Function effectiveScopes
 *
 * @description
 * The granted scopes and every scope they imply (`MCP_SCOPE_IMPLICATIONS`).
 *
 * @param {readonly McpScopeName[]} granted - Scopes of the token.
 *
 * @returns {ReadonlySet<McpScopeName>} Granted and implied scopes.
 */
export function effectiveScopes(granted: readonly McpScopeName[]): ReadonlySet<McpScopeName> {
  return new Set<McpScopeName>(
    granted.flatMap((scope: McpScopeName): McpScopeName[] => [
      scope,
      ...MCP_SCOPE_IMPLICATIONS[scope],
    ]),
  );
}

/**
 * Function hasScopes
 *
 * @description
 * Whether a token's scopes satisfy every required scope, honouring the hierarchy (a write, publish or
 * delete scope implies reading).
 *
 * @param {readonly McpScopeName[]} granted - Scopes of the token.
 * @param {readonly McpScopeName[]} required - Scopes the operation needs.
 *
 * @returns {boolean} Whether the operation is allowed.
 */
export function hasScopes(
  granted: readonly McpScopeName[],
  required: readonly McpScopeName[],
): boolean {
  const held: ReadonlySet<McpScopeName> = effectiveScopes(granted);
  return required.every((scope: McpScopeName): boolean => held.has(scope));
}

/**
 * Interface BearerChallenge
 * @interface BearerChallenge
 *
 * @description
 * Parameters of a `WWW-Authenticate: Bearer` challenge (RFC 6750 §3, RFC 9728 §5.1).
 */
export interface BearerChallenge {
  // #region Properties
  /** Protected resource metadata URL (`resource_metadata`). */
  readonly resourceMetadataUrl: string;
  /** Scopes the operation needs (`scope`). */
  readonly scope?: readonly string[];
  /** `invalid_request`, `invalid_token` or `insufficient_scope`; absent when no token was sent. */
  readonly error?: 'invalid_request' | 'invalid_token' | 'insufficient_scope';
  /** Human-readable `error_description`. */
  readonly errorDescription?: string;
  // #endregion
}

/**
 * Function quoted
 *
 * @description
 * Formats an RFC 9110 quoted string.
 *
 * @param {string} value - Raw value.
 *
 * @returns {string} Quoted value with `"` and `\` escaped.
 */
function quoted(value: string): string {
  return `"${value.replace(/["\\]/g, '\\$&')}"`;
}

/**
 * Function bearerChallenge
 *
 * @description
 * Builds the `WWW-Authenticate` value of a 401 (no or invalid token) or 403 (`insufficient_scope`)
 * answer of the MCP resource, which tells clients where to discover the authorization server and
 * which scopes to request, e.g.
 * `Bearer resource_metadata="https://…/.well-known/oauth-protected-resource/api/content/mcp", scope="content:read"`.
 *
 * @param {BearerChallenge} challenge - Challenge parameters.
 *
 * @returns {string} Header value.
 */
export function bearerChallenge(challenge: BearerChallenge): string {
  const parameters: string[] = [];
  if (challenge.error !== undefined) parameters.push(`error=${quoted(challenge.error)}`);
  if (challenge.scope !== undefined && challenge.scope.length > 0) {
    parameters.push(`scope=${quoted(challenge.scope.join(' '))}`);
  }
  parameters.push(`resource_metadata=${quoted(challenge.resourceMetadataUrl)}`);
  if (challenge.errorDescription !== undefined) {
    parameters.push(`error_description=${quoted(challenge.errorDescription)}`);
  }
  return `Bearer ${parameters.join(', ')}`;
}
