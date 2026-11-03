import type { Routes } from '@angular/router';
import { provideAdminInboxSummary } from '@vfortin/contact-web-data-access/summary';
import { provideAdminProjectNavigation } from '@vfortin/content-web-data-access/navigation';
import { provideAdminSession } from '@vfortin/identity-web-data-access/session';

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
      { path: '', pathMatch: 'full', redirectTo: 'projects' },
      {
        path: 'projects',
        loadChildren: () =>
          import('@vfortin/content-web-feature-admin').then((m) => m.ADMIN_CONTENT_ROUTES),
      },
      {
        path: 'messages',
        loadChildren: () =>
          import('@vfortin/contact-web-feature-admin').then((m) => m.ADMIN_CONTACT_ROUTES),
      },
    ],
  },
];
