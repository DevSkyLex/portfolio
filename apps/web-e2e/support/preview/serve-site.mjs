// Built-site preview for browser tests. Mirrors static/admin/media routing and cache headers from
// docker/nginx/snippets/site.conf; APIs answer 404 because this server has no services.
import { createReadStream, existsSync, realpathSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Static extensions supported by the built-site preview. */
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.txt': 'text/plain; charset=utf-8',
  // Nginx mime.types and `charset utf-8` (docker/nginx/snippets/site.conf): sitemap.xml (D42).
  '.xml': 'text/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

/** Uploaded image names (D40), the only files served under `/media/`. */
const MEDIA_NAME = /^\/media\/[0-9a-f-]{36}(?:-960)?\.webp$/;

/**
 * Resolves regular files within the root, including after symlink resolution, so adjacent files
 * cannot be exposed through an encoded traversal or a link in the built output.
 * @param {string} root - Absolute real site root.
 * @param {string} requested - Root-relative requested path.
 * @returns {string | null} A contained regular file, when it exists.
 */
function siteFile(root, requested) {
  const candidate = resolve(root, `.${sep}${requested}`);
  const inside = (value) => {
    const suffix = relative(root, value);
    return suffix !== '..' && !suffix.startsWith(`..${sep}`) && !isAbsolute(suffix);
  };
  if (!inside(candidate) || !existsSync(candidate)) return null;
  try {
    const actual = realpathSync(candidate);
    return inside(actual) && statSync(actual).isFile() ? actual : null;
  } catch {
    return null;
  }
}

/**
 * Streams a static response and preserves HEAD semantics.
 * @param {import('node:http').IncomingMessage} request - Incoming preview request.
 * @param {import('node:http').ServerResponse} response - Outgoing response.
 * @param {string} file - Existing contained file.
 * @param {number} status - Response status.
 * @param {Record<string, string>} headers - Route-specific response headers.
 * @returns {void}
 */
function send(request, response, file, status, headers) {
  response.writeHead(status, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    ...headers,
  });
  if (request.method === 'HEAD') response.end();
  else
    createReadStream(file)
      .on('error', () => response.destroy())
      .pipe(response);
}

/**
 * Answers the localized prerendered not-found page with its real status.
 * @param {import('node:http').IncomingMessage} request - Incoming preview request.
 * @param {import('node:http').ServerResponse} response - Outgoing response.
 * @param {string} root - Absolute real site root.
 * @param {string} pathname - Decoded request path.
 * @returns {void}
 */
function sendNotFound(request, response, root, pathname) {
  const errorPath = pathname.startsWith('/en/')
    ? 'en/error/404/index.html'
    : 'fr/error/404/index.html';
  const notFound = siteFile(root, errorPath);
  if (notFound) send(request, response, notFound, 404, { 'cache-control': 'no-store' });
  else {
    response.writeHead(404, { 'cache-control': 'no-store' });
    response.end();
  }
}

/**
 * Creates an unbound preview server. Callers own its lifecycle. It models static/admin/media routes
 * and caching, not Nginx TLS, rate limits, compression, maintenance mode or API proxying.
 * @param {string} directory - Browser output containing the CSR shell and prerendered pages.
 * @param {{ mediaDirectory?: string }} [options] - Directory of uploaded images served at `/media/`;
 *   without it (or when it does not exist) every `/media/` path answers 404.
 * @returns {import('node:http').Server} Server ready to bind to a caller-selected port.
 */
export function createSiteServer(directory, { mediaDirectory } = {}) {
  const root = realpathSync(resolve(directory));
  const media =
    mediaDirectory && existsSync(mediaDirectory) ? realpathSync(resolve(mediaDirectory)) : null;
  return createServer((request, response) => {
    let pathname;
    let search;
    try {
      const url = new URL(request.url ?? '/', 'http://localhost');
      pathname = decodeURIComponent(url.pathname);
      search = url.search;
      if (pathname.includes('\0')) throw new URIError('Invalid path');
    } catch {
      response.writeHead(400, { 'cache-control': 'no-store' });
      response.end();
      return;
    }
    if (pathname.startsWith('/api/')) {
      response.writeHead(404, {
        'content-type': 'application/problem+json',
        'cache-control': 'no-store',
      });
      response.end(
        JSON.stringify({ type: 'about:blank', status: 404, code: 'http.404', title: 'Not found' }),
      );
      return;
    }
    if (pathname.startsWith('/media/')) {
      const image =
        media && MEDIA_NAME.test(pathname)
          ? siteFile(media, pathname.slice('/media/'.length))
          : null;
      if (image)
        send(request, response, image, 200, {
          'cache-control': 'public, max-age=31536000, immutable',
          'x-content-type-options': 'nosniff',
        });
      else sendNotFound(request, response, root, pathname);
      return;
    }
    if (pathname === '/' || pathname === '/fr') {
      response.writeHead(308, { location: `/fr/${search}` });
      response.end();
      return;
    }
    if (/^\/(?:admin(?:\/|$)|projects(?:\/|$)|privacy$|legal-notice$)/.test(pathname)) {
      response.writeHead(308, { location: `/fr${pathname}${search}` });
      response.end();
      return;
    }
    if (pathname === '/fr/admin' || pathname === '/en/admin') {
      response.writeHead(301, { location: `${pathname}/${search}` });
      response.end();
      return;
    }
    // Each locale build serves its own client-rendered administration.
    if (pathname.startsWith('/fr/admin/') || pathname.startsWith('/en/admin/')) {
      const index = siteFile(
        root,
        pathname.startsWith('/en/') ? 'en/index.csr.html' : 'fr/index.csr.html',
      );
      if (index)
        send(request, response, index, 200, {
          'cache-control': 'no-store',
          'x-robots-tag': 'noindex, nofollow',
        });
      else {
        response.writeHead(404, { 'cache-control': 'no-store' });
        response.end();
      }
      return;
    }
    const hidden = pathname.split('/').some((part) => part.startsWith('.'));
    const internalError = /^\/(?:fr\/|en\/)?error\//.test(pathname);
    const staticAsset =
      /\.(?:js|css|woff2?|png|jpe?g|webp|avif|gif|svg|ico|txt|xml|webmanifest)$/i.test(pathname);
    if (
      !hidden &&
      !internalError &&
      !staticAsset &&
      !pathname.startsWith('/fr/') &&
      !pathname.startsWith('/en/')
    ) {
      response.writeHead(308, { location: `/fr${pathname}${search}` });
      response.end();
      return;
    }
    const requested = pathname.replace(/^\/+/, '');
    const found =
      hidden || internalError
        ? null
        : (siteFile(root, requested) ?? siteFile(root, join(requested, 'index.html')));
    if (found) {
      const hashed = /-[A-Za-z0-9_-]{8}\.(?:js|css|woff2|png|jpe?g|webp|avif|svg|ico)$/.test(
        pathname,
      );
      // The unhashed administration stylesheet of each locale (D31) is revalidated like the pages.
      const asset =
        pathname !== '/admin.css' &&
        pathname !== '/fr/admin.css' &&
        pathname !== '/en/admin.css' &&
        /\.(?:js|css|woff2?|png|jpe?g|webp|avif|gif|svg|ico|txt|xml|webmanifest)$/i.test(pathname);
      send(request, response, found, 200, {
        'cache-control': hashed
          ? 'public, max-age=31536000, immutable'
          : asset
            ? 'public, max-age=3600'
            : 'no-cache',
      });
      return;
    }
    sendNotFound(request, response, root, pathname);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = process.argv[2] ?? 'dist/apps/web/browser';
  const port = Number(process.argv[3] ?? 4200);
  // Uploaded images, for instance the content service's CONTENT_MEDIA_DIR (optional).
  const mediaDirectory = process.env['MEDIA_DIR'] || undefined;
  const served = mediaDirectory ? `${directory}, media ${mediaDirectory}` : directory;
  createSiteServer(directory, { mediaDirectory }).listen(port, '127.0.0.1', () =>
    console.log(`Site served on http://localhost:${port} (${served})`),
  );
}
