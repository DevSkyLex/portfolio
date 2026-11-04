import { z } from 'zod/mini';

/*
 * Contracts of the OAuth 2.1 authorization server that lets MCP clients act on the content
 * administration (D45): scope vocabulary, discovery documents, protocol messages, the administrator's
 * consent and connected-application routes, and the claims of the access tokens the MCP resource
 * verifies. No scope reaches the contact messages.
 */

/**
 * Constant MCP_SCOPES
 *
 * @description
 * Closed list of the scopes an MCP client can be granted, in canonical order. `content:write`,
 * `content:publish` and `content:delete` each imply `content:read` (`MCP_SCOPE_IMPLICATIONS`).
 */
export const MCP_SCOPES = [
  'content:read',
  'content:write',
  'content:publish',
  'content:delete',
] as const;

/**
 * Type McpScopeName
 * @type McpScopeName
 *
 * @description
 * One scope of `MCP_SCOPES`.
 */
export type McpScopeName = (typeof MCP_SCOPES)[number];

/**
 * Constant MCP_SCOPE_IMPLICATIONS
 *
 * @description
 * Narrower scopes each scope grants as well: a resource checks a requirement against the granted
 * scopes and what they imply (the MCP authorization specification asks servers to honour hierarchies).
 */
export const MCP_SCOPE_IMPLICATIONS: Readonly<Record<McpScopeName, readonly McpScopeName[]>> = {
  'content:read': [],
  'content:write': ['content:read'],
  'content:publish': ['content:read'],
  'content:delete': ['content:read'],
};

/**
 * Constant OFFLINE_ACCESS_SCOPE
 *
 * @description
 * Scope some clients add to ask for a refresh token. Accepted and ignored: every authorization-code
 * exchange returns a refresh token, and the access token never carries it.
 */
export const OFFLINE_ACCESS_SCOPE = 'offline_access' as const;

/**
 * Constant MCP_RESOURCE_PATH
 *
 * @description
 * Path of the MCP endpoint served by content-service; with the site origin it forms the resource
 * identifier (RFC 8707) that the access tokens are audience-bound to.
 */
export const MCP_RESOURCE_PATH = '/api/content/mcp' as const;

/**
 * Constant OAUTH_AUTHORIZE_PATH
 *
 * @description
 * Client-rendered administration page acting as the authorization endpoint: it requires the normal
 * administrator login, then shows the consent screen.
 */
export const OAUTH_AUTHORIZE_PATH = '/admin/oauth/authorize' as const;

/**
 * Constant AUTHORIZATION_SERVER_METADATA_SUFFIX
 *
 * @description
 * Well-known suffix of RFC 8414. The public document lives at the path-insertion form
 * (`/.well-known/oauth-authorization-server/api/auth`); Nginx maps it onto the identity service's own
 * `/api/auth/.well-known/oauth-authorization-server`.
 */
export const AUTHORIZATION_SERVER_METADATA_SUFFIX =
  '/.well-known/oauth-authorization-server' as const;

/**
 * Constant PROTECTED_RESOURCE_METADATA_SUFFIX
 *
 * @description
 * Well-known suffix of RFC 9728, inserted between the origin and the path of the resource.
 */
export const PROTECTED_RESOURCE_METADATA_SUFFIX = '/.well-known/oauth-protected-resource' as const;

/**
 * Constant McpTokenClaimsSchema
 *
 * @description
 * Claims of an MCP access token beyond the registered ones checked by value (`iss`, `aud`, `exp`):
 * the administrator, the client it was issued to and the space-separated granted scopes (RFC 9068).
 */
export const McpTokenClaimsSchema = z.object({
  sub: z.string().check(z.minLength(1)),
  client_id: z.string().check(z.minLength(1), z.maxLength(512)),
  scope: z.string().check(z.minLength(1), z.maxLength(512)),
  jti: z.string().check(z.minLength(1)),
});

/**
 * Type McpTokenClaims
 * @type McpTokenClaims
 *
 * @description
 * Parsed MCP access token claims.
 */
export type McpTokenClaims = z.infer<typeof McpTokenClaimsSchema>;

/**
 * Constant AuthorizationServerMetadataSchema
 *
 * @description
 * RFC 8414 document published by the identity service, with the fields MCP clients read: PKCE
 * `S256` only, public clients only, the RFC 9207 `iss` parameter and Client ID Metadata Documents.
 */
export const AuthorizationServerMetadataSchema = z.object({
  issuer: z.url(),
  authorization_endpoint: z.url(),
  token_endpoint: z.url(),
  registration_endpoint: z.url(),
  revocation_endpoint: z.url(),
  jwks_uri: z.url(),
  scopes_supported: z.array(z.string()),
  response_types_supported: z.array(z.literal('code')),
  response_modes_supported: z.array(z.literal('query')),
  grant_types_supported: z.array(z.enum(['authorization_code', 'refresh_token'])),
  token_endpoint_auth_methods_supported: z.array(z.literal('none')),
  revocation_endpoint_auth_methods_supported: z.array(z.literal('none')),
  code_challenge_methods_supported: z.array(z.literal('S256')),
  authorization_response_iss_parameter_supported: z.literal(true),
  client_id_metadata_document_supported: z.literal(true),
});

/**
 * Type AuthorizationServerMetadata
 * @type AuthorizationServerMetadata
 *
 * @description
 * Authorization server metadata document.
 */
export type AuthorizationServerMetadata = z.infer<typeof AuthorizationServerMetadataSchema>;

/**
 * Constant ProtectedResourceMetadataSchema
 *
 * @description
 * RFC 9728 document the MCP resource publishes; built by `protectedResourceMetadata` in
 * `@vfortin/backend-auth`.
 */
export const ProtectedResourceMetadataSchema = z.object({
  resource: z.url(),
  authorization_servers: z.array(z.url()).check(z.minLength(1)),
  scopes_supported: z.array(z.enum(MCP_SCOPES)),
  bearer_methods_supported: z.array(z.literal('header')),
  resource_name: z.optional(z.string()),
});

/**
 * Type ProtectedResourceMetadata
 * @type ProtectedResourceMetadata
 *
 * @description
 * Protected resource metadata document.
 */
export type ProtectedResourceMetadata = z.infer<typeof ProtectedResourceMetadataSchema>;

/**
 * Constant OAUTH_PARAMETER_MAX_LENGTH
 *
 * @description
 * Longest accepted value of one protocol parameter: client identifiers, redirect URIs and
 * `state` stay far below it, and the request bodies are capped at 8 KiB anyway.
 */
export const OAUTH_PARAMETER_MAX_LENGTH = 2048 as const;

/**
 * Constant ProtocolParameterSchema
 *
 * @description
 * One query or form parameter: a string, or several when it was repeated (refused later with
 * `invalid_request`, since OAuth parameters must not appear twice).
 */
const ProtocolParameterSchema = z.optional(
  z.union([
    z.string().check(z.maxLength(OAUTH_PARAMETER_MAX_LENGTH)),
    z.array(z.string().check(z.maxLength(OAUTH_PARAMETER_MAX_LENGTH))).check(z.maxLength(8)),
  ]),
);

/**
 * Constant TokenRequestSchema
 *
 * @description
 * Fields of `POST /api/auth/oauth/token` (form-encoded): the authorization-code exchange with its PKCE
 * verifier, or a refresh, both for a public client identified by `client_id`. Required fields are
 * checked by the token endpoint so that a missing one answers `invalid_request`.
 */
export const TokenRequestSchema = z.object({
  grant_type: ProtocolParameterSchema,
  code: ProtocolParameterSchema,
  redirect_uri: ProtocolParameterSchema,
  client_id: ProtocolParameterSchema,
  code_verifier: ProtocolParameterSchema,
  refresh_token: ProtocolParameterSchema,
  resource: ProtocolParameterSchema,
  scope: ProtocolParameterSchema,
});

/**
 * Type TokenRequest
 * @type TokenRequest
 *
 * @description
 * Raw token endpoint parameters.
 */
export type TokenRequest = z.infer<typeof TokenRequestSchema>;

/**
 * Constant TokenResponseSchema
 *
 * @description
 * Successful token response (RFC 6749 §5.1): a Bearer access token, its lifetime in seconds, the
 * rotating refresh token and the granted scopes.
 */
export const TokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('Bearer'),
  expires_in: z.int(),
  refresh_token: z.string(),
  scope: z.string(),
});

/**
 * Type TokenResponse
 * @type TokenResponse
 *
 * @description
 * Token endpoint answer.
 */
export type TokenResponse = z.infer<typeof TokenResponseSchema>;

/**
 * Constant RevocationRequestSchema
 *
 * @description
 * Fields of `POST /api/auth/oauth/revoke` (RFC 7009).
 */
export const RevocationRequestSchema = z.object({
  token: ProtocolParameterSchema,
  token_type_hint: ProtocolParameterSchema,
  client_id: ProtocolParameterSchema,
});

/**
 * Type RevocationRequest
 * @type RevocationRequest
 *
 * @description
 * Raw revocation parameters.
 */
export type RevocationRequest = z.infer<typeof RevocationRequestSchema>;

/**
 * Constant OAuthErrorResponseSchema
 *
 * @description
 * Error body of the protocol endpoints (RFC 6749 §5.2, RFC 7591 §3.2.2, RFC 8707 `invalid_target`).
 */
export const OAuthErrorResponseSchema = z.object({
  error: z.string(),
  error_description: z.optional(z.string()),
});

/**
 * Type OAuthErrorResponse
 * @type OAuthErrorResponse
 *
 * @description
 * Protocol error body.
 */
export type OAuthErrorResponse = z.infer<typeof OAuthErrorResponseSchema>;

/**
 * Constant ClientRegistrationResponseSchema
 *
 * @description
 * Answer of `POST /api/auth/oauth/register` (RFC 7591 §3.2.1). The request body is validated by the
 * domain rules shared with Client ID Metadata Documents, so it has no schema of its own.
 */
export const ClientRegistrationResponseSchema = z.object({
  client_id: z.string(),
  client_id_issued_at: z.int(),
  client_name: z.optional(z.string()),
  client_uri: z.optional(z.string()),
  logo_uri: z.optional(z.string()),
  redirect_uris: z.array(z.string()),
  grant_types: z.array(z.enum(['authorization_code', 'refresh_token'])),
  response_types: z.array(z.literal('code')),
  token_endpoint_auth_method: z.literal('none'),
});

/**
 * Type ClientRegistrationResponse
 * @type ClientRegistrationResponse
 *
 * @description
 * Dynamic client registration answer.
 */
export type ClientRegistrationResponse = z.infer<typeof ClientRegistrationResponseSchema>;

/**
 * Constant AuthorizationReviewRequestSchema
 *
 * @description
 * Body of `POST /api/auth/admin/oauth/authorizations`: the query parameters the consent page
 * received at the authorization endpoint, forwarded as they are for validation.
 */
export const AuthorizationReviewRequestSchema = z.object({
  response_type: ProtocolParameterSchema,
  client_id: ProtocolParameterSchema,
  redirect_uri: ProtocolParameterSchema,
  scope: ProtocolParameterSchema,
  state: ProtocolParameterSchema,
  code_challenge: ProtocolParameterSchema,
  code_challenge_method: ProtocolParameterSchema,
  resource: ProtocolParameterSchema,
});

/**
 * Type AuthorizationReviewRequest
 * @type AuthorizationReviewRequest
 *
 * @description
 * Authorization request parameters submitted for review.
 */
export type AuthorizationReviewRequest = z.infer<typeof AuthorizationReviewRequestSchema>;

/**
 * Constant ClientRegistrationKindSchema
 *
 * @description
 * How the client is known: a Client ID Metadata Document fetched from its `https` client identifier,
 * or a dynamic registration (RFC 7591) whose metadata nobody vouches for.
 */
export const ClientRegistrationKindSchema = z.enum(['metadata-document', 'dynamic']);

/**
 * Type ClientRegistrationKind
 * @type ClientRegistrationKind
 *
 * @description
 * Client registration mechanism.
 */
export type ClientRegistrationKind = z.infer<typeof ClientRegistrationKindSchema>;

/**
 * Constant AuthorizationConsentSchema
 *
 * @description
 * Review answer when the owner must decide: the pending request, what the consent screen shows about
 * the client (name, `data:` logo fetched by the server, how it is registered, the redirect host) and
 * the requested scopes.
 */
export const AuthorizationConsentSchema = z.object({
  status: z.literal('consent'),
  requestId: z.string(),
  /** Seconds left to decide. */
  expiresIn: z.int(),
  client: z.object({
    clientId: z.string(),
    name: z.nullable(z.string()),
    clientUri: z.nullable(z.string()),
    logo: z.nullable(z.string()),
    registration: ClientRegistrationKindSchema,
  }),
  redirectUri: z.string(),
  redirectHost: z.string(),
  /** Whether the redirect goes to this computer (loopback), which any local program can listen on. */
  loopbackRedirect: z.boolean(),
  scopes: z.array(z.enum(MCP_SCOPES)),
  /** Scopes already granted to this client, so the screen can tell an extension from a first consent. */
  grantedScopes: z.array(z.enum(MCP_SCOPES)),
  resource: z.string(),
});

/**
 * Constant AuthorizationRedirectSchema
 *
 * @description
 * Review or decision answer that sends the browser back to the client, with the code or the error,
 * `state` and `iss` in the query (RFC 9207).
 */
export const AuthorizationRedirectSchema = z.object({
  status: z.literal('redirect'),
  redirectTo: z.string(),
});

/**
 * Type AuthorizationRedirect
 * @type AuthorizationRedirect
 *
 * @description
 * Redirect back to the client.
 */
export type AuthorizationRedirect = z.infer<typeof AuthorizationRedirectSchema>;

/**
 * Constant AuthorizationReviewResponseSchema
 *
 * @description
 * Review answer, told apart by `status`.
 */
export const AuthorizationReviewResponseSchema = z.discriminatedUnion('status', [
  AuthorizationConsentSchema,
  AuthorizationRedirectSchema,
]);

/**
 * Type AuthorizationReviewResponse
 * @type AuthorizationReviewResponse
 *
 * @description
 * Consent to show or redirect to follow.
 */
export type AuthorizationReviewResponse = z.infer<typeof AuthorizationReviewResponseSchema>;

/**
 * Type AuthorizationConsent
 * @type AuthorizationConsent
 *
 * @description
 * Consent screen data.
 */
export type AuthorizationConsent = z.infer<typeof AuthorizationConsentSchema>;

/**
 * Constant ConnectedApplicationSchema
 *
 * @description
 * One client the owner consented to, as listed in « Applications connectées ».
 */
export const ConnectedApplicationSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  name: z.nullable(z.string()),
  /** Logo fetched by the server, as a `data:` URL. */
  logo: z.nullable(z.string()),
  /** Host of the client identifier URL, or of the dynamically registered client's redirect URI. */
  host: z.string(),
  registration: ClientRegistrationKindSchema,
  scopes: z.array(z.enum(MCP_SCOPES)),
  createdAt: z.string(),
  lastUsedAt: z.nullable(z.string()),
});

/**
 * Type ConnectedApplication
 * @type ConnectedApplication
 *
 * @description
 * Consented client.
 */
export type ConnectedApplication = z.infer<typeof ConnectedApplicationSchema>;

/**
 * Constant ConnectedApplicationsResponseSchema
 *
 * @description
 * Answer of `GET /api/auth/admin/oauth/applications`, most recent consent first.
 */
export const ConnectedApplicationsResponseSchema = z.object({
  items: z.array(ConnectedApplicationSchema),
});

/**
 * Type ConnectedApplicationsResponse
 * @type ConnectedApplicationsResponse
 *
 * @description
 * Connected applications.
 */
export type ConnectedApplicationsResponse = z.infer<typeof ConnectedApplicationsResponseSchema>;

/**
 * Constant OAUTH_PROBLEM_CODES
 *
 * @description
 * Problem codes of the administrator consent and connected-application routes. The first three are
 * authorization requests that cannot be sent back to the client (unknown client, unregistered
 * redirect URI, missing client identifier): the consent page shows them instead.
 */
export const OAUTH_PROBLEM_CODES = {
  invalidClient: 'identity.oauth-invalid-client',
  invalidRedirectUri: 'identity.oauth-invalid-redirect-uri',
  invalidRequest: 'identity.oauth-invalid-request',
  /** The pending request is unknown, expired, already decided or opened by another session. */
  requestExpired: 'identity.oauth-request-expired',
  applicationNotFound: 'identity.oauth-application-not-found',
} as const;
