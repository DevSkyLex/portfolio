import { ContentSnapshotSchema, type ContentSnapshot } from '@vfortin/content-contracts';
import { inject, REQUEST_CONTEXT, type Provider } from '@angular/core';
import { CONTENT_SNAPSHOT_LOADER } from '@internal/content-web-data-access/lib/tokens/content-snapshot/content-snapshot-loader.token';
import { SITE_ORIGIN } from '@internal/content-web-data-access/lib/tokens/site-origin/site-origin.token';
import type { ContentSnapshotLoader } from '@internal/content-web-data-access/lib/models/content-snapshot-loader/content-snapshot-loader.type';

/** Trusted runtime settings are supplied by the Node adapter, never inferred from request headers. */
function runtimeOptions(): { contentApiUrl: string; siteOrigin: string } {
  const context: unknown = inject<unknown>(REQUEST_CONTEXT, { optional: true });
  const contentApiUrl: string =
    typeof context === 'object' &&
    context !== null &&
    'contentApiUrl' in context &&
    typeof context.contentApiUrl === 'string'
      ? context.contentApiUrl
      : 'http://localhost:3101';
  const siteOrigin: string =
    typeof context === 'object' &&
    context !== null &&
    'siteOrigin' in context &&
    typeof context.siteOrigin === 'string'
      ? context.siteOrigin
      : 'https://valentin-fortin.pro';
  return { contentApiUrl, siteOrigin };
}

/** Request-scoped runtime data source and canonical origin; no Node process API enters Angular bundles. */
export function provideRuntimeContentSnapshot(): Provider[] {
  return [
    {
      provide: CONTENT_SNAPSHOT_LOADER,
      useFactory: (): ContentSnapshotLoader => {
        const origin: string = runtimeOptions().contentApiUrl;
        return (locale) => fetchPublicContentSnapshot(locale, origin);
      },
    },
    { provide: SITE_ORIGIN, useFactory: (): string => new URL(runtimeOptions().siteOrigin).origin },
  ];
}

/** Reads only public content from the configured upstream, with no caller credentials or stale fallback. */
export async function fetchPublicContentSnapshot(
  locale: 'fr' | 'en',
  origin: string,
  fetcher: typeof fetch = fetch,
): Promise<ContentSnapshot> {
  const upstream: URL = new URL(origin);
  if (
    !['http:', 'https:'].includes(upstream.protocol) ||
    upstream.username ||
    upstream.password ||
    upstream.pathname !== '/' ||
    upstream.search ||
    upstream.hash
  ) {
    throw new Error('CONTENT_API_URL must be an HTTP origin without credentials.');
  }
  const response: Response = await fetcher(
    new URL(`/api/content/snapshot?locale=${locale}`, upstream),
    {
      headers: { accept: 'application/json' },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(5_000),
    },
  );
  if (!response.ok) throw new Error(`Public content upstream returned ${response.status}.`);
  const value: ContentSnapshot = ContentSnapshotSchema.parse(await response.json());
  if (value.locale !== locale) throw new Error('Public content locale does not match the request.');
  return value;
}

/** Generates current public addresses from one coherent locale pair, including language alternatives. */
export async function runtimeSitemap(origin: string, upstream: string): Promise<string> {
  let snapshots: ContentSnapshot[] = [];
  for (let attempt: number = 0; attempt < 3; attempt++) {
    snapshots = await Promise.all([
      fetchPublicContentSnapshot('fr', upstream),
      fetchPublicContentSnapshot('en', upstream),
    ]);
    if (snapshots[0]?.revision === snapshots[1]?.revision) break;
    if (attempt === 2) throw new Error('Public locale revisions did not converge.');
  }
  const paths: Set<string> = new Set(['/', '/legal-notice', '/privacy']);
  for (const snapshot of snapshots)
    for (const project of snapshot.projects)
      paths.add(`/projects/${encodeURIComponent(project.slug)}`);
  const escape: (value: string) => string = (value: string): string =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  const base: string = new URL(origin).origin;
  const entries: string[] = [];
  for (const path of paths) {
    const locales: ('fr' | 'en')[] = snapshots
      .filter(
        (snapshot) =>
          !path.startsWith('/projects/') ||
          snapshot.projects.some(
            (project) => path === `/projects/${encodeURIComponent(project.slug)}`,
          ),
      )
      .map((snapshot) => snapshot.locale);
    const alternates: string = [
      ...locales.map(
        (locale): string =>
          `<xhtml:link rel="alternate" hreflang="${locale}" href="${escape(`${base}/${locale}${path}`)}"/>`,
      ),
      `<xhtml:link rel="alternate" hreflang="x-default" href="${escape(`${base}/${locales.includes('fr') ? 'fr' : 'en'}${path}`)}"/>`,
    ].join('');
    for (const locale of locales)
      entries.push(`<url><loc>${escape(`${base}/${locale}${path}`)}</loc>${alternates}</url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries.join('')}</urlset>`;
}
