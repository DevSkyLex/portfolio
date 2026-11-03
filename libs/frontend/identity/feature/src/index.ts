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
