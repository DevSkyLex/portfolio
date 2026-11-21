import { inject } from '@angular/core';
import type { Routes } from '@angular/router';
import { CONTENT_ROUTES } from '@vfortin/content-web-feature';
import { LEGAL_ROUTES } from '@vfortin/legal-web-feature';
import { AdminStylesheetService } from '@internal/web-shell/lib/admin-stylesheet/admin-stylesheet.service';
import { SiteLayoutComponent } from '@internal/web-shell/lib/layout/site-layout/site-layout.component';
import { ErrorPageComponent } from '@internal/web-shell/lib/pages/error-page/error-page.component';
import { MaintenancePageComponent } from '@internal/web-shell/lib/pages/maintenance-page/maintenance-page.component';
import { maintenanceGuard } from '@internal/web-shell/lib/http/guards/maintenance/maintenance.guard';
import { HOME_TITLE } from '@internal/web-shell/lib/pages/home-page/constants/home-title.constants';
import { HomePageComponent } from '@internal/web-shell/lib/pages/home-page/home-page.component';
import { publicContentGuard } from '@internal/web-shell/lib/http/guards/public-content/public-content.guard';
import {
  provideCookiePreferences,
  provideLegalDocuments,
} from '@internal/web-shell/lib/providers/legal-documents/legal-documents.provider';

/**
 * Constant APP_ROUTES
 *
 * @description
 * Mounts the lazy admin area and public site layout, including content and legal routes plus error
 * and not-found pages. The home, content and legal pages read the snapshot, so they wait for it
 * (`publicContentGuard`); the legal pages read their documents through `LEGAL_DOCUMENTS`, bound
 * here to the snapshot. The admin area loads its own stylesheet alongside its routes and resolves once
 * both are ready (D31). The wildcard error route renders a real HTTP 404 during SSR. While the
 * maintenance mode is on, the maintenance route, matched after the admin area and before the site
 * layout, answers every public URL (HTTP 503) and leaves the admin reachable to switch it off.
 *
 * @type {Routes}
 */
export const APP_ROUTES: Routes = [
  {
    path: 'admin',
    loadChildren: () =>
      Promise.all([
        import('@internal/web-shell/lib/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
        inject<AdminStylesheetService>(AdminStylesheetService).load(),
      ]).then(([routes]) => routes),
  },
  { path: '**', canMatch: [maintenanceGuard], component: MaintenancePageComponent },
  {
    path: '',
    component: SiteLayoutComponent,
    children: [
      {
        path: '',
        canActivate: [publicContentGuard],
        children: [
          {
            path: '',
            pathMatch: 'full',
            component: HomePageComponent,
            title: HOME_TITLE,
          },
          ...CONTENT_ROUTES,
          {
            path: '',
            providers: [provideLegalDocuments(), provideCookiePreferences()],
            children: LEGAL_ROUTES,
          },
        ],
      },
      { path: 'error/:code', component: ErrorPageComponent, data: { footer: 'minimal' } },
      // The error page also sets the SSR response status, preserving the requested unknown URL.
      { path: '**', component: ErrorPageComponent, data: { footer: 'minimal' } },
    ],
  },
];
