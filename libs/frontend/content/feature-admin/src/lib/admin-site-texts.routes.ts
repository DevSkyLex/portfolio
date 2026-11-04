import type { Routes } from '@angular/router';
import { leaveProjectEditor } from '@internal/content-web-feature-admin/lib/http/guards/leave-project-editor/leave-project-editor.guard';

/**
 * Configuration ADMIN_INFORMATION_ROUTES
 *
 * @description
 * « Informations » administration (profile texts, facts and public links), mounted by the shell
 * under `/admin/information`; leaving defers to the page (`canLeave`).
 */
export const ADMIN_INFORMATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@internal/content-web-feature-admin/lib/ui/pages/admin-information-page/admin-information-page.component').then(
        (m) => m.AdminInformationPageComponent,
      ),
    canDeactivate: [leaveProjectEditor],
    title: $localize`:@@admin.information.routeTitle:Informations — Administration`,
  },
];

/**
 * Configuration ADMIN_LEGAL_ROUTES
 *
 * @description
 * « Légal » administration (legal notice and privacy policy), mounted by the shell under
 * `/admin/legal`; leaving defers to the page (`canLeave`).
 */
export const ADMIN_LEGAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@internal/content-web-feature-admin/lib/ui/pages/admin-legal-page/admin-legal-page.component').then(
        (m) => m.AdminLegalPageComponent,
      ),
    canDeactivate: [leaveProjectEditor],
    title: $localize`:@@admin.legal.routeTitle:Légal — Administration`,
  },
];
