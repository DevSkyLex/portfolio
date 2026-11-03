import type { Routes } from '@angular/router';

/**
 * Configuration IDENTITY_LOGIN_ROUTES
 *
 * @description
 * Identity-owned lazy login screen. Flow state lives with the page, separate from root authority.
 */
export const IDENTITY_LOGIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@internal/identity-web-feature/lib/ui/pages/login-page/login-page.component').then(
        (module) => module.LoginPageComponent,
      ),
    title: 'Connexion — Administration',
  },
];
