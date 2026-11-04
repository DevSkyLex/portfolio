import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { SeoDashboard } from '@vfortin/content-web-data-access/admin';
import { ToastService } from '@vfortin/ui';
import { ADMIN_DASHBOARD_ROUTES } from '@internal/content-web-feature-admin/lib/admin-dashboard.routes';

/**
 * Constant URL
 *
 * @description
 * Dashboard endpoint of the API.
 *
 * @type {string}
 */
const URL: string = '/api/content/admin/seo/dashboard';

/**
 * Constant AUDIT
 *
 * @description
 * Audit of one published project with an error and a warning.
 */
const AUDIT: SeoDashboard['audit'] = {
  generatedAt: '2026-11-04T10:00:00.000Z',
  projects: [
    {
      id: 'p1',
      slug: 'movah',
      title: 'Movah',
      pages: {
        fr: {
          path: '/projects/movah',
          title: 'Movah — Valentin Fortin',
          description: 'Résumé',
          keywords: ['angular'],
          keywordsSource: 'techs',
        },
        en: {
          path: '/en/projects/movah',
          title: 'Movah — Valentin Fortin',
          description: 'Summary',
          keywords: ['angular'],
          keywordsSource: 'techs',
        },
      },
      issues: [
        {
          code: 'search-title-too-short',
          severity: 'warning',
          locale: 'fr',
          length: 23,
          limit: 30,
        },
        { code: 'cover-alt-missing', severity: 'error', locale: 'en' },
      ],
    },
  ],
  sitemap: { pages: 5, urls: 10 },
  totals: { published: 1, drafts: 2, issues: { error: 1, warning: 1, info: 0 } },
};

/**
 * Function unconfigured
 *
 * @description
 * Dashboard of a window without any Google setting, as the local stack answers it.
 *
 * @param {SeoDashboard['range']} range - Window.
 *
 * @returns {SeoDashboard} Dashboard.
 */
const unconfigured = (range: SeoDashboard['range'] = '28d'): SeoDashboard => ({
  range,
  refresh: { running: false, startedAt: null, finishedAt: null, nextAllowedAt: null },
  searchConsole: {
    status: 'not-configured',
    fetchedAt: null,
    missing: ['SEO_GOOGLE_CREDENTIALS_PATH', 'SEO_SEARCH_CONSOLE_PROPERTY'],
  },
  analytics: { status: 'not-configured', fetchedAt: null, missing: ['SEO_GA4_PROPERTY_ID'] },
  webVitals: { status: 'pending', fetchedAt: null },
  audit: AUDIT,
});

/**
 * Function reported
 *
 * @description
 * Dashboard with a Search Console report, a GA4 failure kept beside its last report and the Web
 * Vitals of one URL.
 *
 * @returns {SeoDashboard} Dashboard.
 */
const reported = (): SeoDashboard => ({
  ...unconfigured(),
  searchConsole: {
    status: 'ok',
    fetchedAt: '2026-11-04T05:30:00.000Z',
    data: {
      window: {
        range: '28d',
        current: { start: '2026-10-05', end: '2026-11-01' },
        previous: { start: '2026-09-07', end: '2026-10-04' },
      },
      totals: { clicks: 120, impressions: 4000, ctr: 0.03, position: 8.4 },
      previous: { clicks: 100, impressions: 5000, ctr: 0.02, position: 9.6 },
      daily: [
        { date: '2026-10-31', clicks: 4, impressions: 150, ctr: 0.026, position: 8 },
        { date: '2026-11-01', clicks: 6, impressions: 160, ctr: 0.037, position: 7.5 },
      ],
      queries: [
        { key: 'valentin fortin', clicks: 80, impressions: 300, ctr: 0.27, position: 1.2 },
        { key: 'portfolio angular', clicks: 2, impressions: 900, ctr: 0.002, position: 0 },
      ],
      pages: [
        {
          key: 'https://valentin-fortin.pro/projects/movah',
          clicks: 40,
          impressions: 1000,
          ctr: 0.04,
          position: 6,
        },
      ],
      devices: [
        { key: 'MOBILE', clicks: 30, impressions: 1000, ctr: 0.03, position: 9 },
        { key: 'DESKTOP', clicks: 90, impressions: 3000, ctr: 0.03, position: 8 },
      ],
    },
  },
  analytics: {
    status: 'error',
    fetchedAt: '2026-11-03T05:30:00.000Z',
    attemptedAt: '2026-11-04T05:30:00.000Z',
    error: { code: 'permission-denied', message: 'The service account cannot read the property.' },
    data: {
      window: {
        range: '28d',
        current: { start: '2026-10-07', end: '2026-11-03' },
        previous: { start: '2026-09-09', end: '2026-10-06' },
      },
      totals: {
        activeUsers: 50,
        sessions: 80,
        views: 200,
        engagementRate: 0.6,
        averageEngagementSeconds: 83,
      },
      previous: {
        activeUsers: 40,
        sessions: 80,
        views: 150,
        engagementRate: 0.5,
        averageEngagementSeconds: 60,
      },
      daily: [{ date: '2026-11-03', activeUsers: 3, sessions: 4, views: 9 }],
      pages: [{ path: '/', views: 120, activeUsers: 40 }],
      channels: [
        { key: 'Direct', sessions: 20, activeUsers: 15 },
        { key: 'Organic Search', sessions: 60, activeUsers: 35 },
      ],
      countries: [{ key: 'France', sessions: 70, activeUsers: 45 }],
    },
  },
  webVitals: {
    status: 'ok',
    fetchedAt: '2026-11-04T05:30:00.000Z',
    data: {
      rows: [
        {
          url: 'https://valentin-fortin.pro/',
          strategy: 'mobile',
          measure: {
            field: {
              scope: 'origin',
              lcp: { p75: 2430, category: 'good' },
              inp: { p75: 260, category: 'needs-improvement' },
              cls: null,
            },
            lab: { performanceScore: 42, lcpMs: 3100, cls: 0.01, tbtMs: 300 },
          },
          error: null,
        },
      ],
    },
  },
});

/**
 * Function flush
 *
 * @description
 * Yields one timer turn.
 *
 * @returns {Promise<unknown>} Completion after the next timer callback.
 */
const flush: () => Promise<unknown> = (): Promise<unknown> =>
  new Promise((resolve: (value: unknown) => void): ReturnType<typeof setTimeout> =>
    setTimeout(resolve),
  );

/**
 * Interface Opened
 *
 * @description
 * Harness of the opened dashboard.
 */
interface Opened {
  readonly backend: HttpTestingController;
  readonly harness: RouterTestingHarness;
  readonly root: () => HTMLElement;
  readonly settle: () => Promise<void>;
}

/**
 * Function open
 *
 * @description
 * Mounts the route as the shell does (`/admin/dashboard`) and opens a URL in the French build.
 *
 * @param {string} url - URL to open.
 *
 * @returns {Promise<Opened>} Harness.
 */
async function open(url: string = '/admin/dashboard'): Promise<Opened> {
  TestBed.configureTestingModule({
    providers: [
      { provide: LOCALE_ID, useValue: 'fr' },
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([
        { path: 'admin/dashboard', children: ADMIN_DASHBOARD_ROUTES },
        { path: 'admin/projects/:id', children: [] },
      ]),
    ],
  });
  const backend: HttpTestingController =
    TestBed.inject<HttpTestingController>(HttpTestingController);
  const harness: RouterTestingHarness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  await flush();
  const settle = async (): Promise<void> => {
    await flush();
    await harness.fixture.whenStable();
  };
  return {
    backend,
    harness,
    root: (): HTMLElement => harness.routeNativeElement as HTMLElement,
    settle,
  };
}

/**
 * Function text
 *
 * @description
 * Text of an element with its whitespace collapsed and no-break spaces made plain.
 *
 * @param {Element | null | undefined} element - Element.
 *
 * @returns {string} Text.
 */
const text = (element: Element | null | undefined): string =>
  (element?.textContent ?? '').replace(/[\s\u2009\u202f\u00a0]+/g, ' ').trim();

/**
 * Function section
 *
 * @description
 * Section of the page labelled by its heading.
 *
 * @param {HTMLElement} root - Page.
 * @param {string} id - Heading id.
 *
 * @returns {HTMLElement | null} Section.
 */
const section = (root: HTMLElement, id: string): HTMLElement | null =>
  root.querySelector<HTMLElement>(`section[aria-labelledby="${id}"]`);

describe('ADMIN_DASHBOARD_ROUTES', (): void => {
  afterEach((): void => {
    TestBed.inject<HttpTestingController>(HttpTestingController).verify();
  });

  it('names the sections to configure, the first collection to come and the audit findings', async (): Promise<void> => {
    const { backend, root, settle } = await open();
    expect(root().querySelector('[role="status"]')?.textContent).toContain(
      'Chargement du tableau de bord',
    );
    backend.expectOne(`${URL}?range=28d`).flush(unconfigured());
    await settle();
    expect(text(root().querySelector('h1'))).toBe('Tableau de bord');
    expect(text(root().querySelector('[data-slot="page-header-meta"]'))).toBe(
      'Aucune collecte Google pour l’instant',
    );
    const search: HTMLElement | null = section(root(), 'dashboard-search-console');
    expect(text(search?.querySelector('[data-slot="empty-title"]'))).toBe(
      'Search Console n’est pas configuré',
    );
    expect(text(search?.querySelector('[data-slot="empty-description"]'))).toContain(
      'docs/operations/deployment.md, section « SEO dashboard and audience measurement »',
    );
    expect([...(search?.querySelectorAll('code') ?? [])].map(text)).toEqual([
      'SEO_GOOGLE_CREDENTIALS_PATH',
      'SEO_SEARCH_CONSOLE_PROPERTY',
    ]);
    expect(
      text(section(root(), 'dashboard-web-vitals')?.querySelector('[data-slot="empty-title"]')),
    ).toBe('Aucune collecte pour l’instant');

    const audit: HTMLElement | null = section(root(), 'dashboard-audit');
    expect(text(audit?.querySelector('h2'))).toBe('Audit SEO');
    expect(text(audit)).toContain('Erreurs1Avertissements1Infos0');
    expect(text(audit)).toContain('Projets publiés1Brouillons2URL du sitemap10');
    const rows: HTMLTableRowElement[] = [
      ...(audit?.querySelectorAll<HTMLTableRowElement>('tbody tr') ?? []),
    ];
    // The most serious first.
    expect(rows.map((row: HTMLTableRowElement) => [...row.cells].map(text))).toEqual([
      ['Erreur', 'Movah', 'EN', 'Couverture sans texte alternatif.'],
      [
        'Avertissement',
        'Movah',
        'FR',
        'Titre de recherche trop court : 23 caractères, 30 au minimum.',
      ],
    ]);
    expect(rows[0]?.querySelector('a')?.getAttribute('href')).toBe('/admin/projects/p1');
    expect(rows[0]?.querySelector('[data-slot="badge"]')?.className).toContain(
      'before:bg-danger-ink',
    );
  });

  it('shows the reports, a failed collection above its last report, and the vitals with words', async (): Promise<void> => {
    const { backend, root, settle } = await open();
    backend.expectOne(`${URL}?range=28d`).flush(reported());
    await settle();
    expect(text(root().querySelector('[data-slot="page-header-meta"]'))).toMatch(
      /^Dernière collecte Google le 4 nov\. 2026/,
    );

    const search: HTMLElement | null = section(root(), 'dashboard-search-console');
    const tiles: string[] = [...(search?.querySelectorAll('content-seo-kpi-tile') ?? [])].map(text);
    expect(tiles[0]).toBe('Clics120 +20 % vs 7 sept. – 4 oct. 2026(favorable)');
    expect(tiles[1]).toBe('Impressions4 000 -20 % vs 7 sept. – 4 oct. 2026(défavorable)');
    // A lower average position is better.
    expect(tiles[3]).toBe('Position moyenne8,4 -1,2 vs 7 sept. – 4 oct. 2026(favorable)');
    expect(text(search)).toContain('5 oct. – 1 nov. 2026');
    const charts: HTMLElement[] = [
      ...(search?.querySelectorAll<HTMLElement>('ui-area-chart') ?? []),
    ];
    expect(
      charts.map((chart: HTMLElement) =>
        chart.querySelector('[role="group"]')?.getAttribute('aria-label'),
      ),
    ).toEqual(['Clics par jour', 'Impressions par jour']);
    expect(
      [...(charts[0]?.querySelectorAll('table tbody tr') ?? [])].map((row: Element) =>
        [...row.children].map(text),
      ),
    ).toEqual([
      ['31 oct.', '4'],
      ['1 nov.', '6'],
    ]);
    const tables: HTMLTableElement[] = [
      ...(search?.querySelectorAll('ui-data-table table') ?? []),
    ] as HTMLTableElement[];
    expect([...(tables[0]?.tBodies[0]?.rows ?? [])].map((row) => [...row.cells].map(text))).toEqual(
      [
        ['valentin fortin', '80', '300', '27 %', '1,2'],
        ['portfolio angular', '2', '900', '0,2 %', '—'],
      ],
    );
    expect(text(tables[1]?.tBodies[0]?.rows[0]?.cells[0])).toBe('/projects/movah');
    const devices: string[] = [...(search?.querySelectorAll('ui-bar-list li') ?? [])].map(text);
    expect(devices).toEqual(['Ordinateur90 · 75 %', 'Mobile30 · 25 %']);

    const audience: HTMLElement | null = section(root(), 'dashboard-analytics');
    const alert: Element | null | undefined = audience?.querySelector('[data-slot="alert"]');
    expect(alert?.getAttribute('data-variant')).toBe('warning');
    expect(text(alert)).toContain('Échec de la dernière collecte de Google Analytics');
    expect(text(alert)).toContain('Le compte de service n’a pas accès à la propriété.');
    expect(text(alert)).toContain(
      'permission-denied · The service account cannot read the property.',
    );
    expect(text(alert)).toContain('Tentative du 4 nov. 2026');
    expect(text(alert)).toContain('Données affichées du 3 nov. 2026');
    expect(text(audience)).toContain('Durée d’engagement moyenne1 min 23 s');
    expect(
      [...(audience?.querySelectorAll('ui-bar-list') ?? [])].map((list) =>
        list.querySelector('ul')?.getAttribute('aria-label'),
      ),
    ).toEqual(['Sessions par canal', 'Sessions par pays']);
    // Shares of the window's sessions, most first.
    expect(text(audience?.querySelector('ui-bar-list li'))).toBe('Organic Search60 · 75 %');

    const vitals: HTMLElement | null = section(root(), 'dashboard-web-vitals');
    const row: HTMLTableRowElement | null | undefined = vitals?.querySelector('tbody tr');
    expect([...(row?.cells ?? [])].map(text)).toEqual([
      '/Données terrain de l’origine',
      'Mobile',
      '2,4 sBon',
      '260 msÀ améliorer',
      '—Non renseigné',
      '42Mauvais',
    ]);
  });

  it('keeps the window in ?periode= and the previous figures dimmed while it loads', async (): Promise<void> => {
    const { backend, harness, root, settle } = await open();
    backend.expectOne(`${URL}?range=28d`).flush(reported());
    await settle();
    const seven: HTMLButtonElement | undefined = [
      ...root().querySelectorAll<HTMLButtonElement>('[aria-label="Période"] button'),
    ].find((button: HTMLButtonElement): boolean => text(button) === '7 jours');
    expect(seven?.getAttribute('aria-pressed')).toBe('false');
    seven?.click();
    await settle();
    expect(TestBed.inject<Router>(Router).url).toBe('/admin/dashboard?periode=7j');
    const request: TestRequest = backend.expectOne(`${URL}?range=7d`);
    expect(root().querySelector('ui-area-chart')?.hasAttribute('data-stale')).toBe(true);
    request.flush(unconfigured('7d'));
    await settle();
    expect(seven?.getAttribute('aria-pressed')).toBe('true');
    // Back to the default window: no parameter, one read.
    await harness.navigateByUrl('/admin/dashboard');
    await settle();
    backend.expectOne(`${URL}?range=28d`).flush(unconfigured());
    await settle();
  });

  it('opens a window from the URL', async (): Promise<void> => {
    const { backend, settle } = await open('/admin/dashboard?periode=90j');
    backend.expectOne(`${URL}?range=90d`).flush(unconfigured('90d'));
    await settle();
  });

  it('refreshes in the background, then announces the end', async (): Promise<void> => {
    const { backend, root, settle } = await open();
    backend.expectOne(`${URL}?range=28d`).flush(unconfigured());
    await settle();
    const button = (): HTMLButtonElement | undefined =>
      [...root().querySelectorAll<HTMLButtonElement>('[data-slot="page-header"] button')].find(
        (candidate: HTMLButtonElement): boolean => text(candidate).startsWith('Actualis'),
      );
    button()?.click();
    backend
      .expectOne({ method: 'POST', url: `${URL}/refresh` })
      .flush(
        { startedAt: '2026-11-04T10:00:00.000Z', nextAllowedAt: '2026-11-04T10:10:00.000Z' },
        { status: 202, statusText: 'Accepted' },
      );
    await settle();
    expect(text(button())).toBe('Actualisation…');
    expect(button()?.disabled).toBe(true);
    expect(button()?.getAttribute('aria-busy')).toBe('true');
    // The store polls every 3 s (SEO_REFRESH_POLL_MS), on real timers here.
    await new Promise((resolve: (value: unknown) => void) => setTimeout(resolve, 3100));
    backend.expectOne(`${URL}?range=28d`).flush(unconfigured());
    await settle();
    expect(text(button())).toBe('Actualiser');
    expect(
      TestBed.inject<ToastService>(ToastService)
        .toasts()
        .map((toast) => [toast.type, toast.message]),
    ).toEqual([['success', 'Tableau de bord actualisé.']]);
  }, 10_000);

  it('warns when a refresh comes too soon after the previous one', async (): Promise<void> => {
    const { backend, root, settle } = await open();
    backend.expectOne(`${URL}?range=28d`).flush(unconfigured());
    await settle();
    [...root().querySelectorAll<HTMLButtonElement>('[data-slot="page-header"] button')]
      .find((candidate: HTMLButtonElement): boolean => text(candidate) === 'Actualiser')
      ?.click();
    backend.expectOne(`${URL}/refresh`).flush(
      {
        status: 429,
        code: 'content.seo-refresh-too-soon',
        details: ['2026-11-04T10:10:00.000Z'],
      },
      { status: 429, statusText: 'Too Many Requests' },
    );
    await settle();
    const toast: ReturnType<ToastService['toasts']>[number] | undefined =
      TestBed.inject<ToastService>(ToastService).toasts()[0];
    expect(toast?.type).toBe('warning');
    expect(toast?.message).toBe('Actualisation trop rapprochée de la précédente.');
    expect(toast?.description).toMatch(/^Prochaine actualisation possible à \d{2}:\d{2}\.$/);
  });

  it('offers to retry a failed read', async (): Promise<void> => {
    const { backend, root, settle } = await open();
    backend
      .expectOne(`${URL}?range=28d`)
      .flush(null, { status: 503, statusText: 'Service Unavailable' });
    await settle();
    const alert: Element | null = root().querySelector('[data-slot="alert"]');
    expect(text(alert)).toContain('Impossible de charger le tableau de bord');
    alert?.querySelector('button')?.click();
    backend.expectOne(`${URL}?range=28d`).flush(unconfigured());
    await settle();
    expect(root().querySelector('[data-slot="alert"]')).toBeNull();
  });
});
