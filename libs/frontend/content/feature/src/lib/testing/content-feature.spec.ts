import { LOCALE_ID } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, type Route } from '@angular/router';
import { provideContentSnapshots, provideSiteOrigin } from '@vfortin/content-web-data-access';
import { CONTENT_ROUTES } from '@internal/content-web-feature/lib/content.routes';
import { ProjectPageComponent } from '@internal/content-web-feature/lib/ui/pages/project-page/project-page.component';
import { ContentSectionsComponent } from '@internal/content-web-feature/lib/ui/sections/content-sections/content-sections.component';

/**
 * Function paragraph
 *
 * @description
 * Builds a contract paragraph made of one plain text node.
 */
const paragraph = (text: string): ArticleNodeFixture => ({
  type: 'paragraph',
  content: [{ type: 'text', text }],
});

/**
 * Function heading
 *
 * @description
 * Builds a contract level-2 heading, which opens a section.
 */
const heading = (text: string): ArticleNodeFixture => ({
  type: 'heading',
  attrs: { level: 2 },
  content: [{ type: 'text', text }],
});

/**
 * Constant ARTICLES
 *
 * @description
 * Published documents of the fixture projects: `crm` has an introduction, four sections, a list and a
 * figure; `library-trails` other sections; `solo` an introduction only.
 */
const ARTICLES: Readonly<Record<string, readonly ArticleNodeFixture[]>> = {
  crm: [
    paragraph('Intro article.'),
    heading('Contexte'),
    paragraph('Contexte.'),
    heading('Ce que j’ai fait'),
    paragraph('Travail.'),
    {
      type: 'bulletList',
      content: [{ type: 'listItem', content: [paragraph('Point.')] }],
    },
    heading('Résultat'),
    paragraph('Résultat.'),
    {
      type: 'figure',
      attrs: {
        src: '/media/3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90.webp',
        small: null,
        width: 1200,
        height: 900,
        alt: 'Écran du tableau de bord',
        caption: 'Capture.',
      },
    },
    heading('Ce que je retiens'),
    paragraph('Leçon.'),
  ],
  'library-trails': [
    heading('Genèse'),
    paragraph('Idée.'),
    heading('Architecture'),
    paragraph('Supabase.'),
  ],
  solo: [paragraph('Seulement une introduction.')],
};

/**
 * Constant COVER
 *
 * @description
 * Cover of the `library-trails` fixture, with a 960 px rendition.
 */
const COVER: {
  src: string;
  small: string;
  width: number;
  height: number;
  alt: string;
} = {
  src: '/media/8c9d0e1f-2a3b-4c5d-8e6f-7a8b9c0d1e2f.webp',
  small: '/media/8c9d0e1f-2a3b-4c5d-8e6f-7a8b9c0d1e2f-960.webp',
  width: 2400,
  height: 1350,
  alt: 'Accueil de Library Trails',
};

/**
 * Function project
 *
 * @description
 * Creates a localized project fixture with its article document; only `library-trails` has a cover.
 *
 * @param {string} slug - Identifier and visible title source for the fixture.
 * @param {boolean} featured - Whether the project belongs to the featured group.
 *
 * @returns {ProjectSnapshotFixture} Contract-shaped project fixture for content snapshot tests.
 */
const project = (slug: string, featured: boolean): ProjectSnapshotFixture => ({
  slug,
  title: slug.toUpperCase(),
  summary: 'Résumé.',
  lead: 'Intro.',
  periodLabel: '2026',
  client: 'Client',
  role: 'Rôle',
  place: 'Lieu',
  siteUrl: null,
  techs: ['angular'],
  featured,
  article: { type: 'doc', content: ARTICLES[slug] ?? [] },
  cover: slug === 'library-trails' ? COVER : null,
  seo: {
    title: slug === 'solo' ? 'Solo, projet seul' : null,
    description: null,
    keywords: slug === 'solo' ? ['projet seul'] : [],
  },
});

/**
 * Constant snapshot
 *
 * @description
 * French content fixture with one featured project, two regular projects, and profile facts for home and article rendering assertions.
 *
 * @type {import('@vfortin/content-contracts').ContentSnapshot}
 */
const snapshot = {
  locale: 'fr',
  revision: 1,
  profile: {
    heroIntro: 'Intro.',
    aboutStatement: 'Phrase.',
    aboutLead: 'Après une formation fictive en design.',
    facts: [{ label: 'Basé à', value: 'Ville-Exemple' }],
  },
  projects: [project('library-trails', true), project('crm', false), project('solo', false)],
  timeline: [],
  skills: [
    {
      id: 'front',
      domain: 'Front-end',
      techs: [{ key: 'angular', language: null }],
      usage: 'Interfaces.',
    },
  ],
  legal: {
    notice: {
      updatedOn: '2026-11-02',
      document: { type: 'doc', content: [{ type: 'paragraph' }] },
    },
    privacy: {
      updatedOn: '2026-11-02',
      document: { type: 'doc', content: [{ type: 'paragraph' }] },
    },
  },
} as const;

beforeEach((): void => {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: LOCALE_ID, useValue: 'fr' },
      provideContentSnapshots({ fr: snapshot, en: { ...snapshot, locale: 'en' } }),
      provideSiteOrigin(),
    ],
  });
});

/**
 * Function renderPage
 *
 * @description
 * Renders the project page for a slug.
 */
async function renderPage(slug: string): Promise<ComponentFixture<ProjectPageComponent>> {
  const fixture: ComponentFixture<ProjectPageComponent> =
    TestBed.createComponent(ProjectPageComponent);
  fixture.componentRef.setInput('slug', slug);
  await fixture.whenStable();
  return fixture;
}

/**
 * Function tocLinks
 *
 * @description
 * Reads the table-of-contents links of a rendered page.
 */
function tocLinks(root: HTMLElement): HTMLAnchorElement[] {
  return [...root.querySelectorAll<HTMLAnchorElement>('nav[aria-label="Sommaire"] a')];
}

/**
 * Function current
 *
 * @description
 * Reads the link of the current section in the table of contents.
 */
function current(root: HTMLElement): string | null | undefined {
  return root
    .querySelector('nav[aria-label="Sommaire"] a[aria-current="true"]')
    ?.getAttribute('href');
}

describe('ContentSectionsComponent', (): void => {
  it('shows the featured project then the others, and renders the anchored sections', async (): Promise<void> => {
    const fixture: ComponentFixture<ContentSectionsComponent> =
      TestBed.createComponent(ContentSectionsComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(
      [...root.querySelectorAll('content-project-card h3')].map((h: Element): string =>
        h.textContent?.trim(),
      ),
    ).toEqual(['LIBRARY-TRAILS', 'CRM', 'SOLO']);
    expect(
      [...root.querySelectorAll(':scope > * > section')].map((s: Element): string => s.id),
    ).toEqual(['projects', 'journey', 'skills', 'about']);
    expect(root.querySelector('dl dt')?.textContent?.trim()).toBe('Basé à');
  });

  it('shows the cover of a project on its card', async (): Promise<void> => {
    const fixture: ComponentFixture<ContentSectionsComponent> =
      TestBed.createComponent(ContentSectionsComponent);
    await fixture.whenStable();
    const images: HTMLImageElement[] = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLImageElement>(
        'content-project-card img',
      ),
    ];
    expect(
      images.map((image: HTMLImageElement): string | null => image.getAttribute('src')),
    ).toEqual([COVER.src]);
  });
});

describe('ProjectPageComponent', (): void => {
  it('renders the case study, its neighbours and the document title', async (): Promise<void> => {
    const root: HTMLElement = (await renderPage('crm')).nativeElement;
    expect(root.querySelector('h1')?.textContent?.trim()).toBe('CRM');
    const article: HTMLElement | null = root.querySelector('article');
    expect(article?.firstElementChild?.textContent).toBe('Intro article.');
    expect(root.querySelector('#resultat')?.textContent).toContain('Résultat.');
    expect(root.querySelector('#ce-que-j-ai-fait li')?.textContent).toBe('Point.');
    expect(root.querySelector('#resultat figcaption')?.textContent).toBe('Capture.');
    expect(root.querySelector('#resultat img')?.getAttribute('alt')).toBe(
      'Écran du tableau de bord',
    );
    expect(root.querySelector('nav a[href="/projects/library-trails"]')).not.toBeNull();
    expect(TestBed.inject<Title>(Title).getTitle()).toBe('CRM — Valentin Fortin');
  });

  it('writes the search metadata of the article and replaces them on the next one', async (): Promise<void> => {
    const fixture: ComponentFixture<ProjectPageComponent> = await renderPage('library-trails');
    const head: HTMLHeadElement = document.head;
    expect(head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Résumé.');
    expect(head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://valentin-fortin.pro/fr/projects/library-trails',
    );
    expect(head.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(
      `https://valentin-fortin.pro${COVER.src}`,
    );

    fixture.componentRef.setInput('slug', 'solo');
    await fixture.whenStable();
    expect(TestBed.inject<Title>(Title).getTitle()).toBe('Solo, projet seul');
    expect(head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://valentin-fortin.pro/fr/projects/solo',
    );
    expect(head.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1);
    expect(head.querySelector('meta[property="og:image"]')).toBeNull();

    fixture.destroy();
    expect(head.querySelector('[data-page-seo]')).toBeNull();
    expect(head.querySelector('meta[property="og:title"]')).toBeNull();
  });

  it('opens one labelled section per level-2 heading and lists them in the table of contents', async (): Promise<void> => {
    const root: HTMLElement = (await renderPage('crm')).nativeElement;
    const sections: HTMLElement[] = [...root.querySelectorAll<HTMLElement>('article > section')];
    expect(sections.map((section: HTMLElement): string => section.id)).toEqual([
      'contexte',
      'ce-que-j-ai-fait',
      'resultat',
      'ce-que-je-retiens',
    ]);
    for (const section of sections) {
      expect(section.hasAttribute('data-spy')).toBe(true);
      const title: HTMLElement | null = section.querySelector(':scope > h2');
      expect(section.getAttribute('aria-labelledby')).toBe(title?.id);
      expect(title?.id).toBe(`article-heading_${section.id}`);
    }
    expect(sections[0]?.querySelector('h2')?.className).toContain('font-display');
    const links: HTMLAnchorElement[] = tocLinks(root);
    expect(
      links.map((link: HTMLAnchorElement): string | null => link.getAttribute('href')),
    ).toEqual(['/#contexte', '/#ce-que-j-ai-fait', '/#resultat', '/#ce-que-je-retiens']);
    expect(links.map((link: HTMLAnchorElement): string | null => link.textContent)).toEqual([
      'Contexte',
      'Ce que j’ai fait',
      'Résultat',
      'Ce que je retiens',
    ]);
    expect(
      sections.map((section: HTMLElement): string | undefined =>
        section.querySelector('h2')?.textContent?.trim(),
      ),
    ).toEqual(['Contexte', 'Ce que j’ai fait', 'Résultat', 'Ce que je retiens']);
    expect(
      links.map((link: HTMLAnchorElement): string | null => link.getAttribute('aria-current')),
    ).toEqual(['true', null, null, null]);
  });

  it('keeps the tint without a cover and shows the cover first otherwise', async (): Promise<void> => {
    const tinted: HTMLElement = (await renderPage('crm')).nativeElement;
    const placeholder: Element | null | undefined = tinted
      .querySelector('[uiScrollProgress]')
      ?.querySelector(':scope > div');
    expect(placeholder?.className).toContain('bg-[color-mix(');
    expect(tinted.querySelector('[uiScrollProgress] img')).toBeNull();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'fr' },
        provideContentSnapshots({ fr: snapshot, en: { ...snapshot, locale: 'en' } }),
        provideSiteOrigin(),
      ],
    });
    const root: HTMLElement = (await renderPage('library-trails')).nativeElement;
    const cover: HTMLImageElement | null = root.querySelector('[uiScrollProgress] img');
    expect(cover?.getAttribute('src')).toBe(COVER.src);
    expect(cover?.getAttribute('srcset')).toBe(`${COVER.small} 960w, ${COVER.src} 2400w`);
    expect(cover?.getAttribute('sizes')).toBe('(min-width: 1280px) 1200px, 100vw');
    expect(cover?.getAttribute('alt')).toBe('Accueil de Library Trails');
    expect(cover?.getAttribute('fetchpriority')).toBe('high');
    expect(cover?.hasAttribute('loading')).toBe(false);
    expect(cover?.getAttribute('width')).toBe('2400');
    expect(cover?.getAttribute('height')).toBe('1350');
  });

  it('hides the table of contents of an article without sections', async (): Promise<void> => {
    const root: HTMLElement = (await renderPage('solo')).nativeElement;
    expect(root.querySelector('nav[aria-label="Sommaire"]')).toBeNull();
    expect(root.querySelector('article')?.textContent).toBe('Seulement une introduction.');
  });

  it('renders nothing for an unknown project', async (): Promise<void> => {
    const fixture: ComponentFixture<ProjectPageComponent> = await renderPage('unknown');
    expect(fixture.nativeElement.querySelector('article')).toBeNull();
  });

  describe('scrollspy', (): void => {
    let tops: Record<string, number> = {};

    beforeEach((): void => {
      tops = {};
      vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(5000);
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
        this: HTMLElement,
      ): DOMRect {
        return new DOMRect(0, tops[this.id] ?? 600, 100, 100);
      });
    });

    afterEach((): void => {
      vi.restoreAllMocks();
    });

    async function scroll(fixture: ComponentFixture<ProjectPageComponent>): Promise<void> {
      window.dispatchEvent(new Event('scroll'));
      await new Promise<void>((resolve): void => {
        window.requestAnimationFrame((): void => resolve());
      });
      await fixture.whenStable();
    }

    it('keeps the last heading above the reading line current until the next one arrives', async (): Promise<void> => {
      const fixture: ComponentFixture<ProjectPageComponent> = await renderPage('crm');
      tops = { contexte: -400, 'ce-que-j-ai-fait': -130, resultat: 10 };
      await scroll(fixture);
      expect(current(fixture.nativeElement)).toBe('/#ce-que-j-ai-fait');
      tops['resultat'] = 0.5;
      await scroll(fixture);
      expect(current(fixture.nativeElement)).toBe('/#resultat');
      tops['resultat'] = 10;
      await scroll(fixture);
      expect(current(fixture.nativeElement)).toBe('/#ce-que-j-ai-fait');
    });

    it('tracks only the sections of the next article after navigation', async (): Promise<void> => {
      const fixture: ComponentFixture<ProjectPageComponent> = await renderPage('crm');
      tops = { resultat: -60 };
      await scroll(fixture);
      expect(current(fixture.nativeElement)).toBe('/#resultat');
      fixture.componentRef.setInput('slug', 'library-trails');
      await fixture.whenStable();
      const root: HTMLElement = fixture.nativeElement;
      expect(current(root)).toBe('/#genese');
      tops['architecture'] = -60;
      await scroll(fixture);
      expect(current(root)).toBe('/#architecture');
    });

    it('keeps the first section current while the page does not scroll', async (): Promise<void> => {
      vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(window.innerHeight);
      const fixture: ComponentFixture<ProjectPageComponent> = await renderPage('crm');
      tops = { resultat: -60 };
      await scroll(fixture);
      expect(current(fixture.nativeElement)).toBe('/#contexte');
    });
  });
});

describe('CONTENT_ROUTES', (): void => {
  it('loads the case study page on demand', async (): Promise<void> => {
    const route: Route | undefined = CONTENT_ROUTES.find(
      (r): boolean => r.path === 'projects/:slug',
    );
    await expect(route?.loadComponent?.()).resolves.toBe(ProjectPageComponent);
  });
});

/** Node of an article document in the raw snapshot, as the contract defines it. */
interface ArticleNodeFixture {
  type: string;
  attrs?: Record<string, unknown>;
  text?: string;
  content?: readonly ArticleNodeFixture[];
}

/** Raw localized project fields supplied to the snapshot provider in this feature test. */
interface ProjectSnapshotFixture {
  slug: string;
  title: string;
  summary: string;
  lead: string;
  periodLabel: string;
  client: string;
  role: string;
  place: string;
  siteUrl: string | null;
  techs: string[];
  featured: boolean;
  article: { type: 'doc'; content: readonly ArticleNodeFixture[] };
  cover: typeof COVER | null;
  seo: { title: string | null; description: string | null; keywords: string[] };
}
