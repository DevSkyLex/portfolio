import type { Routes } from '@angular/router';
import { CONTENT_ROUTES } from '@vfortin/content-web-feature';
import { LEGAL_ROUTES } from '@vfortin/legal-web-feature';
import { SiteLayoutComponent } from '@internal/web-shell/lib/layout/site-layout/site-layout.component';
import { ErrorPageComponent } from '@internal/web-shell/lib/pages/error-page/error-page.component';
import { HomePageComponent } from '@internal/web-shell/lib/pages/home-page/home-page.component';
import { publicContentGuard } from '@internal/web-shell/lib/http/guards/public-content/public-content.guard';

/**
 * Constant APP_ROUTES
 *
 * @description
 * Mounts the lazy admin area and public site layout, including content and legal routes plus error
 * and not-found pages. The wildcard error route relies on Nginx serving the prerendered 404 document.
 *
 * @type {Routes}
 */
export const APP_ROUTES: Routes = [
  {
    path: 'admin',
    loadChildren: () =>
      import('@internal/web-shell/lib/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
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
            title: $localize`:@@route.home:Valentin Fortin — Développeur web fullstack`,
          },
          ...CONTENT_ROUTES,
        ],
      },
      ...LEGAL_ROUTES,
      { path: 'error/:code', component: ErrorPageComponent, data: { footer: 'minimal' } },
      // Unknown address: 404 page (Nginx already answers 404 with the prerendered /error/404).
      { path: '**', component: ErrorPageComponent, data: { footer: 'minimal' } },
    ],
  },
];
