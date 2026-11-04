import type { Routes } from '@angular/router';

/**
 * Configuration ADMIN_DASHBOARD_ROUTES
 *
 * @description
 * « Tableau de bord » (SEO dashboard, D47), mounted by the shell under `/admin/dashboard`, the
 * administration's landing page; the window lives in `?periode=`.
 */
export const ADMIN_DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@internal/content-web-feature-admin/lib/ui/pages/admin-dashboard-page/admin-dashboard-page.component').then(
        (m) => m.AdminDashboardPageComponent,
      ),
    title: $localize`:@@admin.dashboard.routeTitle:Tableau de bord — Administration`,
  },
];
