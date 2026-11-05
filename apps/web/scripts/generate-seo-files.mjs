// Writes sitemap.xml and robots.txt into the built site from the content snapshot (D42).
// Usage, after `web:build`: SITE_ORIGIN=https://… node apps/web/scripts/generate-seo-files.mjs
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * @typedef {'fr' | 'en'} SiteLocale
 * @typedef {{ path: string, locales: SiteLocale[] }} SitePage
 */

/** Production origin; the Angular `SITE_ORIGIN` token defaults to the same value. */
export const DEFAULT_SITE_ORIGIN = 'https://valentin-fortin.pro';

/** @type {readonly SiteLocale[]} Locales of the static build. */
const LOCALES = ['fr', 'en'];

/** Prerendered pages that exist in both locales whatever the content. */
const STATIC_PATHS = ['/', '/legal-notice', '/privacy'];

/**
 * Builds the absolute address of a page in one locale.
 *
 * @param {string} origin - Site origin without a trailing slash.
 * @param {SiteLocale} locale - Page locale.
 * @param {string} path - Locale-independent path starting with `/`.
 * @returns {string} Absolute address under its locale prefix.
 */
export function localizedUrl(origin, locale, path) {
  return `${origin}/${locale}${path}`;
}

/**
 * Reads the project slugs of one snapshot, checking only what the sitemap needs; the full contract
 * is validated by the prerender (D10), which runs before this script.
 *
 * @param {unknown} value - Parsed snapshot file.
 * @param {SiteLocale} locale - Expected locale.
 * @returns {string[]} Project slugs in snapshot order.
 */
export function projectSlugs(value, locale) {
  if (
    value === null ||
    typeof value !== 'object' ||
    !('locale' in value) ||
    value.locale !== locale ||
    !('projects' in value) ||
    !Array.isArray(value.projects)
  ) {
    throw new Error(`Invalid ${locale} snapshot.`);
  }
  return value.projects.map((project) => {
    if (
      project === null ||
      typeof project !== 'object' ||
      typeof project.slug !== 'string' ||
      project.slug === ''
    ) {
      throw new Error(`Invalid project slug in the ${locale} snapshot.`);
    }
    return project.slug;
  });
}

/**
 * Lists the public pages and the locales each one exists in: the home page, the legal pages, then
 * every project in French snapshot order, followed by the projects only the English one carries.
 *
 * @param {Record<SiteLocale, string[]>} slugs - Project slugs per locale.
 * @returns {SitePage[]} Pages of the sitemap.
 */
export function sitePages(slugs) {
  const ordered = [...new Set([...slugs.fr, ...slugs.en])];
  return [
    ...STATIC_PATHS.map((path) => ({ path, locales: [...LOCALES] })),
    ...ordered.map((slug) => ({
      path: `/projects/${encodeURIComponent(slug)}`,
      locales: LOCALES.filter((locale) => slugs[locale].includes(slug)),
    })),
  ];
}

/**
 * Escapes a text for an XML attribute or element.
 *
 * @param {string} value - Raw text.
 * @returns {string} Escaped text.
 */
function xml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Serializes the sitemap: one `<url>` per page and locale, each listing every language version and
 * `x-default` (the French page, or the only version) as `xhtml:link` alternates. No `lastmod`: the
 * snapshot carries no date.
 *
 * @param {string} origin - Site origin without a trailing slash.
 * @param {SitePage[]} pages - Pages and their locales.
 * @returns {string} sitemap.xml content.
 */
export function sitemapXml(origin, pages) {
  const urls = pages.flatMap((page) => {
    const fallback = page.locales.includes('fr') ? 'fr' : page.locales[0];
    const alternates = [
      ...page.locales.map((locale) => [locale, localizedUrl(origin, locale, page.path)]),
      ['x-default', localizedUrl(origin, fallback, page.path)],
    ]
      .map(
        ([hreflang, href]) =>
          `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${xml(href)}"/>`,
      )
      .join('\n');
    return page.locales.map(
      (locale) =>
        `  <url>\n    <loc>${xml(localizedUrl(origin, locale, page.path))}</loc>\n${alternates}\n  </url>`,
    );
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

/**
 * Serializes robots.txt: everything is crawlable except the client-rendered admin area (D18) and the
 * APIs; the sitemap is announced.
 *
 * @param {string} origin - Site origin without a trailing slash.
 * @returns {string} robots.txt content.
 */
export function robotsTxt(origin) {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /fr/admin',
    'Disallow: /en/admin',
    'Disallow: /api/',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
}

/**
 * Reads both snapshots and writes sitemap.xml and robots.txt at the root of the built site. Refuses
 * an output without the prerendered home page, so it never runs before `web:build`.
 *
 * @param {{ snapshotDirectory?: string, outputDirectory?: string, origin?: string }} [options] -
 *   Snapshot folder, built browser folder and public origin; isolated tests pass their own.
 * @returns {Promise<{ pages: number, urls: number }>} Counts printed by the command.
 */
export async function writeSeoFiles({
  snapshotDirectory = fileURLToPath(new URL('../content-snapshot/', import.meta.url)),
  outputDirectory = fileURLToPath(new URL('../../../dist/apps/web/browser/', import.meta.url)),
  origin = process.env.SITE_ORIGIN || DEFAULT_SITE_ORIGIN,
} = {}) {
  if (!/^https?:\/\/[^/\s]+\/*$/.test(origin)) {
    throw new Error(`SITE_ORIGIN must be a scheme and a host: ${origin}`);
  }
  const base = origin.replace(/\/+$/, '');
  if (!existsSync(join(outputDirectory, 'fr', 'index.html'))) {
    throw new Error(`No built site in ${outputDirectory}: run npx nx run web:build first.`);
  }
  /** @type {Record<SiteLocale, string[]>} */
  const slugs = { fr: [], en: [] };
  for (const locale of LOCALES) {
    const file = join(snapshotDirectory, `${locale}.json`);
    slugs[locale] = projectSlugs(JSON.parse(await readFile(file, 'utf8')), locale);
  }
  const pages = sitePages(slugs);
  // Keep the root release marker and French error pages available while the Nginx and site
  // workflows are deployed independently. Nginx redirects the legacy home to /fr/.
  await writeFile(
    join(outputDirectory, 'index.html'),
    '<!doctype html><html lang="fr"><head><meta http-equiv="refresh" content="0;url=/fr/"></head><body><a href="/fr/">Français</a></body></html>\n',
  );
  for (const file of ['index.csr.html', 'admin.css']) {
    const source = join(outputDirectory, 'fr', file);
    if (existsSync(source)) await copyFile(source, join(outputDirectory, file));
  }
  for (const code of ['403', '404', '500', '503']) {
    const source = join(outputDirectory, 'fr', 'error', code, 'index.html');
    if (existsSync(source)) {
      const destination = join(outputDirectory, 'error', code);
      await mkdir(destination, { recursive: true });
      await copyFile(source, join(destination, 'index.html'));
    }
  }
  await writeFile(join(outputDirectory, 'sitemap.xml'), sitemapXml(base, pages));
  await writeFile(join(outputDirectory, 'robots.txt'), robotsTxt(base));
  return { pages: pages.length, urls: pages.reduce((sum, page) => sum + page.locales.length, 0) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Optional built browser folder, e.g. the browser-test build `dist/apps/web-e2e-site/browser` (D48).
  const output = process.argv[2];
  const { pages, urls } = await writeSeoFiles(output ? { outputDirectory: resolve(output) } : {});
  console.log(`sitemap.xml: ${urls} addresses for ${pages} pages; robots.txt written`);
}
