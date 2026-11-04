/**
 * Export AuthApiService
 *
 * @description
 * Identity API client for administrator authentication.
 */
export { AuthApiService } from '@internal/identity-web-data-access/lib/services/auth-api/auth-api.service';
export {
  LoginFlowStore,
  type LoginFlowStoreType,
} from '@internal/identity-web-data-access/lib/state/login-flow/login-flow.store';

/**
 * Export Credentials
 *
 * @description
 * Credential input shape of the first login step.
 */
export type { Credentials } from '@internal/identity-web-data-access/lib/models/credentials/credentials.interface';

/**
 * Export LoginStep
 *
 * @description
 * Outcome of the first login step returned by the session store.
 */
export type { LoginStep } from '@internal/identity-web-data-access/lib/models/login-step/login-step.type';

/**
 * Export SessionStore
 *
 * @description
 * In-memory admin session store and its inferred instance type.
 */
export {
  SessionStore,
  type SessionStoreType,
} from '@internal/identity-web-data-access/lib/state/session/session.store';

/**
 * Export TwoFactorApiService
 *
 * @description
 * Client of the optional one-time code routes (`/api/auth/totp*`, administrator only).
 */
export { TwoFactorApiService } from '@internal/identity-web-data-access/lib/services/two-factor-api/two-factor-api.service';

/**
 * Export TwoFactorStore
 *
 * @description
 * Page-scoped second-factor status and named command states, and its inferred instance type.
 */
export {
  TwoFactorStore,
  type TwoFactorStoreType,
} from '@internal/identity-web-data-access/lib/state/two-factor/two-factor.store';

/**
 * Export ConnectedApplicationsStore
 *
 * @description
 * Section-scoped « Applications connectées » state (MCP clients consented to, D45) and its instance type.
 */
export {
  ConnectedApplicationsStore,
  type ConnectedApplicationsStoreType,
} from '@internal/identity-web-data-access/lib/state/connected-applications/connected-applications.store';

/**
 * Export OAuthConsentStore
 *
 * @description
 * Page-scoped review and decision of an MCP client's authorization request (D45) and its instance type.
 */
export {
  OAuthConsentStore,
  type OAuthConsentStoreType,
} from '@internal/identity-web-data-access/lib/state/oauth-consent/oauth-consent.store';

/**
 * Export OAuth models
 *
 * @description
 * Consent, connected-application and scope types rendered by the identity feature (D45).
 */
export type {
  AuthorizationConsent,
  AuthorizationReviewRequest,
  ConnectedApplication,
  McpScopeName,
} from '@internal/identity-web-data-access/lib/models/oauth/oauth.models';
