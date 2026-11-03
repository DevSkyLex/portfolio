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
