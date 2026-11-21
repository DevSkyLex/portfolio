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
      slug: 'library-trails',
      title: 'Library Trails',
      pages: {
        fr: {
          path: '/articles/library-trails',
          title: 'Library Trails — Valentin Fortin',
          description: 'Résumé',
          keywords: ['angular'],
          keywordsSource: 'techs',
        },
        en: {
          path: '/en/articles/library-trails',
          title: 'Library Trails — Valentin Fortin',
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
  demo: false,
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
        { key: 'morgan exemple', clicks: 80, impressions: 300, ctr: 0.27, position: 1.2 },
        { key: 'portfolio angular', clicks: 2, impressions: 900, ctr: 0.002, position: 0 },
      ],
      pages: [
        {
          key: 'https://valentin-fortin.pro/articles/library-trails',
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
        { path: 'admin/articles/:id', children: [] },
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
 * Function cells
 *
 * @description
 * Texts of a table row's cells, without the empty spacer cell hidden from assistive technologies.
 *
 * @param {HTMLTableRowElement | null | undefined} row - Row.
 *
 * @returns {string[]} Cell texts.
 */
const cells = (row: HTMLTableRowElement | null | undefined): string[] =>
  [...(row?.cells ?? [])]
    .filter((cell: HTMLTableCellElement): boolean => cell.getAttribute('aria-hidden') !== 'true')
    .map(text);

/**
 * Function panel
 *
 * @description
 * Tab panel shown, the only one not hidden.
 *
 * @param {HTMLElement} root - Page.
 *
 * @returns {HTMLElement | null} Panel.
 */
const panel = (root: HTMLElement): HTMLElement | null =>
  root.querySelector<HTMLElement>('[role="tabpanel"]:not([hidden])');

/**
 * Function trigger
 *
 * @description
 * Tab trigger whose text starts with the name.
 *
 * @param {HTMLElement} root - Page.
 * @param {string} name - Tab name.
 *
 * @returns {HTMLButtonElement | undefined} Trigger.
 */
const trigger = (root: HTMLElement, name: string): HTMLButtonElement | undefined =>
  [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
    (candidate: HTMLButtonElement): boolean => text(candidate).startsWith(name),
  );

/**
 * Function show
 *
 * @description
 * Selects a tab by its name and returns its panel once rendered.
 *
 * @param {Opened} opened - Harness.
 * @param {string} name - Tab name.
 *
 * @returns {Promise<HTMLElement | null>} Panel.
 */
async function show(opened: Opened, name: string): Promise<HTMLElement | null> {
  trigger(opened.root(), name)?.click();
  await opened.settle();
  return panel(opened.root());
}

/**
 * Function headerButton
 *
 * @description
 * Button of the page header's actions whose text satisfies a predicate.
 *
 * @param {HTMLElement} root - Page.
 * @param {(label: string) => boolean} matches - Text predicate.
 *
 * @returns {HTMLButtonElement | undefined} Button.
 */
const headerButton = (
  root: HTMLElement,
  matches: (label: string) => boolean,
): HTMLButtonElement | undefined =>
  [...root.querySelectorAll<HTMLButtonElement>('[data-slot="page-header"] button')].find(
    (candidate: HTMLButtonElement): boolean => matches(text(candidate)),
  );

/**
 * Function sheet
 *
 * @description
 * « Détails » sheet in the overlay container, `null` while closed.
 *
 * @returns {HTMLElement | null} Sheet content.
 */
const sheet = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('.cdk-overlay-container [data-slot="sheet-content"]');

/**
 * Function openDetails
 *
 * @description
 * Clicks « Détails » in the header and returns the trigger once the sheet is rendered.
 *
 * @param {Opened} opened - Harness.
 *
 * @returns {Promise<HTMLButtonElement | undefined>} Trigger.
 */
async function openDetails(opened: Opened): Promise<HTMLButtonElement | undefined> {
  const details: HTMLButtonElement | undefined = headerButton(
    opened.root(),
    (label: string): boolean => label === 'Détails',
  );
  details?.click();
  await opened.settle();
  return details;
}

describe('ADMIN_DASHBOARD_ROUTES', (): void => {
  afterEach((): void => {
    TestBed.inject<HttpTestingController>(HttpTestingController).verify();
    localStorage.clear();
  });

  it('keeps every report tab linked to its panel while the initial request loads, fails and retries', async (): Promise<void> => {
    const opened: Opened = await open();
    const { backend, root, settle } = opened;
    const request: TestRequest = backend.expectOne(`${URL}?range=28d`);
    const linkedPanels = (): HTMLElement[] => {
      const tabs: HTMLButtonElement[] = [
        ...root().querySelectorAll<HTMLButtonElement>('[role="tab"]'),
      ];
      const panels: HTMLElement[] = [...root().querySelectorAll<HTMLElement>('[role="tabpanel"]')];
      expect(tabs).toHaveLength(4);
      expect(panels).toHaveLength(4);
      for (const tab of tabs) {
        const controlled: HTMLElement | undefined = panels.find(
          (entry: HTMLElement): boolean => entry.id === tab.getAttribute('aria-controls'),
        );
        expect(controlled).toBeDefined();
        expect(controlled?.getAttribute('aria-labelledby')).toBe(tab.id);
        expect(controlled?.hidden).toBe(tab.getAttribute('aria-selected') !== 'true');
      }
      return panels;
    };

    const panels: HTMLElement[] = linkedPanels();
    expect(text(panel(root())?.querySelector('[role="status"]'))).toContain(
      'Chargement du tableau de bord',
    );
    await show(opened, 'Audience');
    expect(linkedPanels()).toEqual(panels);
    expect(text(panel(root())?.querySelector('[role="status"]'))).toContain(
      'Chargement du tableau de bord',
    );

    request.flush(null, { status: 503, statusText: 'Service Unavailable' });
    await settle();
    expect(linkedPanels()).toEqual(panels);
    expect(text(root())).toContain('Impossible de charger le tableau de bord');
    expect(root().querySelector('[role="status"]')).toBeNull();

    const retry: HTMLButtonElement | undefined = [
      ...root().querySelectorAll<HTMLButtonElement>('button'),
    ].find((button: HTMLButtonElement): boolean => text(button) === 'Réessayer');
    expect(retry).toBeDefined();
    retry?.click();
    await settle();
    expect(linkedPanels()).toEqual(panels);
    backend.expectOne(`${URL}?range=28d`).flush(unconfigured());
    await settle();
    expect(linkedPanels()).toEqual(panels);
    expect(text(panel(root())?.querySelector('[data-slot="empty-title"]'))).toBe(
      'Google Analytics n’est pas configuré',
    );
  });

  it('names the sources to configure, the first collection to come and the audit findings, one tab each', async (): Promise<void> => {
    const opened: Opened = await open();
    const { backend, root, settle } = opened;
    expect(root().querySelector('[role="status"]')?.textContent).toContain(
      'Chargement du tableau de bord',
    );
    backend.expectOne(`${URL}?range=28d`).flush(unconfigured());
    await settle();
    expect(text(root().querySelector('h1'))).toBe('Tableau de bord');
    expect(text(root().querySelector('[data-slot="page-header-meta"]'))).toBe(
      'Aucune collecte Google pour l’instant',
    );
    // The tabs sit in the page header, the first one open.
    const list: Element | null = root().querySelector('ui-page-header [role="tablist"]');
    expect(list?.getAttribute('aria-label')).toBe('Rapports');
    expect([...(list?.querySelectorAll('[role="tab"]') ?? [])].map(text)).toEqual([
      'Search Console',
      'Audience',
      'Core Web Vitals',
      'Audit SEO',
    ]);
    expect(trigger(root(), 'Search Console')?.getAttribute('aria-selected')).toBe('true');
    expect(root().querySelectorAll('[role="tabpanel"]')).toHaveLength(4);
    // Without a report the « Détails » sheet has no figure yet, and says why for every source.
    await openDetails(opened);
    expect(text(sheet()?.querySelector('section[aria-labelledby="dashboard-figures"] p'))).toBe(
      'Les chiffres de cette source apparaîtront après sa première collecte.',
    );
    expect([...(sheet()?.querySelectorAll('content-seo-source-list li') ?? [])].map(text)).toEqual([
      'Search ConsoleNon configuré',
      'Google AnalyticsNon configuré',
      'PageSpeed InsightsEn attente de la première collecte',
      expect.stringMatching(/^Audit SEOCalculé le 4 nov\. 2026/),
    ]);

    const search: HTMLElement | null = panel(root());
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
      text((await show(opened, 'Core Web Vitals'))?.querySelector('[data-slot="empty-title"]')),
    ).toBe('Aucune collecte pour l’instant');
    // A tab is kept in the address, the history entry replaced.
    expect(TestBed.inject<Router>(Router).url).toBe('/admin/dashboard?onglet=vitals');

    const audit: HTMLElement | null = await show(opened, 'Audit SEO');
    expect([...(audit?.querySelectorAll('content-seo-section-header h2') ?? [])].map(text)).toEqual(
      ['Synthèse de l’audit', 'Problèmes relevés'],
    );
    // The audit's totals are the sheet's key figures, without a period compared.
    const totals: string = text(sheet()?.querySelector('content-seo-figure-list'));
    expect(totals).toBe(
      'Erreurs1Avertissements1Infos0Articles publiés1Brouillons2URL du sitemap10',
    );
    // Findings by project, split by severity, and by kind.
    const projects: Element | null | undefined = audit?.querySelector('ui-stacked-bars');
    expect(
      [...(projects?.querySelectorAll('[data-slot="chart-legend"] li') ?? [])].map(text),
    ).toEqual(['Erreur', 'Avertissement', 'Info']);
    expect(
      [...(projects?.querySelectorAll('table tbody tr') ?? [])].map((row: Element) =>
        [...row.children].map(text),
      ),
    ).toEqual([['Library Trails', '1', '1', '0', '2']]);
    expect([...(audit?.querySelectorAll('ui-bar-list li') ?? [])].map(text)).toEqual([
      'Titre de recherche trop court1',
      'Couverture sans texte alternatif1',
    ]);
    const rows: HTMLTableRowElement[] = [
      ...(audit?.querySelectorAll<HTMLTableRowElement>('ui-data-table tbody tr') ?? []),
    ];
    // The most serious first.
    expect(rows.map(cells)).toEqual([
      ['Erreur', 'Library Trails', 'English', 'Couverture sans texte alternatif.'],
      [
        'Avertissement',
        'Library Trails',
        'Français',
        'Titre de recherche trop court : 23 caractères, 30 au minimum.',
      ],
    ]);
    expect(rows[0]?.querySelector('a')?.getAttribute('href')).toBe('/admin/articles/p1');
    // A status icon in the ink of its meaning, its word as a tooltip and as hidden text.
    const severity: Element | null | undefined = rows[0]?.querySelector(
      '[data-slot="status-icon"]',
    );
    expect(severity?.className).toContain('text-danger-ink');
    expect(severity?.getAttribute('data-slot')).toBe('status-icon');
    expect(severity?.querySelector('ng-icon')?.getAttribute('aria-hidden')).toBe('true');
    // The severity reads as a visible label beside its icon.
    expect(text(severity?.nextElementSibling)).toBe('Erreur');
    expect(rows[0]?.querySelector('[data-slot="badge"]')).toBeNull();
  });

  it('shows each report as figure cells, a chart grid fitting its data and full-width tables', async (): Promise<void> => {
    const opened: Opened = await open();
    const { backend, root, settle } = opened;
    backend.expectOne(`${URL}?range=28d`).flush(reported());
    await settle();
    expect(text(root().querySelector('[data-slot="page-header-meta"]'))).toMatch(
      /^Dernière collecte Google le 4 nov\. 2026/,
    );
    // The failed audience collection is flagged on its tab.
    expect(text(trigger(root(), 'Audience'))).toBe('Audience (dernière collecte en échec)');

    const search: HTMLElement | null = panel(root());
    // Each major section opens on its title and one line on what it shows.
    const sections = (tab: HTMLElement | null): string[] =>
      [...(tab?.querySelectorAll('content-seo-section-header h2') ?? [])].map(text);
    expect(sections(search)).toEqual([
      'Performance dans Google',
      'Requêtes et appareils',
      'Requêtes principales',
      'Pages principales',
    ]);
    expect(
      search?.querySelector('section[aria-labelledby="sc-queries"] content-seo-section-header p'),
    ).not.toBeNull();
    // Full-width tables: every column resizable, the widths shares of the frame (spread in the
    // browser; the test frame measures nothing, so the shares show as they are).
    const queries: Element | null | undefined = search?.querySelector(
      'section[aria-labelledby="sc-queries"] ui-data-table',
    );
    expect(queries?.querySelectorAll('[data-slot="data-table-resize-handle"]')).toHaveLength(5);
    expect(
      [...(queries?.querySelectorAll<HTMLElement>('col') ?? [])].map(
        (col: HTMLElement): string => col.style.width,
      ),
    ).toEqual(['280px', '96px', '120px', '96px', '104px']);
    // The key figures open the report as a strip of cards.
    expect(text(search?.querySelector('content-seo-kpi-tile'))).toBe(
      'Clics120 +20 % vs 7 sept. – 4 oct. 2026(favorable)',
    );
    // The same figures and the sources are listed in the « Détails » sheet.
    await openDetails(opened);
    const figures: string[] = [
      ...(sheet()?.querySelectorAll('content-seo-figure-list dl > div') ?? []),
    ].map(text);
    expect(figures[0]).toBe('Clics120 +20 % (favorable)');
    expect(figures[1]).toBe('Impressions4 000 -20 % (défavorable)');
    // A lower average position is better.
    expect(figures[3]).toBe('Position moyenne8,4 -1,2 (favorable)');
    expect(text(sheet()?.querySelector('content-seo-figure-list > p'))).toBe(
      'vs 7 sept. – 4 oct. 2026',
    );
    expect([...(sheet()?.querySelectorAll('content-seo-source-list li') ?? [])].map(text)).toEqual([
      expect.stringMatching(/^Search ConsoleCollecté le 4 nov\. 2026/),
      expect.stringMatching(/^Google AnalyticsÉchec le 4 nov\. 2026.*, dernier rapport conservé$/),
      expect.stringMatching(/^PageSpeed InsightsCollecté le 4 nov\. 2026/),
      expect.stringMatching(/^Audit SEOCalculé le 4 nov\. 2026/),
    ]);
    const states: string[] = [
      ...(sheet()?.querySelectorAll('content-seo-source-list li > span') ?? []),
    ].map((icon: Element): string => icon.className);
    expect(states).toEqual([
      expect.stringContaining('text-success-ink'),
      expect.stringContaining('text-warning-ink'),
      expect.stringContaining('text-success-ink'),
      expect.stringContaining('text-success-ink'),
    ]);
    // The window controls sit in the header, not in the sheet.
    expect(root().querySelector('[data-slot="page-header"] [aria-label="Période"]')).not.toBeNull();
    expect(sheet()?.querySelector('[aria-label="Période"]')).toBeNull();
    expect(search?.querySelector('[data-slot="card"]')).toBeNull();
    // No window or collection strip above the figures: the page header dates the last collection.
    expect(text(search)).not.toContain('Collecté le');
    const plots: string[] = [...(search?.querySelectorAll('[role="group"]') ?? [])].map(
      (plot: Element): string => plot.getAttribute('aria-label') ?? '',
    );
    expect(plots).toEqual([
      'Clics par jour',
      'Impressions par jour',
      'CTR par jour',
      'Position moyenne par jour',
      'CTR selon la position, par requête',
      'Clics par appareil',
    ]);
    const clicks: Element | null | undefined = search?.querySelector('ui-column-chart');
    expect(
      [...(clicks?.querySelectorAll('table tbody tr') ?? [])].map((row: Element) =>
        [...row.children].map(text),
      ),
    ).toEqual([
      ['31 oct.', '4'],
      ['1 nov.', '6'],
    ]);
    expect(search?.querySelector('ui-line-chart[invert]')).not.toBeNull();
    // Only the placed query: « portfolio angular » has no position.
    expect(
      [...(search?.querySelectorAll('ui-scatter-chart tbody tr') ?? [])].map((row: Element) =>
        [...row.children].map(text),
      ),
    ).toEqual([['morgan exemple', '1,2', '27 %']]);
    // Devices in their fixed order, desktop first, each share printed on its part.
    const devices: Element | null | undefined = search?.querySelector('ui-stacked-bars');
    expect(
      [...(devices?.querySelectorAll('[data-slot="chart-legend"] li') ?? [])].map(text),
    ).toEqual(['Ordinateur', 'Mobile']);
    expect(text(devices?.querySelector('[aria-hidden="true"].flex.gap-0\\.5'))).toBe('75 % 25 %');
    const tables: HTMLTableElement[] = [
      ...(search?.querySelectorAll('ui-data-table table') ?? []),
    ] as HTMLTableElement[];
    expect([...(tables[0]?.tBodies[0]?.rows ?? [])].map(cells)).toEqual([
      ['morgan exemple', '80', '300', '27 %', '1,2'],
      ['portfolio angular', '2', '900', '0,2 %', '—'],
    ]);
    expect(text(tables[1]?.tBodies[0]?.rows[0]?.cells[0])).toBe('/articles/library-trails');

    const audience: HTMLElement | null = await show(opened, 'Audience');
    expect(sections(audience)).toEqual([
      'Fréquentation',
      'Provenance des visites',
      'Pages les plus vues',
    ]);
    expect(TestBed.inject<Router>(Router).url).toBe('/admin/dashboard?onglet=audience');
    const alert: Element | null | undefined = audience?.querySelector('[data-slot="alert"]');
    expect(alert?.getAttribute('data-variant')).toBe('warning');
    expect(text(alert)).toContain('Échec de la dernière collecte de Google Analytics');
    expect(text(alert)).toContain('Le compte de service n’a pas accès à la propriété.');
    expect(text(alert)).toContain(
      'permission-denied · The service account cannot read the property.',
    );
    expect(text(alert)).toContain('Tentative du 4 nov. 2026');
    expect(text(alert)).toContain('Données affichées du 3 nov. 2026');
    expect(text(sheet())).toContain('Durée d’engagement moyenne1 min 23 s');
    // Three counts of one unit on one chart, a legend naming them.
    const daily: Element | null | undefined = audience?.querySelector('ui-line-chart');
    expect([...(daily?.querySelectorAll('[data-slot="chart-legend"] li') ?? [])].map(text)).toEqual(
      ['Utilisateurs actifs', 'Sessions', 'Vues'],
    );
    expect(
      [...(daily?.querySelectorAll('table tbody tr') ?? [])].map((row: Element) =>
        [...row.children].map(text),
      ),
    ).toEqual([['3 nov.', '3', '4', '9']]);
    // 3 November 2026 is a Tuesday: second row of the calendar.
    expect(
      [...(audience?.querySelectorAll('ui-heatmap tbody tr') ?? [])].map((row: Element) =>
        [...row.children].map(text),
      ),
    ).toEqual([['mardi 3 novembre', '4 sessions']]);
    expect(
      [...(audience?.querySelectorAll('ui-bar-list') ?? [])].map((list) =>
        list.querySelector('ul')?.getAttribute('aria-label'),
      ),
    ).toEqual(['Sessions par canal', 'Sessions par pays']);
    // Shares of the window's sessions, most first.
    expect(text(audience?.querySelector('ui-bar-list li'))).toBe('Organic Search60 · 75 %');

    const vitals: HTMLElement | null = await show(opened, 'Core Web Vitals');
    expect(sections(vitals)).toEqual(['Synthèse des performances', 'Mesures par page']);
    expect(text(vitals?.querySelector('section[aria-labelledby="cwv-pages"] p'))).toContain(
      '75e centile des visites réelles de Chrome',
    );
    expect(text(sheet())).toContain('Mesures1Mesures impossibles0');
    expect(text(sheet())).toContain('Score labo médian, mobile42Score labo médian, ordinateur—');
    // Counts of the current state: no period compared.
    expect(sheet()?.querySelector('content-seo-figure-list > p')).toBeNull();
    expect(
      [...(vitals?.querySelectorAll('ui-stacked-bars tbody tr') ?? [])].map((row: Element) =>
        [...row.children].map(text),
      ),
    ).toEqual([
      ['LCP', '1 mesure', '0 mesure', '0 mesure', '1 mesure'],
      ['INP', '0 mesure', '1 mesure', '0 mesure', '1 mesure'],
      ['Score labo', '0 mesure', '0 mesure', '1 mesure', '1 mesure'],
    ]);
    expect(text(vitals?.querySelector('ui-dumbbell-chart li.grid'))).toBe(
      '/Mobile 42 Ordinateur —',
    );
    const row: HTMLTableRowElement | null | undefined =
      vitals?.querySelector('ui-data-table tbody tr');
    expect(cells(row)).toEqual([
      '/Données terrain de l’origine',
      'Mobile',
      '2,4 sBon',
      '260 msÀ améliorer',
      '—Non renseigné',
      '42Mauvais',
    ]);
    expect(
      [...(row?.querySelectorAll('[data-slot="status-icon"]') ?? [])].map(
        (icon: Element): string => icon.className,
      ),
    ).toEqual([
      expect.stringContaining('text-success-ink'),
      expect.stringContaining('text-warning-ink'),
      expect.stringContaining('text-danger-ink'),
    ]);
  });

  it('keeps the room of every chart and closes every table with an empty state when a window has no data', async (): Promise<void> => {
    const opened: Opened = await open();
    const report: SeoDashboard = reported();
    const search: SeoDashboard['searchConsole'] = report.searchConsole;
    if (search.status !== 'ok') throw new Error('Search Console fixture expected.');
    opened.backend.expectOne(`${URL}?range=28d`).flush({
      ...report,
      searchConsole: {
        ...search,
        data: { ...search.data, daily: [], queries: [], pages: [], devices: [] },
      },
    });
    await opened.settle();
    const tab: HTMLElement | null = panel(opened.root());
    // Six charts, each a note on the empty surface instead of a missing block.
    const notes: Element[] = [...(tab?.querySelectorAll('p.bg-surface-raised') ?? [])];
    expect(notes).toHaveLength(6);
    expect(new Set(notes.map(text))).toEqual(new Set(['Aucune donnée à afficher.']));
    const empties: HTMLElement[] = [
      ...(tab?.querySelectorAll<HTMLElement>('[data-slot="data-table-empty"]') ?? []),
    ];
    expect(
      empties.map((empty: HTMLElement) => text(empty.querySelector('[data-slot="empty-title"]'))),
    ).toEqual(['Aucune requête sur la période', 'Aucune page sur la période']);
    // Inside the table's own frame (D36 cards revision), not closed by a hairline of its own.
    expect(empties[0]?.className).toContain('contents');
  });

  it('opens the tab named in ?onglet= and falls back to the first one on an unknown name', async (): Promise<void> => {
    const opened: Opened = await open('/admin/dashboard?onglet=audit');
    opened.backend.expectOne(`${URL}?range=28d`).flush(unconfigured());
    await opened.settle();
    expect(trigger(opened.root(), 'Audit SEO')?.getAttribute('aria-selected')).toBe('true');
    expect(panel(opened.root())?.querySelector('content-seo-audit-panel')).not.toBeNull();
    // Back to the first tab: the parameter goes.
    await show(opened, 'Search Console');
    expect(TestBed.inject<Router>(Router).url).toBe('/admin/dashboard');
    await opened.harness.navigateByUrl('/admin/dashboard?onglet=nope');
    await opened.settle();
    expect(trigger(opened.root(), 'Search Console')?.getAttribute('aria-selected')).toBe('true');
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
    expect(root().querySelector('ui-column-chart')?.hasAttribute('data-stale')).toBe(true);
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
      headerButton(root(), (label: string): boolean => label.startsWith('Actualis'));
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
    headerButton(root(), (label: string): boolean => label === 'Actualiser')?.click();
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

  it('keeps the window controls and « Détails » in the header, with the figures and sources in a sheet', async (): Promise<void> => {
    const opened: Opened = await open();
    const { backend, root, settle } = opened;
    backend.expectOne(`${URL}?range=28d`).flush(reported());
    await settle();
    // No side panel, no resizable split.
    expect(root().querySelector('aside')).toBeNull();
    expect(root().querySelector('ui-resizable-handle')).toBeNull();
    const header: Element | null = root().querySelector('[data-slot="page-header"]');
    const periods: Element | null | undefined = header?.querySelector('[aria-label="Période"]');
    expect([...(periods?.querySelectorAll('button') ?? [])].map(text)).toEqual([
      '7 jours',
      '28 jours',
      '90 jours',
      '1 an',
    ]);
    expect(headerButton(root(), (label: string): boolean => label === 'Actualiser')).toBeDefined();
    // Every report opens on its strip of key figure cards.
    expect(text(panel(root())?.querySelector('content-seo-kpi-tile'))).toBe(
      'Clics120 +20 % vs 7 sept. – 4 oct. 2026(favorable)',
    );
    expect(sheet()).toBeNull();
    const details: HTMLButtonElement | undefined = headerButton(
      root(),
      (label: string): boolean => label === 'Détails',
    );
    expect(details).toBeDefined();
    expect(details?.getAttribute('aria-haspopup')).toBe('dialog');
    expect(details?.getAttribute('aria-expanded')).toBe('false');
    await openDetails(opened);
    const content: HTMLElement | null = sheet();
    expect(text(content?.querySelector('[data-slot="sheet-title"]'))).toBe('Détails');
    expect(document.activeElement).toBe(content?.querySelector('[data-slot="sheet-title"]'));
    expect(text(content?.querySelector('content-seo-figure-list dl > div'))).toBe(
      'Clics120 +20 % (favorable)',
    );
    expect(content?.querySelectorAll('content-seo-source-list li')).toHaveLength(4);
    expect(details?.getAttribute('aria-expanded')).toBe('true');
    // The window controls stay in the header.
    expect(content?.querySelector('[aria-label="Période"]')).toBeNull();
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
