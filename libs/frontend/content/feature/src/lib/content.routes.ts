import { inject } from '@angular/core';
import { Router, type Routes } from '@angular/router';
import { projectExistsGuard } from '@internal/content-web-feature/lib/http/guards/project-exists/project-exists.guard';
import { projectMatchGuard } from '@internal/content-web-feature/lib/http/guards/project-match/project-match.guard';

/**
 * Configuration CONTENT_ROUTES
 *
 * @description
 * Public articles and legacy project redirects mounted by the web shell.
 *
 * @type {Routes}
 */
export const CONTENT_ROUTES: Routes = [
  {
    path: 'projects',
    pathMatch: 'full',
    redirectTo: ({ queryParams, fragment }) =>
      inject<Router>(Router).createUrlTree(['/articles'], {
        queryParams: { ...queryParams, category: 'projects' },
        ...(fragment === null ? {} : { fragment }),
      }),
  },
  {
    path: 'projects/:slug',
    pathMatch: 'full',
    redirectTo: ({ params, queryParams, fragment }) =>
      inject<Router>(Router).createUrlTree(['/articles', params['slug']], {
        queryParams,
        ...(fragment === null ? {} : { fragment }),
      }),
  },
  {
    path: 'articles',
    loadComponent: () =>
      import('@internal/content-web-feature/lib/ui/pages/content-list-page/content-list-page.component').then(
        (m) => m.ContentListPageComponent,
      ),
  },
  {
    path: 'articles/:slug',
    canMatch: [projectMatchGuard],
    canActivate: [projectExistsGuard],
    loadComponent: () =>
      import('@internal/content-web-feature/lib/ui/pages/project-page/project-page.component').then(
        (m) => m.ProjectPageComponent,
      ),
  },
];
