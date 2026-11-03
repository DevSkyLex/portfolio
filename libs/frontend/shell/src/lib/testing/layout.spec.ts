import type { Mock } from 'vitest';
import type { ThemeMode } from '@internal/web-shell/lib/theme/models/theme-mode/theme-mode.type';

import { provideAdminInboxSummary } from '@vfortin/contact-web-data-access/summary';
import { provideAdminProjectNavigation } from '@vfortin/content-web-data-access/navigation';
import { provideAdminSession } from '@vfortin/identity-web-data-access/session';
import { provideHttpClient } from '@angular/common/http';
import {
  type TestRequest,
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ApplicationInitStatus, LOCALE_ID, PLATFORM_ID } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { type Route, Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideContentSnapshots } from '@vfortin/content-web-data-access';
import { AdminLayoutComponent } from '@internal/web-shell/lib/admin/layouts/admin-layout/admin-layout.component';
import { ADMIN_ROUTES } from '@internal/web-shell/lib/admin/admin.routes';
import { APP_ROUTES } from '@internal/web-shell/lib/app.routes';
import { provideWebShell } from '@internal/web-shell/lib/provide-web-shell';
import { provideWebShellServer } from '@internal/web-shell/lib/provide-web-shell.server';
import { ThemeService } from '@internal/web-shell/lib/theme/theme.service';

/**
 * Constant snapshot
 *
 * @description
 * Minimal French content snapshot injected into layout tests so the shell can initialize without API calls.
 */
const snapshot: {
  locale: string;
  revision: number;
  profile: { heroIntro: string; aboutStatement: string; aboutLead: string; facts: never[] };
  projects: never[];
  timeline: never[];
  skills: never[];
} = {
  locale: 'fr',
  revision: 1,
  profile: { heroIntro: 'Intro.', aboutStatement: 'Phrase.', aboutLead: 'Lead.', facts: [] },
  projects: [],
  timeline: [],
  skills: [],
};

/**
 * Function flush
 *
 * @description
 * Advances one timer turn for browser work scheduled by the layout tests.
 *
 * @returns {Promise<void>} Resolves on the next timer turn.
 */
const flush: () => Promise<unknown> = (): Promise<unknown> =>
  new Promise((resolve) => setTimeout(resolve));

describe('SiteLayoutComponent', () => {
  beforeEach(() => {
    // jsdom has no modal dialogs.
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.setAttribute('open', '');
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      },
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter(APP_ROUTES, withComponentInputBinding()),
        provideHttpClient(),
        { provide: LOCALE_ID, useValue: 'fr' },
        provideContentSnapshots({ fr: snapshot, en: { ...snapshot, locale: 'en' } }),
      ],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  });

  it('opens the mobile menu as a modal, locks the page and gives the focus back once closed', async () => {
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/legal-notice');
    const doc: Document = harness.fixture.nativeElement.ownerDocument as Document;
    const button: HTMLButtonElement | null = doc.querySelector<HTMLButtonElement>(
      'button[aria-controls="site-menu"]',
    );
    button?.click();
    await harness.fixture.whenStable();
    expect(button?.getAttribute('aria-expanded')).toBe('true');
    expect(doc.documentElement.style.overflow).toBe('hidden');
    doc.querySelector<HTMLAnchorElement>('#site-menu a[href="/#journey"]')?.click();
    await harness.fixture.whenStable();
    expect(button?.getAttribute('aria-expanded')).toBe('false');
    expect(doc.documentElement.style.overflow).toBe('');
    expect(doc.activeElement).toBe(button);
  });

  it('makes the skip link an explicit keyboard stop before the public navigation', async () => {
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/legal-notice');
    const doc: Document = harness.fixture.nativeElement.ownerDocument as Document;
    const skip: HTMLAnchorElement | null =
      doc.querySelector<HTMLAnchorElement>('a[href="#content"]');
    expect(skip?.getAttribute('tabindex')).toBe('0');
    expect(skip?.textContent).toContain('Aller au contenu');
    expect(doc.getElementById('content')).not.toBeNull();
  });

  it('compacts the header once the page scrolls', async () => {
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/legal-notice');
    const header: HTMLElement | null = (
      harness.fixture.nativeElement.ownerDocument as Document
    ).querySelector('header');
    const scrolled: () => boolean = (): boolean => header?.hasAttribute('data-scrolled') ?? false;
    expect(scrolled()).toBe(false);
    Object.defineProperty(window, 'scrollY', { value: 120, configurable: true });
    window.dispatchEvent(new Event('scroll'));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await harness.fixture.whenStable();
    expect(scrolled()).toBe(true);
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  it('names the current language in the footer menu of the English build', async () => {
    TestBed.overrideProvider(LOCALE_ID, { useValue: 'en-US' });
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/legal-notice');
    const doc: Document = harness.fixture.nativeElement.ownerDocument as Document;
    const language: Element | null = doc.querySelector('footer ui-menu-select button');
    expect(language?.textContent?.trim()).toBe('English');
  });

  it('switches the theme from the footer menu', async () => {
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/legal-notice');
    const theme: ThemeService = TestBed.inject<ThemeService>(ThemeService);
    const set: Mock<(mode: ThemeMode, origin?: Element | null) => void> = vi.spyOn(theme, 'set');
    const doc: Document = harness.fixture.nativeElement.ownerDocument as Document;
    const menu: Element | undefined = doc.querySelectorAll('footer ui-menu-select')[1];
    menu?.querySelector<HTMLButtonElement>('button')?.click();
    await harness.fixture.whenStable();
    menu?.querySelectorAll<HTMLElement>('[role="option"]')[2]?.click();
    await harness.fixture.whenStable();
    expect(set).toHaveBeenCalledWith('light', expect.any(HTMLButtonElement));
  });

  it('shows the reading progress and the home section under the reading band, one frame per burst', async () => {
    const root: HTMLElement = document.documentElement;
    vi.spyOn(root, 'scrollHeight', 'get').mockReturnValue(5000);
    const frame: Mock<
      ((callback: FrameRequestCallback) => number) & ((callback: FrameRequestCallback) => number)
    > = vi.spyOn(window, 'requestAnimationFrame');
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/');
    const doc: Document = harness.fixture.nativeElement.ownerDocument as Document;
    const journey: HTMLElement | null = doc.getElementById('journey');
    if (!journey) throw new Error('journey section missing');

    // Band at 40-45 % of the 768px jsdom viewport: 307px to 346px.
    vi.spyOn(journey, 'getBoundingClientRect').mockReturnValue({
      top: 200,
      bottom: 900,
    } as DOMRect);
    Object.defineProperty(window, 'scrollY', { value: 600, configurable: true });
    try {
      frame.mockClear();
      window.dispatchEvent(new Event('scroll'));
      const requested: number = frame.mock.calls.length;
      expect(requested).toBeGreaterThan(0);

      // A second event before the frame runs asks for no new frame.
      window.dispatchEvent(new Event('scroll'));
      expect(frame).toHaveBeenCalledTimes(requested);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await harness.fixture.whenStable();
      const header: HTMLElement | null = doc.querySelector('header');
      expect(header?.style.getPropertyValue('--hp')).toBe((600 / (5000 - 768)).toFixed(4));
      expect(header?.style.getPropertyValue('--hc')).toBe('var(--aurora-violet)');
      expect(doc.querySelector('header nav a[aria-current="true"]')?.getAttribute('href')).toBe(
        '/#journey',
      );
    } finally {
      Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    }
  });

  it('closes the mobile menu once the window reaches the desktop layout', async () => {
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/legal-notice');
    const doc: Document = harness.fixture.nativeElement.ownerDocument as Document;
    const button: HTMLButtonElement | null = doc.querySelector<HTMLButtonElement>(
      'button[aria-controls="site-menu"]',
    );
    button?.click();
    await harness.fixture.whenStable();
    expect(doc.querySelector('#site-menu')?.hasAttribute('open')).toBe(true);
    vi.spyOn(doc.documentElement, 'clientWidth', 'get').mockReturnValue(1280);
    window.dispatchEvent(new Event('resize'));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await harness.fixture.whenStable();
    expect(doc.querySelector('#site-menu')?.hasAttribute('open')).toBe(false);
    expect(button?.getAttribute('aria-expanded')).toBe('false');
    expect(doc.documentElement.style.overflow).toBe('');
  });
});

describe('ThemeService view transition', () => {
  beforeEach(() => localStorage.clear());

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
  });

  it('opens the new theme in a circle from the menu that asked for it', async () => {
    vi.stubGlobal('matchMedia', (): { matches: boolean; addEventListener: () => undefined } => ({
      matches: false,
      addEventListener: (): undefined => undefined,
    }));
    let finish: () => void = (): void => undefined;
    const startViewTransition: Mock<(update: () => Promise<void>) => { finished: Promise<void> }> =
      vi.fn((update: () => Promise<void>) => {
        void update();
        return { finished: new Promise<void>((resolve) => (finish = resolve)) };
      });
    Object.defineProperty(document, 'startViewTransition', {
      value: startViewTransition,
      configurable: true,
    });
    try {
      const theme: ThemeService = TestBed.inject<ThemeService>(ThemeService);
      TestBed.tick();
      const origin: HTMLButtonElement = document.createElement('button');
      vi.spyOn(origin, 'getBoundingClientRect').mockReturnValue({
        left: 100,
        top: 40,
        width: 20,
        height: 10,
      } as DOMRect);
      theme.set('light', origin);
      const root: HTMLElement = document.documentElement;
      expect(startViewTransition).toHaveBeenCalledOnce();
      expect(root.style.getPropertyValue('--vt-x')).toBe('110px');
      expect(root.style.getPropertyValue('--vt-y')).toBe('45px');
      expect(root.hasAttribute('data-theme-vt')).toBe(true);
      expect(root.getAttribute('data-theme')).toBe('light');
      finish();
      await flush();
      expect(root.hasAttribute('data-theme-vt')).toBe(false);

      // Same rendering: no transition.
      theme.set('light', origin);
      expect(startViewTransition).toHaveBeenCalledOnce();
    } finally {
      Reflect.deleteProperty(document, 'startViewTransition');
    }
  });

  it('follows the device in system mode', () => {
    let listener: (event: { matches: boolean }) => void = (): void => undefined;
    vi.stubGlobal(
      'matchMedia',
      (): {
        matches: boolean;
        addEventListener: (
          _: string,
          callback: (event: { matches: boolean }) => void,
        ) => (event: { matches: boolean }) => void;
      } => ({
        matches: false,
        addEventListener: (
          _: string,
          callback: typeof listener,
        ): ((event: { matches: boolean }) => void) => (listener = callback),
      }),
    );
    const theme: ThemeService = TestBed.inject<ThemeService>(ThemeService);
    theme.set('system');
    TestBed.tick();
    expect(theme.theme()).toBe('dark');
    listener({ matches: true });
    TestBed.tick();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});

describe('admin area', () => {
  it('logs out and goes back to the login page', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'admin/login', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAdminInboxSummary(),
        provideAdminProjectNavigation(),
        provideAdminSession(),
      ],
    });
    const fixture: ComponentFixture<AdminLayoutComponent> =
      TestBed.createComponent(AdminLayoutComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    );
    [...root.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('déconnecter'))
      ?.click();
    TestBed.inject<HttpTestingController>(HttpTestingController)
      .expectOne('/api/auth/logout')
      .flush(null, { status: 204, statusText: 'No Content' });
    await flush();
    await fixture.whenStable();
    expect(TestBed.inject<Router>(Router).url).toBe('/admin/login');
  });

  it('counts unread messages and opens a command palette on Ctrl+K', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'admin/projects/:id', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAdminInboxSummary(),
        provideAdminProjectNavigation(),
        provideAdminSession(),
      ],
    });
    const backend: HttpTestingController =
      TestBed.inject<HttpTestingController>(HttpTestingController);
    const fixture: ComponentFixture<AdminLayoutComponent> =
      TestBed.createComponent(AdminLayoutComponent);
    const unread: () => TestRequest = (): TestRequest =>
      backend.expectOne((r) => r.url === '/api/contact/admin/messages');
    const first: TestRequest = unread();
    expect(first.request.params.get('status')).toBe('received');
    first.flush({ member: [], totalItems: 3 });
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('nav')?.textContent).toContain('3 non lu(s)');

    const palette: () => Element | null = (): Element | null =>
      document.querySelector('[aria-label="Palette de commandes"]');
    const item: (label: string) => HTMLElement | undefined = (
      label: string,
    ): HTMLElement | undefined =>
      [...(palette()?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])].find(
        (option) => option.textContent?.trim() === label,
      );
    const press: () => KeyboardEvent = (): KeyboardEvent => {
      const event: KeyboardEvent = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        cancelable: true,
      });
      window.dispatchEvent(event);
      return event;
    };
    expect(press().defaultPrevented).toBe(true);
    press();
    backend.expectOne('/api/content/admin/projects').flush({
      member: [
        {
          id: 'p1',
          slug: 'movah',
          status: 'published',
          title: { fr: 'Movah', en: 'Movah' },
          version: 1,
          position: 0,
          summary: { fr: 'Summary' },
          lead: { fr: 'Lead' },
          periodLabel: { fr: 'Period' },
          client: { fr: 'Client' },
          role: { fr: 'Role' },
          place: { fr: 'Place' },
          siteUrl: null,
          techs: [],
          featured: false,
          missing: [],
          article: {
            context: [],
            work: [],
            workList: [],
            choices: [],
            result: [],
            lessons: [],
            captions: [],
          },
        },
      ],
      totalItems: 1,
    });
    await flush();
    await fixture.whenStable();
    expect(document.querySelectorAll('[aria-label="Palette de commandes"]')).toHaveLength(1);
    expect(item('Movah')).toBeDefined();
    item('Movah')?.click();
    await flush();
    await fixture.whenStable();
    expect(TestBed.inject<Router>(Router).url).toBe('/admin/projects/p1');
    expect(palette()).toBeNull();
    unread().flush(null, { status: 500, statusText: 'Server Error' });
    await flush();
    await fixture.whenStable();
    expect(root.querySelector('nav')?.textContent).not.toContain('non lu');
    expect(root.textContent).toContain('Nombre de messages indisponible.');

    const open: Mock<
      ((url?: string | URL, target?: string, features?: string) => WindowProxy | null) &
        ((url?: string | URL, target?: string, features?: string) => WindowProxy | null)
    > = vi.spyOn(window, 'open').mockReturnValue(null);
    [...root.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Rechercher'))
      ?.click();
    backend
      .expectOne('/api/content/admin/projects')
      .flush(null, { status: 500, statusText: 'Server Error' });
    await flush();
    await fixture.whenStable();
    expect(palette()?.textContent).not.toContain('Movah');
    item('Voir le site')?.click();
    expect(open).toHaveBeenCalledWith('/', '_blank', 'noopener');
    await fixture.whenStable();
    expect(palette()).toBeNull();
    open.mockRestore();
  });

  it('reports a logout failure in a toast and retries before navigating', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'admin/login', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAdminInboxSummary(),
        provideAdminProjectNavigation(),
        provideAdminSession(),
      ],
    });
    const fixture: ComponentFixture<AdminLayoutComponent> =
      TestBed.createComponent(AdminLayoutComponent);
    const backend: HttpTestingController =
      TestBed.inject<HttpTestingController>(HttpTestingController);
    backend
      .expectOne((r) => r.url === '/api/contact/admin/messages')
      .flush({ member: [], totalItems: 0 });
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const button: HTMLButtonElement | undefined = [...root.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('déconnecter'),
    );
    button?.click();
    backend.expectOne('/api/auth/logout').flush(null, { status: 503, statusText: 'Unavailable' });
    await flush();
    await fixture.whenStable();
    expect(TestBed.inject<Router>(Router).url).not.toBe('/admin/login');
    expect(document.querySelector('[data-slot="toast"][data-type="error"]')?.textContent).toContain(
      'La déconnexion n’a pas été confirmée. Réessayez.',
    );
    button?.click();
    backend.expectOne('/api/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
    await flush();
    await fixture.whenStable();
    expect(TestBed.inject<Router>(Router).url).toBe('/admin/login');
  });

  it('guards the admin pages and loads them on demand', async () => {
    expect(ADMIN_ROUTES.map((route) => route.path)).toEqual(['login', '']);
    expect(ADMIN_ROUTES[1]?.canMatch).toHaveLength(1);
    const admin: Route | undefined = APP_ROUTES.find((route) => route.path === 'admin');
    await expect(admin?.loadChildren?.()).resolves.toBe(ADMIN_ROUTES);
  });
});

describe('provideWebShell', () => {
  afterEach(() => document.documentElement.removeAttribute('data-app'));

  it('does not load public content or claim successful navigation during application initialization', async () => {
    const load: Mock<
      () => Promise<{
        locale: string;
        revision: number;
        profile: { heroIntro: string; aboutStatement: string; aboutLead: string; facts: never[] };
        projects: never[];
        timeline: never[];
        skills: never[];
      }>
    > = vi.fn(async () => snapshot);
    TestBed.configureTestingModule({
      providers: [
        { provide: LOCALE_ID, useValue: 'fr' },
        provideWebShell({ contentSnapshot: load }),
      ],
    });
    await TestBed.inject<ApplicationInitStatus>(ApplicationInitStatus).donePromise;
    expect(load).not.toHaveBeenCalled();
    expect(document.documentElement.hasAttribute('data-app')).toBe(false);
  });

  it('leaves the theme.js marker alone when rendering on the server', async () => {
    const load: Mock<
      () => Promise<{
        locale: string;
        revision: number;
        profile: { heroIntro: string; aboutStatement: string; aboutLead: string; facts: never[] };
        projects: never[];
        timeline: never[];
        skills: never[];
      }>
    > = vi.fn(async () => snapshot);
    TestBed.configureTestingModule({
      providers: [
        { provide: LOCALE_ID, useValue: 'fr' },
        { provide: PLATFORM_ID, useValue: 'server' },
        provideWebShell({ contentSnapshot: load }),
      ],
    });
    await TestBed.inject<ApplicationInitStatus>(ApplicationInitStatus).donePromise;
    expect(load).not.toHaveBeenCalled();
    expect(document.documentElement.hasAttribute('data-app')).toBe(false);
  });

  it('provides the server rendering on the server only', () => {
    expect(provideWebShellServer()).toBeTruthy();
  });
});
