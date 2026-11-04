/**
 * Public identity exports
 *
 * @description
 * Exposes login/session contracts, administrator token claims and shared cookie, CSRF and error-code constants.
 */
export {
  ADMIN_AUDIENCE,
  AdminClaimsSchema,
  AuthenticatedResponseSchema,
  CSRF_HEADER,
  DEVICE_COOKIE,
  IDENTITY_ERROR_CODES,
  LoginRequestSchema,
  LoginResponseSchema,
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
  SECURE_COOKIE_PREFIX,
  SessionResponseSchema,
  TotpChallengeResponseSchema,
  TotpRequestSchema,
  type AdminClaims,
  type LoginRequest,
  type LoginResponse,
  type SessionResponse,
  type TotpChallengeResponse,
  type TotpRequest,
} from '@internal/identity-contracts/lib/identity.contract';

/**
 * Second-factor exports
 *
 * @description
 * Exposes the optional one-time code contracts: status, enrollment, confirmation, removal and their
 * problem codes (D17).
 */
export {
  TWO_FACTOR_ERROR_CODES,
  TwoFactorDisableRequestSchema,
  TwoFactorEnableRequestSchema,
  TwoFactorSetupRequestSchema,
  TwoFactorSetupResponseSchema,
  TwoFactorStatusResponseSchema,
  type TwoFactorDisableRequest,
  type TwoFactorEnableRequest,
  type TwoFactorSetupRequest,
  type TwoFactorSetupResponse,
  type TwoFactorStatusResponse,
} from '@internal/identity-contracts/lib/two-factor.contract';

/**
 * OAuth authorization server exports
 *
 * @description
 * Exposes the MCP access contracts (D45): scopes and their implications, resource and well-known
 * paths, discovery documents, protocol messages, consent and connected-application routes, token
 * claims and problem codes.
 */
export {
  AUTHORIZATION_SERVER_METADATA_SUFFIX,
  AuthorizationConsentSchema,
  AuthorizationRedirectSchema,
  AuthorizationReviewRequestSchema,
  AuthorizationReviewResponseSchema,
  AuthorizationServerMetadataSchema,
  ClientRegistrationKindSchema,
  ClientRegistrationResponseSchema,
  ConnectedApplicationSchema,
  ConnectedApplicationsResponseSchema,
  MCP_RESOURCE_PATH,
  MCP_SCOPES,
  MCP_SCOPE_IMPLICATIONS,
  McpTokenClaimsSchema,
  OAUTH_AUTHORIZE_PATH,
  OAUTH_PARAMETER_MAX_LENGTH,
  OAUTH_PROBLEM_CODES,
  OAuthErrorResponseSchema,
  OFFLINE_ACCESS_SCOPE,
  PROTECTED_RESOURCE_METADATA_SUFFIX,
  ProtectedResourceMetadataSchema,
  RevocationRequestSchema,
  TokenRequestSchema,
  TokenResponseSchema,
  type AuthorizationConsent,
  type AuthorizationRedirect,
  type AuthorizationReviewRequest,
  type AuthorizationReviewResponse,
  type AuthorizationServerMetadata,
  type ClientRegistrationKind,
  type ClientRegistrationResponse,
  type ConnectedApplication,
  type ConnectedApplicationsResponse,
  type McpScopeName,
  type McpTokenClaims,
  type OAuthErrorResponse,
  type ProtectedResourceMetadata,
  type RevocationRequest,
  type TokenRequest,
  type TokenResponse,
} from '@internal/identity-contracts/lib/oauth.contract';
