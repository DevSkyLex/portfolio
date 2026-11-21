import type { Routes } from '@angular/router';
import { leaveProjectEditor } from '@internal/content-web-feature-admin/lib/http/guards/leave-project-editor/leave-project-editor.guard';

/**
 * Configuration ADMIN_MAINTENANCE_ROUTES
 *
 * @description
 * « Maintenance » administration, mounted by the shell under `/admin/maintenance`: the lazy page,
 * deferring leaving to it (`canLeave`).
 */
export const ADMIN_MAINTENANCE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@internal/content-web-feature-admin/lib/ui/pages/admin-maintenance-page/admin-maintenance-page.component').then(
        (m) => m.AdminMaintenancePageComponent,
      ),
    canDeactivate: [leaveProjectEditor],
    title: $localize`:@@admin.maintenance.routeTitle:Maintenance — Administration`,
  },
];
