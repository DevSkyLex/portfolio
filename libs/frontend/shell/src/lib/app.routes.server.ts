import { RenderMode, type ServerRoute } from '@angular/ssr';
import { loadSiteContent } from '@vfortin/content-web-data-access';
import { ERROR_CODES } from '@internal/web-shell/lib/pages/error-page/models/error-code.model';

/**
 * Constant SERVER_ROUTES
 *
 * @description
 * Prerenders public routes using snapshot slugs and error codes while leaving admin pages client-rendered
 * for Nginx to serve from the CSR document.
 *
 * @type {ServerRoute[]}
 */
export const SERVER_ROUTES: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  {
    path: 'projects/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () =>
      (await loadSiteContent()).slugs().map((slug: string) => ({ slug })),
  },
  { path: 'legal-notice', renderMode: RenderMode.Prerender },
  { path: 'privacy', renderMode: RenderMode.Prerender },
  {
    path: 'error/:code',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => ERROR_CODES.map((code) => ({ code })),
  },
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Client },
];
