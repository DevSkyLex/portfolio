import type { Routes } from '@angular/router';

/**
 * Configuration IDENTITY_OAUTH_ROUTES
 *
 * @description
 * Identity-owned lazy consent page of the OAuth authorization server (D45), mounted by the shell at
 * `/admin/oauth/authorize` behind `adminGuard` and outside the administration layout, like the login.
 */
export const IDENTITY_OAUTH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@internal/identity-web-feature/lib/ui/pages/oauth-consent-page/oauth-consent-page.component').then(
        (module) => module.OAuthConsentPageComponent,
      ),
    title: $localize`:@@admin.oauth.routeTitle:Autoriser une application — Administration`,
  },
];
