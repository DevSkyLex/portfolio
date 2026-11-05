import { RenderMode, type ServerRoute } from '@angular/ssr';

/**
 * Constant SERVER_ROUTES
 *
 * @description
 * Renders public routes per request while keeping administration client-rendered and private.
 *
 * @type {ServerRoute[]}
 */
export const SERVER_ROUTES: ServerRoute[] = [
  {
    path: 'admin',
    renderMode: RenderMode.Client,
    headers: { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' },
  },
  {
    path: 'admin/**',
    renderMode: RenderMode.Client,
    headers: { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' },
  },
  { path: '**', renderMode: RenderMode.Server, headers: { 'Cache-Control': 'no-store' } },
];
