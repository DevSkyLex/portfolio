import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { workspaceRoot } from '@nx/devkit';
import {
  expect,
  test,
  type APIRequestContext,
  type APIResponse,
  type Locator,
  type Page,
} from '@playwright/test';

/**
 * Interface SnapshotProject
 * @interface SnapshotProject
 *
 * @description
 * Fields of a snapshot project that decide the expected metadata of its page (D42).
 */
interface SnapshotProject {
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly cover: { readonly src: string; readonly width: number } | null;
  readonly seo: { readonly title: string | null; readonly description: string | null };
}

/**
 * Interface ExpectedPage
 * @interface ExpectedPage
 *
 * @description
 * Metadata expected on the movah case study in one locale, computed from the snapshot before the tests
 * so they hold no conditional.
 */
interface ExpectedPage {
  readonly locale: 'fr' | 'en';
  readonly path: string;
  readonly canonical: string;
  readonly title: string;
  readonly descriptionSource: string;
  readonly ogLocale: string;
  readonly images: string[];
  readonly image: string | undefined;
  readonly widths: string[];
  readonly card: string;
  readonly headline: string;
}

/**
 * Constant ORIGIN
 *
 * @description
 * Public origin written in absolute addresses, whatever host serves the build.
 */
const ORIGIN: string = 'https://valentin-fortin.pro';

/**
 * Function snapshotProject
 *
 * @description
 * Reads a project from the snapshot the site was built from.
 */
function snapshotProject(locale: 'fr' | 'en', slug: string): SnapshotProject {
  const snapshot: { projects: SnapshotProject[] } = JSON.parse(
    readFileSync(join(workspaceRoot, 'apps/web/content-snapshot', `${locale}.json`), 'utf8'),
  );
  const project: SnapshotProject | undefined = snapshot.projects.find(
    (candidate: SnapshotProject): boolean => candidate.slug === slug,
  );
  if (!project) throw new Error(`${slug} is not in the ${locale} snapshot.`);
  return project;
}

/**
 * Function expectedPage
 *
 * @description
 * Expected metadata of the movah case study in one locale.
 */
function expectedPage(locale: 'fr' | 'en'): ExpectedPage {
  const project: SnapshotProject = snapshotProject(locale, 'movah');
  const path: string = `${locale === 'en' ? '/en' : ''}/projects/movah`;
  const cover: SnapshotProject['cover'] = project.cover;
  return {
    locale,
    path,
    canonical: `${ORIGIN}${path}`,
    title: project.seo.title ?? `${project.title} — Valentin Fortin`,
    // A custom description is written verbatim; the summary may be cut near 160 characters.
    descriptionSource: (project.seo.description ?? project.summary).replace(/\s+/g, ' ').trim(),
    ogLocale: locale === 'en' ? 'en_GB' : 'fr_FR',
    images: cover ? [`${ORIGIN}${cover.src}`] : [],
    image: cover ? `${ORIGIN}${cover.src}` : undefined,
    widths: cover ? [String(cover.width)] : [],
    card: cover ? 'summary_large_image' : 'summary',
    headline: project.title,
  };
}

/**
 * Function attribute
 *
 * @description
 * Reads one attribute of the single element matching a selector, failing on duplicates.
 */
async function attribute(page: Page, selector: string, name: string): Promise<string> {
  await expect(page.locator(selector)).toHaveCount(1);
  return (await page.locator(selector).getAttribute(name)) ?? '';
}

/**
 * Function structuredData
 *
 * @description
 * Parses the single JSON-LD data block of the page.
 */
async function structuredData(page: Page): Promise<Record<string, unknown>> {
  const block: Locator = page.locator('script[type="application/ld+json"]');
  await expect(block).toHaveCount(1);
  return JSON.parse((await block.textContent()) ?? '');
}

/**
 * Function contents
 *
 * @description
 * Reads the `content` attribute of every meta tag matching a selector.
 */
function contents(page: Page, selector: string): Promise<(string | null)[]> {
  return page
    .locator(selector)
    .evaluateAll((elements: Element[]): (string | null)[] =>
      elements.map((element: Element): string | null => element.getAttribute('content')),
    );
}

for (const expected of [expectedPage('fr'), expectedPage('en')]) {
  test(`writes the search metadata of ${expected.path}`, async ({
    page,
    request,
  }: {
    page: Page;
    request: APIRequestContext;
  }): Promise<void> => {
    // Prerendered document: what a crawler reads without running the bundle.
    const html: string = await (await request.get(expected.path)).text();
    expect(html.match(/<link [^>]*rel="canonical"/g)).toHaveLength(1);
    expect(html).toContain('type="application/ld+json"');

    await page.goto(expected.path);
    await expect(page.locator('html')).toHaveAttribute('data-app', '');
    await expect(page).toHaveTitle(expected.title);

    const description: string = await attribute(page, 'meta[name="description"]', 'content');
    expect(description.length).toBeLessThanOrEqual(170);
    expect(expected.descriptionSource.startsWith(description.replace(/…$/, ''))).toBe(true);

    expect(await attribute(page, 'link[rel="canonical"]', 'href')).toBe(expected.canonical);
    for (const [hreflang, href] of [
      ['fr', `${ORIGIN}/projects/movah`],
      ['en', `${ORIGIN}/en/projects/movah`],
      ['x-default', `${ORIGIN}/projects/movah`],
    ]) {
      expect(await attribute(page, `link[rel="alternate"][hreflang="${hreflang}"]`, 'href')).toBe(
        href,
      );
    }
    expect(await attribute(page, 'meta[property="og:type"]', 'content')).toBe('article');
    expect(await attribute(page, 'meta[property="og:url"]', 'content')).toBe(expected.canonical);
    expect(await attribute(page, 'meta[property="og:locale"]', 'content')).toBe(expected.ogLocale);
    expect(await contents(page, 'meta[property="og:image"]')).toEqual(expected.images);
    expect(await contents(page, 'meta[property="og:image:width"]')).toEqual(expected.widths);
    expect(await attribute(page, 'meta[name="twitter:card"]', 'content')).toBe(expected.card);

    const data: Record<string, unknown> = await structuredData(page);
    expect(data).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      headline: expected.headline,
      url: expected.canonical,
      inLanguage: expected.locale,
      author: { '@type': 'Person', name: 'Valentin Fortin' },
    });
    expect(data['image']).toBe(expected.image);
    expect(data['datePublished']).toBeUndefined();
  });
}

test('replaces the metadata when moving to the next project, then removes them on the home page', async ({
  page,
}: {
  page: Page;
}): Promise<void> => {
  await page.goto('/projects/movah');
  await expect(page.locator('html')).toHaveAttribute('data-app', '');
  await page
    .getByRole('navigation', { name: 'Autres projets' })
    .getByRole('link', { name: /Projet suivant/ })
    .click();
  await expect(page).not.toHaveURL(/\/projects\/movah$/);
  const next: string = new URL(page.url()).pathname;
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${ORIGIN}${next}`);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('link[rel="alternate"]')).toHaveCount(3);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);

  await page.getByRole('link', { name: 'Tous les projets' }).click();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${ORIGIN}/`);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
});

test('serves a sitemap listing every page in both languages', async ({
  request,
}: {
  request: APIRequestContext;
}): Promise<void> => {
  const reply: APIResponse = await request.get('/sitemap.xml');
  expect(reply.status()).toBe(200);
  expect(reply.headers()['content-type']).toMatch(/xml/);
  const xml: string = await reply.text();
  for (const path of [
    '/',
    '/en/',
    '/legal-notice',
    '/en/privacy',
    '/projects/movah',
    '/en/projects/movah',
  ]) {
    expect(xml).toContain(`<loc>${ORIGIN}${path}</loc>`);
  }
  expect(xml).toContain(
    `<xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}/projects/movah"/>`,
  );
});

test('serves robots.txt that keeps the admin area out and points to the sitemap', async ({
  request,
}: {
  request: APIRequestContext;
}): Promise<void> => {
  const reply: APIResponse = await request.get('/robots.txt');
  expect(reply.status()).toBe(200);
  expect(reply.headers()['content-type']).toMatch(/^text\/plain/);
  const text: string = await reply.text();
  for (const line of [
    'User-agent: *',
    'Disallow: /admin',
    'Disallow: /en/admin',
    'Disallow: /api/',
    `Sitemap: ${ORIGIN}/sitemap.xml`,
  ]) {
    expect(text).toContain(line);
  }
});
