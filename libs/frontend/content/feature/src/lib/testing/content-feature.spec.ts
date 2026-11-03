import { LOCALE_ID } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, type Route } from '@angular/router';
import { provideContentSnapshots } from '@vfortin/content-web-data-access';
import { CONTENT_ROUTES } from '@internal/content-web-feature/lib/content.routes';
import { ProjectPageComponent } from '@internal/content-web-feature/lib/ui/pages/project-page/project-page.component';
import { ContentSectionsComponent } from '@internal/content-web-feature/lib/ui/sections/content-sections/content-sections.component';

/**
 * Constant article
 *
 * @description
 * Minimal case study sections reused by the project fixtures in this feature test suite.
 *
 * @type {{ context: string[]; work: string[]; workList: string[]; choices: string[]; result: string[]; lessons: string[]; captions: string[] }}
 */
const article: {
  context: string[];
  work: string[];
  workList: string[];
  choices: string[];
  result: string[];
  lessons: string[];
  captions: string[];
} = {
  context: ['Contexte.'],
  work: ['Travail.'],
  workList: ['Point.'],
  choices: ['Choix.'],
  result: ['Résultat.'],
  lessons: ['Leçon.'],
  captions: ['Capture.'],
};

/**
 * Function project
 *
 * @description
 * Creates a localized project fixture with stable case-study copy and a configurable slug and featured flag.
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
  article,
});

/**
 * Constant snapshot
 *
 * @description
 * French content fixture with one featured project, one regular project, and profile facts for home and article rendering assertions.
 *
 * @type {import('@vfortin/content-contracts').ContentSnapshot}
 */
const snapshot = {
  locale: 'fr',
  revision: 1,
  profile: {
    heroIntro: 'Intro.',
    aboutStatement: 'Phrase.',
    aboutLead: 'Après un BTS.',
    facts: [{ label: 'Basé à', value: 'Blois' }],
  },
  projects: [project('movah', true), project('crm', false)],
  timeline: [],
  skills: [
    {
      id: 'front',
      domain: 'Front-end',
      techs: [{ key: 'angular', language: null }],
      usage: 'Interfaces.',
    },
  ],
} as const;

beforeEach((): void => {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: LOCALE_ID, useValue: 'fr' },
      provideContentSnapshots({ fr: snapshot, en: { ...snapshot, locale: 'en' } }),
    ],
  });
});

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
    ).toEqual(['MOVAH', 'CRM']);
    expect(
      [...root.querySelectorAll(':scope > * > section')].map((s: Element): string => s.id),
    ).toEqual(['projects', 'journey', 'skills', 'about']);
    expect(root.querySelector('dl dt')?.textContent?.trim()).toBe('Basé à');
  });
});

describe('ProjectPageComponent', (): void => {
  it('renders the case study, its neighbours and the document title', async (): Promise<void> => {
    const fixture: ComponentFixture<ProjectPageComponent> =
      TestBed.createComponent(ProjectPageComponent);
    fixture.componentRef.setInput('slug', 'crm');
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('h1')?.textContent?.trim()).toBe('CRM');
    expect(root.querySelector('#result')?.parentElement?.textContent).toContain('Résultat.');
    expect(root.querySelector('nav a[href="/projects/movah"]')).not.toBeNull();
    expect(TestBed.inject<Title>(Title).getTitle()).toBe('CRM — Valentin Fortin');
  });

  it('lists the sections in a table of contents, the first one current', async (): Promise<void> => {
    const fixture: ComponentFixture<ProjectPageComponent> =
      TestBed.createComponent(ProjectPageComponent);
    fixture.componentRef.setInput('slug', 'crm');
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const links: HTMLAnchorElement[] = [
      ...root.querySelectorAll<HTMLAnchorElement>('nav[aria-label="Sommaire"] a'),
    ];
    expect(
      links.map((link: HTMLAnchorElement): string | null => link.getAttribute('href')),
    ).toEqual(['/#context', '/#work', '/#choices', '/#result', '/#lessons']);
    expect(
      links.map((link: HTMLAnchorElement): string | null => link.getAttribute('aria-current')),
    ).toEqual(['true', null, null, null, null]);
    expect(root.querySelector('#context-title')?.textContent?.trim()).toBe('Contexte');
  });

  it('renders nothing for an unknown project', async (): Promise<void> => {
    const fixture: ComponentFixture<ProjectPageComponent> =
      TestBed.createComponent(ProjectPageComponent);
    fixture.componentRef.setInput('slug', 'unknown');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('article')).toBeNull();
  });

  it('makes the section crossing the reading band current once the page scrolls', async (): Promise<void> => {
    let notify: IntersectionObserverCallback = (): undefined => undefined;
    const observed: Element[] = [];
    let spyStopped: boolean = false;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        private spy: boolean = false;
        public constructor(private readonly callback: IntersectionObserverCallback) {}
        public observe(element: Element): void {
          if (!element.hasAttribute('data-spy')) return;
          this.spy = true;
          notify = this.callback;
          observed.push(element);
        }
        public disconnect(): void {
          if (this.spy) spyStopped = true;
        }
      },
    );
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(5000);
    try {
      const fixture: ComponentFixture<ProjectPageComponent> =
        TestBed.createComponent(ProjectPageComponent);
      fixture.componentRef.setInput('slug', 'crm');
      await fixture.whenStable();
      expect(new Set(observed.map((section: Element): string => section.id))).toEqual(
        new Set(['context', 'work', 'choices', 'result', 'lessons']),
      );
      const choices: Element = observed.find(
        (section: Element): boolean => section.id === 'choices',
      ) as Element;
      notify(
        [{ isIntersecting: true, target: choices } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
      await fixture.whenStable();
      const root: HTMLElement = fixture.nativeElement;
      const current: Element | null = root.querySelector(
        'nav[aria-label="Sommaire"] a[aria-current="true"]',
      );
      expect(current?.getAttribute('href')).toBe('/#choices');
      fixture.destroy();
      expect(spyStopped).toBe(true);
    } finally {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    }
  });

  /**
   * Function currentAfter
   *
   * @description
   * Renders the `crm` article with a stubbed scrollspy, delivers entries derived from watched sections, and reads the current table-of-contents link.
   *
   * @param {number} scrollHeight - Document height controlling whether the page is considered scrollable.
   * @param {(section: (id: string) => Element) => { isIntersecting: boolean; target: Element }[]} entries - Observer entries built from a section lookup.
   *
   * @returns {Promise<string | null | undefined>} Current section link; on a document too short to scroll, the first section remains current.
   */
  async function currentAfter(
    scrollHeight: number,
    entries: (section: (id: string) => Element) => { isIntersecting: boolean; target: Element }[],
  ): Promise<string | null | undefined> {
    let notify: IntersectionObserverCallback = (): undefined => undefined;
    const observed: Element[] = [];
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        public constructor(private readonly callback: IntersectionObserverCallback) {}
        public observe(element: Element): void {
          if (!element.hasAttribute('data-spy')) return;
          notify = this.callback;
          observed.push(element);
        }
        public disconnect(): void {
          // Nothing to release.
        }
      },
    );
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(scrollHeight);
    try {
      const fixture: ComponentFixture<ProjectPageComponent> =
        TestBed.createComponent(ProjectPageComponent);
      fixture.componentRef.setInput('slug', 'crm');
      await fixture.whenStable();
      const section: (id: string) => Element = (id: string): Element =>
        observed.find((element: Element): boolean => element.id === id) as Element;
      notify(
        entries(section) as unknown as IntersectionObserverEntry[],
        {} as IntersectionObserver,
      );
      await fixture.whenStable();
      const root: HTMLElement = fixture.nativeElement;
      return root
        .querySelector('nav[aria-label="Sommaire"] a[aria-current="true"]')
        ?.getAttribute('href');
    } finally {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    }
  }

  it('keeps the first section current while the page does not scroll', async (): Promise<void> => {
    await expect(
      currentAfter(
        window.innerHeight,
        (section: (id: string) => Element): { isIntersecting: true; target: Element }[] => [
          { isIntersecting: true, target: section('choices') },
        ],
      ),
    ).resolves.toBe('/#context');
  });

  it('ignores the sections leaving the reading band', async (): Promise<void> => {
    await expect(
      currentAfter(
        5000,
        (
          section: (id: string) => Element,
        ): (
          { isIntersecting: false; target: Element } | { isIntersecting: true; target: Element }
        )[] => [
          { isIntersecting: false, target: section('result') },
          { isIntersecting: true, target: section('work') },
        ],
      ),
    ).resolves.toBe('/#work');
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
  article: typeof article;
}
