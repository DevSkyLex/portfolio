import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID, RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  provideContentSnapshotLoader,
  provideContentSnapshots,
} from '@vfortin/content-web-data-access';
import { AdminStylesheetService } from '@internal/web-shell/lib/admin-stylesheet/admin-stylesheet.service';
import { APP_ROUTES } from '@internal/web-shell/lib/app.routes';
import { ADMIN_PRESENCE_STORAGE_KEY } from '@internal/web-shell/lib/maintenance-preview/constants/maintenance-preview.constants';
import { MaintenancePreviewService } from '@internal/web-shell/lib/maintenance-preview/maintenance-preview.service';

/**
 * Constant DOC
 *
 * @description
 * Minimal article document of the contract.
 */
const DOC: { type: 'doc'; content: { type: 'paragraph' }[] } = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

/**
 * Function snapshot
 *
 * @description
 * Builds a minimal French snapshot with the supplied maintenance state and a public e-mail link.
 *
 * @param {{ enabled: boolean; message: string } | undefined} maintenance - Maintenance state, absent
 * for a snapshot written before the maintenance mode.
 *
 * @returns {Record<string, unknown>} Raw snapshot.
 */
function snapshot(maintenance?: { enabled: boolean; message: string }): Record<string, unknown> {
  return {
    locale: 'fr',
    revision: 1,
    profile: {
      heroIntro: 'Intro.',
      aboutStatement: 'Phrase.',
      aboutLead: 'Lead.',
      facts: [],
      links: [{ kind: 'email', url: 'mailto:morgan@example.com', label: null }],
    },
    projects: [],
    timeline: [],
    skills: [],
    legal: {
      notice: { updatedOn: '2026-11-02', document: DOC },
      privacy: { updatedOn: '2026-11-02', document: DOC },
    },
    ...(maintenance ? { maintenance } : {}),
  };
}

/**
 * Function setup
 *
 * @description
 * Configures the shell routes over one snapshot and records the SSR response.
 *
 * @param {Record<string, unknown>} raw - French snapshot.
 *
 * @returns {ResponseInit} Response initialisation the pages write to.
 */
function setup(raw: Record<string, unknown>): ResponseInit {
  const response: ResponseInit = {};
  TestBed.configureTestingModule({
    providers: [
      provideRouter(APP_ROUTES, withComponentInputBinding()),
      provideHttpClient(),
      { provide: LOCALE_ID, useValue: 'fr' },
      { provide: RESPONSE_INIT, useValue: response },
      provideContentSnapshots({ fr: raw, en: { ...raw, locale: 'en' } }),
      // The admin stylesheet is a document link the test environment never loads.
      {
        provide: AdminStylesheetService,
        useValue: { load: (): Promise<void> => Promise.resolve() },
      },
    ],
  });
  return response;
}

// The administrator's preview renders the site layout, which formats French dates.
registerLocaleData(localeFr);

describe('maintenance mode', (): void => {
  it('replaces every public page with the maintenance screen, answered 503 without indexing', async (): Promise<void> => {
    const response: ResponseInit = setup(snapshot({ enabled: true, message: 'Retour à 14 h.' }));
    const harness: RouterTestingHarness = await RouterTestingHarness.create();
    for (const url of [
      '/',
      '/projects/library-trails',
      '/legal-notice',
      '/unknown',
      '/error/404',
    ]) {
      await harness.navigateByUrl(url);
      const page: HTMLElement | null = harness.routeNativeElement;
      expect([url, page?.querySelector('h1')?.textContent?.trim()]).toEqual([
        url,
        'Site en maintenance',
      ]);
      expect(page?.ownerDocument.querySelector('header nav')).toBeNull();
      expect(page?.ownerDocument.querySelector('footer')).toBeNull();
    }
    expect(response.status).toBe(503);
    const headers: Headers = new Headers(response.headers);
    expect(headers.get('Retry-After')).toBe('3600');
    expect(headers.get('X-Robots-Tag')).toBe('noindex');
    expect(TestBed.inject<Title>(Title).getTitle()).toBe('Site en maintenance — Valentin Fortin');
  });

  it('shows the owner message, the site mark and the public e-mail', async (): Promise<void> => {
    setup(snapshot({ enabled: true, message: 'Retour à 14 h.' }));
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/');
    const page: HTMLElement | null = harness.routeNativeElement;
    expect(page?.querySelector('main p')?.textContent?.trim()).toBe('Retour à 14 h.');
    expect(page?.querySelector('app-site-logo')).not.toBeNull();
    expect(page?.querySelector('a[href="mailto:morgan@example.com"]')?.textContent?.trim()).toBe(
      'morgan@example.com',
    );
  });

  it('falls back on the default line without a message', async (): Promise<void> => {
    setup(snapshot({ enabled: true, message: '' }));
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/');
    expect(harness.routeNativeElement?.querySelector('main p')?.textContent?.trim()).toBe(
      'Le site revient très vite.',
    );
  });

  it('shows the administrator the site with a banner, and the screen again once signed out', async (): Promise<void> => {
    setup(snapshot({ enabled: true, message: 'Retour à 14 h.' }));
    const preview: MaintenancePreviewService = TestBed.inject(MaintenancePreviewService);
    preview.markAdmin();
    expect(localStorage.getItem(ADMIN_PRESENCE_STORAGE_KEY)).toBe('1');
    try {
      const harness: RouterTestingHarness = await RouterTestingHarness.create('/legal-notice');
      // The first render matches the server's screen, then the marked browser reloads the route.
      await harness.fixture.whenStable();
      await harness.fixture.whenStable();
      const doc: Document = harness.fixture.nativeElement.ownerDocument as Document;
      expect(preview.active()).toBe(true);
      expect(doc.querySelector('app-maintenance-page')).toBeNull();
      expect(doc.querySelector('header nav')).not.toBeNull();
      const banner: HTMLElement | null = doc.querySelector('[data-slot="maintenance-preview"]');
      expect(banner?.getAttribute('role')).toBe('status');
      // One real space between the two sentences, never one glued by layout only.
      expect(banner?.querySelector('p')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        'Mode maintenance actif. Les visiteurs voient l’écran de maintenance ; vous voyez le site car vous êtes connecté en administrateur.',
      );
      expect(banner?.querySelector('p')?.textContent).not.toContain('actif.Les');
      expect(banner?.querySelector('a')?.getAttribute('href')).toBe('/admin/maintenance');
    } finally {
      preview.unmarkAdmin();
    }
    expect(localStorage.getItem(ADMIN_PRESENCE_STORAGE_KEY)).toBeNull();
    expect(preview.active()).toBe(false);
    expect(preview.startIfAdmin()).toBe(false);
  });

  it('keeps the screen when the browser storage refuses the mark', (): void => {
    const preview: MaintenancePreviewService = TestBed.inject(MaintenancePreviewService);
    const denied = (): never => {
      throw new Error('denied');
    };
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(denied);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(denied);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(denied);
    expect((): void => preview.markAdmin()).not.toThrow();
    expect(preview.startIfAdmin()).toBe(false);
    expect((): void => preview.unmarkAdmin()).not.toThrow();
    vi.restoreAllMocks();
  });

  it('still serves the site when reading the storage itself throws', async (): Promise<void> => {
    // Blocked site data: the localStorage getter throws a SecurityError before any method runs.
    vi.spyOn(window, 'localStorage', 'get').mockImplementation((): never => {
      throw new DOMException('denied', 'SecurityError');
    });
    try {
      setup(snapshot({ enabled: false, message: '' }));
      const preview: MaintenancePreviewService = TestBed.inject(MaintenancePreviewService);
      expect(preview.startIfAdmin()).toBe(false);
      expect((): void => preview.markAdmin()).not.toThrow();
      const harness: RouterTestingHarness = await RouterTestingHarness.create('/');
      expect(harness.routeNativeElement?.ownerDocument.querySelector('header nav')).not.toBeNull();
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('keeps the administration reachable', async (): Promise<void> => {
    setup(snapshot({ enabled: true, message: '' }));
    const harness: RouterTestingHarness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/login');
    expect(TestBed.inject<Router>(Router).url).toBe('/admin/login');
    expect(harness.routeNativeElement?.querySelector('app-maintenance-page')).toBeNull();
    expect(harness.routeNativeElement?.textContent).not.toContain('Site en maintenance');
  });

  it('leaves the site as it is when the mode is off or the snapshot predates it', async (): Promise<void> => {
    for (const raw of [snapshot({ enabled: false, message: 'Retour' }), snapshot()]) {
      TestBed.resetTestingModule();
      const response: ResponseInit = setup(raw);
      const harness: RouterTestingHarness = await RouterTestingHarness.create('/');
      expect(harness.routeNativeElement?.querySelector('app-maintenance-page')).toBeNull();
      expect(harness.routeNativeElement?.ownerDocument.querySelector('header nav')).not.toBeNull();
      expect(response.status).toBeUndefined();
    }
  });

  it('lets the site routes answer when the snapshot cannot be read', async (): Promise<void> => {
    setup(snapshot({ enabled: true, message: '' }));
    TestBed.configureTestingModule({
      providers: [
        provideContentSnapshotLoader((): Promise<never> =>
          Promise.reject(new Error('upstream down')),
        ),
      ],
    });
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/error/503');
    expect(harness.routeNativeElement?.querySelector('app-maintenance-page')).toBeNull();
    expect(harness.routeNativeElement?.querySelector('app-error-page')).not.toBeNull();
  });
});
