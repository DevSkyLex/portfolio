import type { Routes } from '@angular/router';
import {
  adminGuard,
  IDENTITY_LOGIN_ROUTES,
  IDENTITY_OAUTH_ROUTES,
} from '@vfortin/identity-web-feature';

/**
 * Constant ADMIN_ROUTES
 *
 * @description
 * Loads login independently from the authenticated owner capabilities and business pages. The OAuth
 * consent page (D45) requires the administrator session but renders without the administration
 * layout, like the login.
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    children: IDENTITY_LOGIN_ROUTES,
  },
  {
    path: 'oauth/authorize',
    canMatch: [adminGuard],
    children: IDENTITY_OAUTH_ROUTES,
  },
  {
    path: '',
    canMatch: [adminGuard],
    loadChildren: () =>
      import('@internal/web-shell/lib/admin/admin-protected.routes').then(
        (m) => m.ADMIN_PROTECTED_ROUTES,
      ),
  },
];
