import { DOCUMENT, LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import type { ProjectArticle } from '@vfortin/content-web-model';
import { provideSiteOrigin } from '@internal/content-web-data-access/lib/providers/site-origin/site-origin.provider';
import { PageSeoService } from '@internal/content-web-data-access/lib/services/page-seo/page-seo.service';

/**
 * Function article
 *
 * @description
 * Builds a case study with optional overrides.
 */
const article = (overrides: Partial<ProjectArticle> = {}): ProjectArticle => ({
  slug: 'movah',
  title: 'Movah',
  summary: 'Une application mobile pour suivre ses séries.',
  periodLabel: '2026',
  techs: ['flutter'],
  featured: true,
  cover: {
    src: '/media/8c9d0e1f-2a3b-4c5d-8e6f-7a8b9c0d1e2f.webp',
    small: null,
    width: 2400,
    height: 1350,
    alt: 'Accueil de Movah',
  },
  lead: 'Flutter et Supabase.',
  client: 'Projet personnel',
  role: 'Développement',
  place: 'Android et iOS',
  site: null,
  intro: [],
  sections: [],
  seo: { title: null, description: null, keywords: [] },
  ...overrides,
});

/**
 * Function setup
 *
 * @description
 * Creates the service for a locale with a trailing-slash origin, which the provider normalizes.
 */
function setup(locale: string = 'fr'): { seo: PageSeoService; head: HTMLHeadElement } {
  TestBed.configureTestingModule({
    providers: [
      { provide: LOCALE_ID, useValue: locale },
      provideSiteOrigin('https://example.test/'),
    ],
  });
  const head: HTMLHeadElement = TestBed.inject<Document>(DOCUMENT).head;
  head.querySelectorAll('meta, link, script').forEach((element: Element): void => element.remove());
  return { seo: TestBed.inject<PageSeoService>(PageSeoService), head };
}

/**
 * Function content
 *
 * @description
 * Reads the content of a meta tag, `null` when absent.
 */
const content = (head: HTMLHeadElement, selector: string): string | null =>
  head.querySelector(`meta[${selector}]`)?.getAttribute('content') ?? null;

describe('PageSeoService', (): void => {
  it('writes the title, description, links, social tags and JSON-LD of a case study', (): void => {
    const { seo, head } = setup();
    seo.project(article());

    expect(TestBed.inject<Title>(Title).getTitle()).toBe('Movah — Valentin Fortin');
    expect(content(head, 'name="description"')).toBe(
      'Une application mobile pour suivre ses séries.',
    );
    expect(head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://example.test/fr/projects/movah',
    );
    expect(
      [...head.querySelectorAll('link[rel="alternate"]')].map((link: Element): string[] => [
        link.getAttribute('hreflang') ?? '',
        link.getAttribute('href') ?? '',
      ]),
    ).toEqual([
      ['fr', 'https://example.test/fr/projects/movah'],
      ['en', 'https://example.test/en/projects/movah'],
      ['x-default', 'https://example.test/fr/projects/movah'],
    ]);
    expect(content(head, 'name="keywords"')).toBe('flutter');
    expect(content(head, 'property="og:type"')).toBe('article');
    expect(content(head, 'property="og:site_name"')).toBe('Valentin Fortin');
    expect(content(head, 'property="og:locale"')).toBe('fr_FR');
    expect(content(head, 'property="og:locale:alternate"')).toBe('en_GB');
    expect(content(head, 'property="og:image"')).toBe(
      'https://example.test/media/8c9d0e1f-2a3b-4c5d-8e6f-7a8b9c0d1e2f.webp',
    );
    expect(content(head, 'property="og:image:width"')).toBe('2400');
    expect(content(head, 'property="og:image:height"')).toBe('1350');
    expect(content(head, 'property="og:image:alt"')).toBe('Accueil de Movah');
    expect(content(head, 'name="twitter:card"')).toBe('summary_large_image');

    const scripts: NodeListOf<Element> = head.querySelectorAll(
      'script[type="application/ld+json"]',
    );
    expect(scripts).toHaveLength(1);
    expect(JSON.parse(scripts[0]?.textContent ?? '')).toMatchObject({
      '@type': 'CreativeWork',
      headline: 'Movah',
      inLanguage: 'fr',
    });
  });

  it('replaces the tags of the previous project instead of adding new ones', (): void => {
    const { seo, head } = setup('en');
    seo.project(article());
    seo.project(
      article({
        slug: 'rdi-manager',
        title: 'RDI Manager',
        techs: [],
        cover: null,
        seo: {
          title: 'RDI Manager for research',
          description: 'Custom description.',
          keywords: [],
        },
      }),
    );

    expect(head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(head.querySelectorAll('link[rel="alternate"]')).toHaveLength(3);
    expect(head.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1);
    expect(head.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);
    expect(TestBed.inject<Title>(Title).getTitle()).toBe('RDI Manager for research');
    expect(content(head, 'property="og:url"')).toBe('https://example.test/en/projects/rdi-manager');
    expect(content(head, 'property="og:locale"')).toBe('en_GB');
    expect(content(head, 'property="og:image"')).toBeNull();
    expect(content(head, 'name="twitter:image"')).toBeNull();
    expect(content(head, 'name="twitter:card"')).toBe('summary');
    // Neither keywords nor technologies: the previous project's keywords are removed.
    expect(content(head, 'name="keywords"')).toBeNull();
    expect(head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
  });

  it('removes the tags written by a prerendered page before writing its own', (): void => {
    const { seo, head } = setup();
    const stale: HTMLLinkElement = document.createElement('link');
    stale.setAttribute('data-page-seo', '');
    stale.setAttribute('rel', 'canonical');
    stale.setAttribute('href', 'https://example.test/projects/old');
    head.append(stale);

    seo.project(article());

    expect(
      [...head.querySelectorAll('link[rel="canonical"]')].map((link: Element): string | null =>
        link.getAttribute('href'),
      ),
    ).toEqual(['https://example.test/fr/projects/movah']);
  });

  it('writes a website page without an image or JSON-LD', (): void => {
    const { seo, head } = setup();
    seo.website({ title: 'Valentin Fortin', description: 'Portfolio.', path: '/' });

    expect(content(head, 'property="og:type"')).toBe('website');
    expect(head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://example.test/fr/',
    );
    expect(head.querySelector('script[type="application/ld+json"]')).toBeNull();
  });

  it('clears the page tags and restores the site description', (): void => {
    const { seo, head } = setup();
    seo.setSiteDescription('Description du site.');
    seo.project(article());

    seo.clear();

    expect(content(head, 'name="description"')).toBe('Description du site.');
    expect(head.querySelector('[data-page-seo]')).toBeNull();
    expect(head.querySelector('meta[property^="og:"]')).toBeNull();
    expect(head.querySelector('meta[name^="twitter:"]')).toBeNull();
    expect(head.querySelector('meta[name="keywords"]')).toBeNull();
  });

  it('leaves the description alone on clear when no site description was set', (): void => {
    const { seo, head } = setup();
    seo.project(article());

    seo.clear();

    expect(content(head, 'name="description"')).toBe(
      'Une application mobile pour suivre ses séries.',
    );
  });
});
