import { inject } from '@angular/core';
import { Router, type RedirectFunction, type Routes } from '@angular/router';
import { provideAdminInboxSummary } from '@vfortin/contact-web-data-access/summary';
import { provideAdminProjectNavigation } from '@vfortin/content-web-data-access/navigation';
import { provideAdminSession } from '@vfortin/identity-web-data-access/session';
import { IDENTITY_SECURITY_ROUTES } from '@vfortin/identity-web-feature';

/** Preserves saved editor links, filters and fragments from the former project section. */
const redirectProjectRoute: RedirectFunction = ({ params, queryParams, fragment }) =>
  inject<Router>(Router).createUrlTree(
    params['id'] ? ['/admin/articles', params['id']] : ['/admin/articles'],
    { queryParams, ...(fragment === null ? {} : { fragment }) },
  );

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
      { path: 'projects', pathMatch: 'full', redirectTo: redirectProjectRoute },
      { path: 'projects/:id', pathMatch: 'full', redirectTo: redirectProjectRoute },
      {
        path: 'articles',
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
        path: 'faq',
        loadChildren: () =>
          import('@vfortin/content-web-feature-admin').then((m) => m.ADMIN_FAQ_ROUTES),
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
        path: 'maintenance',
        loadChildren: () =>
          import('@vfortin/content-web-feature-admin').then((m) => m.ADMIN_MAINTENANCE_ROUTES),
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
