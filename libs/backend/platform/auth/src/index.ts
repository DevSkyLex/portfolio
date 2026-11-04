/**
 * Public authorization exports
 *
 * @description
 * Exposes the Nest administrator guard, route decorator, configurable module and verifier contracts to service composition.
 */
export {
  ADMIN_TOKEN_VERIFIER,
  AdminAuthModule,
  AdminGuard,
  AdminOnly,
  JoseAdminTokenVerifier,
  type AdminAuthOptions,
  type AdminTokenVerifier,
} from '@internal/backend-auth/lib/admin-auth/admin-auth';

/**
 * MCP resource-server exports
 *
 * @description
 * Exposes the MCP access-token verifier, its guard and `@McpScope` decorator, and the RFC 9728
 * metadata and `WWW-Authenticate` helpers the MCP endpoint uses (D45).
 */
export {
  JoseMcpTokenVerifier,
  MCP_AUTH_OPTIONS,
  MCP_REQUIRED_SCOPES,
  MCP_TOKEN_VERIFIER,
  McpAuthModule,
  McpScope,
  McpTokenGuard,
  mcpPrincipalOf,
  type McpAuthOptions,
  type McpPrincipal,
  type McpTokenVerifier,
} from '@internal/backend-auth/lib/mcp-auth/mcp-auth';
export {
  bearerChallenge,
  effectiveScopes,
  hasScopes,
  protectedResourceMetadata,
  protectedResourceMetadataUrl,
  type BearerChallenge,
  type ProtectedResourceMetadataInput,
} from '@internal/backend-auth/lib/protected-resource/protected-resource';
