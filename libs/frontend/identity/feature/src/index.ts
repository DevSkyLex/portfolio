/**
 * Export adminGuard
 *
 * @description
 * Admin route guard and its login redirect path.
 */
export { LOGIN_PATH } from '@internal/identity-web-feature/lib/constants/login-path.constants';
export { adminGuard } from '@internal/identity-web-feature/lib/http/guards/admin/admin.guard';

/**
 * Export IDENTITY_LOGIN_ROUTES
 *
 * @description
 * Identity-owned lazy route tree for the administrator login workflow.
 */
export { IDENTITY_LOGIN_ROUTES } from '@internal/identity-web-feature/lib/identity-login.routes';

/**
 * Export IDENTITY_SECURITY_ROUTES
 *
 * @description
 * Identity-owned lazy route tree for the administrator security settings (optional one-time code).
 */
export { IDENTITY_SECURITY_ROUTES } from '@internal/identity-web-feature/lib/identity-security.routes';

/**
 * Export IDENTITY_OAUTH_ROUTES
 *
 * @description
 * Identity-owned lazy route tree of the consent page of the OAuth authorization server for MCP
 * clients (D45), mounted at `/admin/oauth/authorize`.
 */
export { IDENTITY_OAUTH_ROUTES } from '@internal/identity-web-feature/lib/identity-oauth.routes';
