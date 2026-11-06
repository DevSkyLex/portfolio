// Isolated SSR acceptance: published fixtures replace the real content service. Test controls exist
// only in this localhost harness, never in the production runtime.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Starts a real built Angular handler against mutable, process-owned published fixtures. */
export async function startSsrPreview(directory, port) {
  const snapshots = Object.fromEntries(
    await Promise.all(
      ['fr', 'en'].map(async (locale) => [
        locale,
        JSON.parse(
          await readFile(
            new URL(`../../../../apps/web/content-snapshot/${locale}.json`, import.meta.url),
            'utf8',
          ),
        ),
      ]),
    ),
  );
  const original = structuredClone(snapshots);
  const fixture = createServer((req, res) => {
    const locale =
      new URL(req.url ?? '/', 'http://localhost').searchParams.get('locale') === 'en' ? 'en' : 'fr';
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(snapshots[locale]));
  });
  await new Promise((done) => fixture.listen(0, '127.0.0.1', done));
  const address = fixture.address();
  if (!address || typeof address === 'string') throw new Error('No fixture address.');
  process.env.CONTENT_API_URL = `http://127.0.0.1:${address.port}`;
  const { reqHandler } = await import(pathToFileURL(resolve(directory, 'server/server.mjs')).href);
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname === '/__e2e/snapshot' && req.method === 'POST') {
      // A deterministic new published project proves routes and sitemap read fresh service content.
      for (const locale of ['fr', 'en']) {
        snapshots[locale] = structuredClone(original[locale]);
        if (url.searchParams.has('changed')) {
          snapshots[locale].revision++;
          const project = structuredClone(snapshots[locale].projects[0]);
          project.slug = 'runtime-publication';
          project.title = 'Runtime publication';
          snapshots[locale].projects.push(project);
        }
      }
      res.writeHead(204);
      res.end();
      return;
    }
    if (url.pathname === '/api/content/snapshot') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(snapshots[url.searchParams.get('locale') === 'en' ? 'en' : 'fr']));
      return;
    }
    if (url.pathname.startsWith('/api/')) {
      res.writeHead(404, { 'Content-Type': 'application/problem+json' });
      res.end(JSON.stringify({ status: 404, code: 'http.404' }));
      return;
    }
    void reqHandler(req, res, () => {
      res.writeHead(404);
      res.end();
    });
  });
  await new Promise((done) => server.listen(port, '127.0.0.1', done));
  return { server, fixture };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { server, fixture } = await startSsrPreview(
    process.argv[2] ?? 'dist/apps/web-e2e-site',
    Number(process.argv[3] ?? 4200),
  );
  console.log(`SSR acceptance served on http://localhost:${process.argv[3] ?? 4200}`);
  const close = () => {
    server.closeAllConnections();
    fixture.closeAllConnections();
    server.close();
    fixture.close();
  };
  process.once('SIGTERM', close);
  process.once('SIGINT', close);
}
