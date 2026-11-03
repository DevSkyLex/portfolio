/**
 * Export authInterceptor
 *
 * @description
 * Secondary entry point exposing admin request authentication without eagerly exporting the session store.
 */
export {
  authInterceptor,
  isAdminApi,
} from '@internal/identity-web-data-access/lib/http/interceptors/auth/auth.interceptor';
