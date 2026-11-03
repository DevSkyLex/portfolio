import type { Routes } from '@angular/router';
import { adminGuard, IDENTITY_LOGIN_ROUTES } from '@vfortin/identity-web-feature';

/**
 * Constant ADMIN_ROUTES
 *
 * @description
 * Loads login independently from the authenticated owner capabilities and business pages.
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    children: IDENTITY_LOGIN_ROUTES,
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
