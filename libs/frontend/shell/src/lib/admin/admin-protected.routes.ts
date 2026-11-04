import type { Routes } from '@angular/router';
import { provideAdminInboxSummary } from '@vfortin/contact-web-data-access/summary';
import { provideAdminProjectNavigation } from '@vfortin/content-web-data-access/navigation';
import { provideAdminSession } from '@vfortin/identity-web-data-access/session';
import { IDENTITY_SECURITY_ROUTES } from '@vfortin/identity-web-feature';

/**
 * Constant ADMIN_PROTECTED_ROUTES
 *
 * @description
 * Binds owner capabilities only after access is admitted and lazy-loads each administration workflow.
 */
export const ADMIN_PROTECTED_ROUTES: Routes = [
  {
    path: '',
    providers: [provideAdminInboxSummary(), provideAdminProjectNavigation(), provideAdminSession()],
    loadComponent: () =>
      import('@internal/web-shell/lib/admin/layouts/admin-layout/admin-layout.component').then(
        (m) => m.AdminLayoutComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('@vfortin/content-web-feature-admin').then((m) => m.ADMIN_DASHBOARD_ROUTES),
      },
      {
        path: 'projects',
        loadChildren: () =>
          import('@vfortin/content-web-feature-admin').then((m) => m.ADMIN_CONTENT_ROUTES),
      },
      {
        path: 'experiences',
        loadChildren: () =>
          import('@vfortin/content-web-feature-admin').then((m) => m.ADMIN_EXPERIENCE_ROUTES),
      },
      {
        path: 'education',
        loadChildren: () =>
          import('@vfortin/content-web-feature-admin').then((m) => m.ADMIN_EDUCATION_ROUTES),
      },
      {
        path: 'information',
        loadChildren: () =>
          import('@vfortin/content-web-feature-admin').then((m) => m.ADMIN_INFORMATION_ROUTES),
      },
      {
        path: 'legal',
        loadChildren: () =>
          import('@vfortin/content-web-feature-admin').then((m) => m.ADMIN_LEGAL_ROUTES),
      },
      {
        path: 'messages',
        loadChildren: () =>
          import('@vfortin/contact-web-feature-admin').then((m) => m.ADMIN_CONTACT_ROUTES),
      },
      // The identity route tree is a static constant whose page is lazy; the shell already imports
      // the identity feature statically for the guard and the login.
      { path: 'security', children: IDENTITY_SECURITY_ROUTES },
    ],
  },
];
