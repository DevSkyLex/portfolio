import type { Routes } from '@angular/router';

/**
 * Configuration IDENTITY_SECURITY_ROUTES
 *
 * @description
 * Identity-owned lazy "Sécurité" page mounted below `/admin/security`; the QR code renderer travels
 * with its chunk, outside the public and login bundles.
 */
export const IDENTITY_SECURITY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@internal/identity-web-feature/lib/ui/pages/security-page/security-page.component').then(
        (module) => module.SecurityPageComponent,
      ),
    title: $localize`:@@admin.security.routeTitle:Sécurité — Administration`,
  },
];
