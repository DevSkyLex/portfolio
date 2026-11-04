import type { Routes } from '@angular/router';
import { leaveProjectEditor } from '@internal/content-web-feature-admin/lib/http/guards/leave-project-editor/leave-project-editor.guard';

/**
 * Configuration ADMIN_CONTENT_ROUTES
 *
 * @description
 * Lazy administration pages with editor draft protection.
 */
export const ADMIN_CONTENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@internal/content-web-feature-admin/lib/ui/pages/admin-projects-page/admin-projects-page.component').then(
        (m) => m.AdminProjectsPageComponent,
      ),
    title: $localize`:@@admin.projects.routeTitle:Projets — Administration`,
  },
  {
    path: ':id',
    loadComponent: () =>
      import('@internal/content-web-feature-admin/lib/ui/pages/admin-project-edit-page/admin-project-edit-page.component').then(
        (m) => m.AdminProjectEditPageComponent,
      ),
    canDeactivate: [leaveProjectEditor],
    title: $localize`:@@admin.project.routeTitle:Projet — Administration`,
  },
];
