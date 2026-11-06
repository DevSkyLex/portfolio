import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
  type NodeRequestHandlerFunction,
} from '@angular/ssr/node';
import { isDevMode } from '@angular/core';
import { runtimeSitemap } from '@vfortin/web-shell/server';
import express, { type NextFunction, type Request, type Response } from 'express';
import { join } from 'node:path';
import type { ServerResponse } from 'node:http';
import { legacyLocaleRedirect } from '@internal/web/server/legacy-locale-redirect/legacy-locale-redirect';

const siteOrigin: string = new URL(process.env['SITE_ORIGIN'] ?? 'https://valentin-fortin.pro')
  .origin;
const contentApiUrl: string = process.env['CONTENT_API_URL'] ?? 'http://localhost:3101';
const browserDirectory: string = join(import.meta.dirname, '../browser');
const app: express.Express = express();
const angularApp: AngularNodeAppEngine = new AngularNodeAppEngine({
  allowedHosts: [new URL(siteOrigin).hostname, 'localhost', '127.0.0.1', '[::1]'],
});

app.disable('x-powered-by');
app.use((_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.get('/health/live', (_req: Request, res: Response): void => {
  res.type('text/plain').send('ok');
});
// The locale prefixes exist only in the localized builds (`/fr/`, `/en/`); the development build serves
// its single French locale at the root, where these redirects would land on its not-found page.
const localized: boolean = !isDevMode();
app.get('/', (_req: Request, res: Response, next: NextFunction): void => {
  if (!localized) return next();
  res.redirect(302, '/fr/');
});
app.use((req: Request, res: Response, next: NextFunction): void => {
  const target: string | null = localized ? legacyLocaleRedirect(req.path, req.originalUrl) : null;
  if (target !== null) {
    res.redirect(308, target);
    return;
  }
  next();
});
app.get('/robots.txt', (_req: Request, res: Response): void => {
  res
    .type('text/plain')
    .send(
      `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /fr/admin\nDisallow: /en/admin\nDisallow: /api/\n\nSitemap: ${siteOrigin}/sitemap.xml\n`,
    );
});
app.get('/sitemap.xml', (_req: Request, res: Response, next: NextFunction): void => {
  runtimeSitemap(siteOrigin, contentApiUrl)
    .then((xml: string): void => {
      res.type('application/xml').send(xml);
    })
    .catch(next);
});
// Angular's generated Node template serves only assets here; pages are handled by its SSR engine.
app.use(
  express.static(browserDirectory, {
    maxAge: '1y',
    index: false,
    redirect: false,
    setHeaders(res: ServerResponse, file: string): void {
      if (file.endsWith('.html')) {
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
        res.setHeader('Cache-Control', 'no-store');
        return;
      }
      if (!/[.-][A-Z0-9]{8,}\./i.test(file)) res.setHeader('Cache-Control', 'no-cache');
    },
  }),
);
app.use((req: Request, res: Response, next: NextFunction): void => {
  angularApp
    .handle(req, { contentApiUrl, siteOrigin })
    .then((response: globalThis.Response | null): void | Promise<void> => {
      if (response) return writeResponseToNodeResponse(response, res);
      // Angular returns null when initial navigation fails. Localized applications have a
      // wildcard not-found route, so a missing render is an outage rather than a missing URL.
      if (/^\/(?:fr|en)(?:\/|$)/.test(req.path))
        throw new Error('Public application rendering unavailable.');
      next();
    })
    .catch(next);
});
app.use((_req: Request, res: Response): void => {
  res.status(404).type('text/plain').send('Not found');
});
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  console.error('SSR request failed:', error instanceof Error ? error.message : 'unknown error');
  if (!res.headersSent) {
    res
      .status(503)
      .set({ 'Cache-Control': 'no-store', 'Retry-After': '30', 'X-Robots-Tag': 'noindex' })
      .type('text/html')
      .send(
        '<!doctype html><html lang="fr"><head><title>Service unavailable</title></head><body><h1>Service unavailable</h1></body></html>',
      );
  } else res.end();
});

if (isMainModule(import.meta.url)) {
  const port: number = Number(process.env['PORT'] ?? 4000);
  app.listen(port, process.env['HOST'] ?? '0.0.0.0');
}

/** Standard Angular Node request handler, also used by the CLI and the isolated browser preview. */
export const reqHandler: NodeRequestHandlerFunction = createNodeRequestHandler(app);
