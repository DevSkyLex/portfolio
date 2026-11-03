// Built-site preview for browser tests. Mirrors static/admin routing and cache headers from
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
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
};

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
 * Creates an unbound preview server. Callers own its lifecycle. It models static/admin routes and
 * caching, not Nginx TLS, rate limits, compression, maintenance mode or API proxying.
 * @param {string} directory - Browser output containing the CSR shell and prerendered pages.
 * @returns {import('node:http').Server} Server ready to bind to a caller-selected port.
 */
export function createSiteServer(directory) {
  const root = realpathSync(resolve(directory));
  return createServer((request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
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
    if (pathname === '/admin' || pathname === '/en/admin' || pathname.startsWith('/en/admin/')) {
      response.writeHead(301, { location: '/admin/' });
      response.end();
      return;
    }
    if (pathname.startsWith('/admin/')) {
      const index = siteFile(root, 'index.csr.html');
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
    const internalError = /^\/(?:en\/)?error\//.test(pathname);
    const requested = pathname.replace(/^\/+/, '');
    const found =
      hidden || internalError
        ? null
        : (siteFile(root, requested) ?? siteFile(root, join(requested, 'index.html')));
    if (found) {
      const hashed = /-[A-Za-z0-9_-]{8}\.(?:js|css|woff2|png|jpe?g|webp|avif|svg|ico)$/.test(
        pathname,
      );
      const asset =
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
    const errorPath = pathname.startsWith('/en/')
      ? 'en/error/404/index.html'
      : 'error/404/index.html';
    const notFound = siteFile(root, errorPath);
    if (notFound) send(request, response, notFound, 404, { 'cache-control': 'no-store' });
    else {
      response.writeHead(404, { 'cache-control': 'no-store' });
      response.end();
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = process.argv[2] ?? 'dist/apps/web/browser';
  const port = Number(process.argv[3] ?? 4200);
  createSiteServer(directory).listen(port, '127.0.0.1', () =>
    console.log(`Site served on http://localhost:${port} (${directory})`),
  );
}
