import { RenderMode } from '@angular/ssr';
import { LOCALE_ID, RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { RouterTestingHarness } from '@angular/router/testing';
import { Title } from '@angular/platform-browser';
import { provideContentSnapshots } from '@vfortin/content-web-data-access';
import { APP_ROUTES } from '@internal/web-shell/lib/app.routes';
import { SERVER_ROUTES } from '@internal/web-shell/lib/app.routes.server';

/**
 * Function project
 *
 * @description
 * Builds a minimal content project fixture accepted by the public snapshot provider.
 *
 * @param {string} slug - Project identifier used as its title.
 * @param {boolean} featured - Whether the home page fixture should feature the project.
 *
 * @returns Project fixture with the minimal article document and no cover, as the content snapshot contract requires.
 */
const project: (
  slug: string,
  featured: boolean,
) => {
  slug: string;
  title: string;
  summary: string;
  lead: string;
  periodLabel: string;
  client: string;
  role: string;
  place: string;
  siteUrl: null;
  techs: never[];
  featured: boolean;
  article: { type: 'doc'; content: { type: 'paragraph' }[] };
  cover: null;
  seo: { title: null; description: null };
} = (
  slug: string,
  featured: boolean,
): {
  slug: string;
  title: string;
  summary: string;
  lead: string;
  periodLabel: string;
  client: string;
  role: string;
  place: string;
  siteUrl: null;
  techs: never[];
  featured: boolean;
  article: { type: 'doc'; content: { type: 'paragraph' }[] };
  cover: null;
  seo: { title: null; description: null };
} => ({
  slug,
  title: slug,
  summary: 'Résumé.',
  lead: 'Intro.',
  periodLabel: '2026',
  client: 'c',
  role: 'r',
  place: 'p',
  siteUrl: null,
  techs: [],
  featured,
  article: { type: 'doc', content: [{ type: 'paragraph' }] },
  cover: null,
  seo: { title: null, description: null },
});

/**
 * Constant snapshot
 *
 * @description
 * Minimal French content snapshot with one featured and one unfeatured project for shell routing tests.
 */
const snapshot: {
  locale: string;
  revision: number;
  profile: { heroIntro: string; aboutStatement: string; aboutLead: string; facts: never[] };
  projects: {
    slug: string;
    title: string;
    summary: string;
    lead: string;
    periodLabel: string;
    client: string;
    role: string;
    place: string;
    siteUrl: null;
    techs: never[];
    featured: boolean;
    article: { type: 'doc'; content: { type: 'paragraph' }[] };
    cover: null;
    seo: { title: null; description: null };
  }[];
  timeline: never[];
  skills: never[];
  legal: Record<
    'notice' | 'privacy',
    { updatedOn: string; document: { type: 'doc'; content: { type: 'paragraph' }[] } }
  >;
} = {
  locale: 'fr',
  revision: 1,
  profile: { heroIntro: 'Intro.', aboutStatement: 'Phrase.', aboutLead: 'Lead.', facts: [] },
  projects: [project('library-trails', true), project('neighborhood-atlas', false)],
  timeline: [],
  skills: [],
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
};

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(APP_ROUTES, withComponentInputBinding()),
      provideHttpClient(),
      { provide: LOCALE_ID, useValue: 'fr' },
      provideContentSnapshots({ fr: snapshot, en: { ...snapshot, locale: 'en' } }),
    ],
  });
});

describe('shell', () => {
  it('composes the home page inside the layout, with anchor navigation', async () => {
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/');
    const root: HTMLElement = harness.routeNativeElement?.ownerDocument.body ?? document.body;
    const nav: (string | null)[] = [...root.querySelectorAll('header nav a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(nav).toEqual(['/#projects', '/#journey', '/#skills', '/#about', '/#contact']);
    expect(root.querySelector('main #projects')).not.toBeNull();

    // Deferred contact section (@defer): its anchor exists before the code loads.
    expect(root.querySelector('main #contact')).not.toBeNull();
    expect(root.querySelector('h1 .sr-only')?.textContent).toBe('Valentin Fortin');
  });

  it('ends the pages with the footer columns, language and theme menus', async () => {
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/');
    const footer: HTMLElement | null | undefined =
      harness.routeNativeElement?.ownerDocument.querySelector('footer');
    const menus: Element[] = [...(footer?.querySelectorAll('ui-menu-select button') ?? [])];
    expect(menus.map((menu) => menu.textContent?.trim())).toEqual(['Français', 'Sombre']);
    expect(footer?.querySelector('a[href="/legal-notice"]')).not.toBeNull();
    expect(footer?.querySelector('a[href="/privacy"]')?.textContent).toBe(
      'Politique de confidentialité',
    );
    expect(footer?.querySelector('a[href="/#top"]')?.textContent).toBe('Haut de page');
  });

  it('keeps only the © band of the footer on error pages', async () => {
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/error/503');
    const doc: Document | undefined = harness.routeNativeElement?.ownerDocument;
    expect(doc?.querySelector('h1')?.textContent).toContain('Site en maintenance');
    expect(doc?.querySelector('footer ui-menu-select')).toBeNull();
    expect(doc?.querySelector('footer a[href="/privacy"]')?.textContent).toBe('Confidentialité');
  });

  it('opens a project case study', async () => {
    const harness: RouterTestingHarness = await RouterTestingHarness.create(
      '/projects/neighborhood-atlas',
    );
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.trim()).toBe(
      'neighborhood-atlas',
    );
  });

  it('redirects an unknown project to the not-found experience before activating an empty article', async () => {
    const harness: RouterTestingHarness = await RouterTestingHarness.create(
      '/projects/neighborhood-atlas',
    );
    await harness.navigateByUrl('/projects/unknown');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Page introuvable',
    );
    expect(TestBed.inject<Title>(Title).getTitle()).toContain('Page introuvable');
    expect(harness.routeNativeElement?.querySelector('article')).toBeNull();
  });

  it('renders public URLs per request and keeps the administration client rendered', () => {
    expect(SERVER_ROUTES).toEqual([
      {
        path: 'admin',
        renderMode: RenderMode.Client,
        headers: { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' },
      },
      {
        path: 'admin/**',
        renderMode: RenderMode.Client,
        headers: { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' },
      },
      { path: '**', renderMode: RenderMode.Server, headers: { 'Cache-Control': 'no-store' } },
    ]);
  });

  it('shows the not-found page for an unknown error code', async () => {
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/error/418');
    const doc: Document | undefined = harness.routeNativeElement?.ownerDocument;
    expect(doc?.querySelector('h1')?.textContent).toContain('Page introuvable');
  });

  it('sets real server error statuses for missing URLs and unavailable pages', async () => {
    const response: ResponseInit = {};
    TestBed.overrideProvider(RESPONSE_INIT, { useValue: response });
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/unknown');
    expect(response.status).toBe(404);
    expect(new Headers(response.headers).get('X-Robots-Tag')).toBe('noindex');
    await harness.navigateByUrl('/error/503');
    expect(response.status).toBe(503);
  });

  it('updates the title when an error route is reused with another code', async () => {
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/error/404');
    await harness.navigateByUrl('/error/503');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Site en maintenance',
    );
    expect(TestBed.inject<Title>(Title).getTitle()).toContain('Site en maintenance');
  });
});
