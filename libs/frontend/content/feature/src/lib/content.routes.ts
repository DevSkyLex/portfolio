import type { Routes } from '@angular/router';
import { projectExistsGuard } from '@internal/content-web-feature/lib/http/guards/project-exists/project-exists.guard';
import { projectMatchGuard } from '@internal/content-web-feature/lib/http/guards/project-match/project-match.guard';

/**
 * Configuration CONTENT_ROUTES
 *
 * @description
 * Public content routes mounted by the web shell; project detail code is loaded only when a project URL is opened.
 *
 * @type {Routes}
 */
export const CONTENT_ROUTES: Routes = [
  {
    path: 'projects/:slug',
    canMatch: [projectMatchGuard],
    canActivate: [projectExistsGuard],
    loadComponent: async () =>
      (
        await import('@internal/content-web-feature/lib/ui/pages/project-page/project-page.component')
      ).ProjectPageComponent,
  },
];
