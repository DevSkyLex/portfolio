import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  projectSlugs,
  robotsTxt,
  sitePages,
  sitemapXml,
  writeSeoFiles,
} from '../generate-seo-files.mjs';

/**
 * @param {'fr' | 'en'} locale - Snapshot locale.
 * @param {string[]} slugs - Published project slugs.
 * @returns {string} Snapshot file content with the fields the generator reads.
 */
function snapshot(locale, slugs) {
  return JSON.stringify({ locale, revision: 4, projects: slugs.map((slug) => ({ slug })) });
}

describe('sitePages', () => {
  it('lists the home and legal pages, then each project with the locales it exists in', () => {
    assert.deepEqual(sitePages({ fr: ['movah', 'crm'], en: ['crm', 'movah', 'english-only'] }), [
      { path: '/', locales: ['fr', 'en'] },
      { path: '/legal-notice', locales: ['fr', 'en'] },
      { path: '/privacy', locales: ['fr', 'en'] },
      { path: '/projects/movah', locales: ['fr', 'en'] },
      { path: '/projects/crm', locales: ['fr', 'en'] },
      { path: '/projects/english-only', locales: ['en'] },
    ]);
  });
});

describe('projectSlugs', () => {
  it('reads the slugs and refuses a snapshot of another locale or without slugs', () => {
    assert.deepEqual(projectSlugs({ locale: 'fr', projects: [{ slug: 'movah' }] }, 'fr'), [
      'movah',
    ]);
    assert.throws(() => projectSlugs({ locale: 'en', projects: [] }, 'fr'), /Invalid fr snapshot/);
    assert.throws(() => projectSlugs({ locale: 'fr', projects: [{}] }, 'fr'), /Invalid project/);
  });
});

describe('sitemapXml', () => {
  const origin = 'https://valentin-fortin.pro';

  it('writes one url per locale with the hreflang alternates and x-default on French', () => {
    const xml = sitemapXml(origin, [{ path: '/projects/movah', locales: ['fr', 'en'] }]);
    assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset /);
    assert.match(xml, /xmlns:xhtml="http:\/\/www.w3.org\/1999\/xhtml"/);
    assert.equal(xml.match(/<url>/g)?.length, 2);
    assert.ok(xml.includes('<loc>https://valentin-fortin.pro/projects/movah</loc>'));
    assert.ok(xml.includes('<loc>https://valentin-fortin.pro/en/projects/movah</loc>'));
    assert.equal(
      xml.match(
        /<xhtml:link rel="alternate" hreflang="x-default" href="https:\/\/valentin-fortin.pro\/projects\/movah"\/>/g,
      )?.length,
      2,
    );
    assert.ok(!xml.includes('lastmod'));
  });

  it('keeps the trailing slash of the home pages and escapes the addresses', () => {
    const xml = sitemapXml('https://example.test', [
      { path: '/', locales: ['fr', 'en'] },
      { path: '/projects/a&b', locales: ['en'] },
    ]);
    assert.ok(xml.includes('<loc>https://example.test/</loc>'));
    assert.ok(xml.includes('<loc>https://example.test/en/</loc>'));
    assert.ok(xml.includes('<loc>https://example.test/en/projects/a&amp;b</loc>'));
    assert.ok(
      xml.includes(
        '<xhtml:link rel="alternate" hreflang="x-default" href="https://example.test/en/projects/a&amp;b"/>',
      ),
    );
  });
});

describe('robotsTxt', () => {
  it('allows the site, keeps the admin area and the APIs out and announces the sitemap', () => {
    assert.equal(
      robotsTxt('https://valentin-fortin.pro'),
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        'Disallow: /en/admin',
        'Disallow: /api/',
        '',
        'Sitemap: https://valentin-fortin.pro/sitemap.xml',
        '',
      ].join('\n'),
    );
  });
});

describe('writeSeoFiles', () => {
  /** @type {string} */
  let fixture;
  /** @type {string} */
  let snapshotDirectory;
  /** @type {string} */
  let outputDirectory;

  beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'portfolio-seo-'));
    snapshotDirectory = join(fixture, 'snapshots');
    outputDirectory = join(fixture, 'browser');
    await mkdir(snapshotDirectory);
    await mkdir(outputDirectory);
    await writeFile(join(snapshotDirectory, 'fr.json'), snapshot('fr', ['movah']));
    await writeFile(join(snapshotDirectory, 'en.json'), snapshot('en', ['movah']));
  });

  afterEach(async () => {
    assert.equal(dirname(resolve(fixture)), resolve(tmpdir()));
    assert.ok(fixture.startsWith(join(tmpdir(), 'portfolio-seo-')));
    await rm(fixture, { recursive: true, force: true });
  });

  it('writes both files at the root of the built site', async () => {
    await writeFile(join(outputDirectory, 'index.html'), '<!doctype html>');
    const summary = await writeSeoFiles({
      snapshotDirectory,
      outputDirectory,
      origin: 'https://example.test/',
    });
    assert.deepEqual(summary, { pages: 4, urls: 8 });
    const xml = await readFile(join(outputDirectory, 'sitemap.xml'), 'utf8');
    assert.ok(xml.includes('<loc>https://example.test/en/projects/movah</loc>'));
    assert.ok(xml.includes('<loc>https://example.test/legal-notice</loc>'));
    assert.match(
      await readFile(join(outputDirectory, 'robots.txt'), 'utf8'),
      /Sitemap: https:\/\/example.test\/sitemap.xml\n$/,
    );
  });

  it('refuses to run before the build and refuses an origin with a path', async () => {
    await assert.rejects(
      writeSeoFiles({ snapshotDirectory, outputDirectory, origin: 'https://example.test' }),
      /No built site/,
    );
    await writeFile(join(outputDirectory, 'index.html'), '<!doctype html>');
    await assert.rejects(
      writeSeoFiles({ snapshotDirectory, outputDirectory, origin: 'https://example.test/fr' }),
      /SITE_ORIGIN must be a scheme and a host/,
    );
  });
});
