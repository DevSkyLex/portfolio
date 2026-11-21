// Isolated SSR acceptance: published fixtures replace the real content service. Test controls exist
// only in this localhost harness, never in the production runtime.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const wideAndTallDiagram = [
  'flowchart LR',
  '  accDescr: A wide and tall validation pipeline.',
  '  Start --> Queue --> Check --> Review --> Package --> Release --> Finish',
  ...Array.from({ length: 12 }, (_, index) => `  Check --> Branch${index + 1}`),
].join('\n');

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
          project.taxonomy = {
            category: { key: 'projects', label: locale === 'fr' ? 'Projets' : 'Projects' },
            tags: [{ key: 'architecture', label: 'Architecture' }],
          };
          project.article.content.unshift(
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [
                {
                  type: 'text',
                  text: 'Architecture and responsibilities of the published application',
                },
              ],
            },
            {
              type: 'codeBlock',
              attrs: { language: 'mermaid' },
              content: [
                {
                  type: 'text',
                  text: 'flowchart LR\n  accDescr: The browser sends a request to the API.\n  Browser --> API',
                },
              ],
            },
            {
              type: 'codeBlock',
              attrs: { language: 'mermaid' },
              content: [{ type: 'text', text: 'Invalid diagram source' }],
            },
            {
              type: 'codeBlock',
              attrs: { language: 'mermaid' },
              content: [{ type: 'text', text: wideAndTallDiagram }],
            },
          );
          snapshots[locale].projects.push(project);
          const collectionEntry = snapshots[locale].projects[0];
          snapshots[locale].projects.push(
            ...Array.from({ length: 3 }, (_, index) => ({
              ...collectionEntry,
              featured: false,
              slug: `sample-project-${index + 1}`,
              title: `Sample project ${index + 1}`,
            })),
          );
          snapshots[locale].articles = Array.from({ length: 5 }, (_, index) => ({
            ...collectionEntry,
            featured: false,
            slug: `sample-article-${index + 1}`,
            title: `Sample article ${index + 1}`,
            taxonomy: {
              category:
                index < 3
                  ? { key: 'engineering', label: locale === 'fr' ? 'Ingénierie' : 'Engineering' }
                  : { key: 'design', label: 'Design' },
              tags: [
                index % 2 === 0
                  ? { key: 'web', label: 'Web' }
                  : { key: 'data', label: locale === 'fr' ? 'Données' : 'Data' },
              ],
            },
          }));
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
