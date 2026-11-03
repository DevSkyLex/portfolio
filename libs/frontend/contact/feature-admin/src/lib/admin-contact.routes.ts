import type { Routes } from '@angular/router';

/**
 * Constant ADMIN_CONTACT_ROUTES
 *
 * @description
 * Child route for the administrator inbox mounted below `/admin/messages`.
 *
 * @type {Routes}
 */
export const ADMIN_CONTACT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@internal/contact-web-feature-admin/lib/ui/pages/admin-inbox-page/admin-inbox-page.component').then(
        (m) => m.AdminInboxPageComponent,
      ),
    title: 'Messages — Administration',
  },
];
