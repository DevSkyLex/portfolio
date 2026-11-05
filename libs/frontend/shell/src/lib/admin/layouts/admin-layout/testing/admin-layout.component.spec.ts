import type { MockInstance } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, LOCALE_ID, type Provider } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { type Routes, Router, provideRouter } from '@angular/router';
import { provideAdminInboxSummary } from '@vfortin/contact-web-data-access/summary';
import { provideAdminProjectNavigation } from '@vfortin/content-web-data-access/navigation';
import { provideAdminSession } from '@vfortin/identity-web-data-access/session';
import { SidebarTriggerComponent } from '@vfortin/ui';
import { AdminLayoutComponent } from '@internal/web-shell/lib/admin/layouts/admin-layout/admin-layout.component';
import { ThemeService } from '@internal/web-shell/lib/theme/theme.service';

/**
 * Interface FakeMediaQuery
 * @interface FakeMediaQuery
 *
 * @description
 * Narrow layout query answered by the stubbed `matchMedia`, with the listener the layout registered.
 */
interface FakeMediaQuery {
  // #region Properties
  /**
   * Property matches
   *
   * @description
   * Whether the window is narrow.
   *
   * @type {boolean}
   */
  matches: boolean;

  /**
   * Property listener
   *
   * @description
   * Change listener registered by the layout, `null` once removed.
   *
   * @type {((event: { matches: boolean }) => void) | null}
   */
  listener: ((event: { matches: boolean }) => void) | null;
  // #endregion
}

/**
 * Function flush
 *
 * @description
 * Advances one timer turn so promise continuations and overlays settle.
 *
 * @returns {Promise<unknown>} Resolves on the next timer turn.
 */
const flush: () => Promise<unknown> = (): Promise<unknown> =>
  new Promise((resolve) => setTimeout(resolve));

/**
 * Function stubWidth
 *
 * @description
 * Replaces `matchMedia` with a query of the given width class whose change listener can be fired.
 *
 * @param {boolean} matches - Whether the window starts narrow.
 *
 * @returns {FakeMediaQuery} Query state shared with the stub.
 */
function stubWidth(matches: boolean): FakeMediaQuery {
  const query: FakeMediaQuery = { matches, listener: null };
  vi.stubGlobal('matchMedia', (media: string) => ({
    media,
    get matches(): boolean {
      return query.matches;
    },
    addEventListener: (_: string, callback: (event: { matches: boolean }) => void): void => {
      query.listener = callback;
    },
    removeEventListener: (): void => {
      query.listener = null;
    },
  }));
  return query;
}

/**
 * Function measureGroup
 *
 * @description
 * Gives the resizable group a measured width; every other element measures 0 as in jsdom.
 *
 * @param {number} width - Group width in pixels.
 */
function measureGroup(width: number): void {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ): DOMRect {
    return this.getAttribute('data-slot') === 'resizable-panel-group'
      ? new DOMRect(0, 0, width, 900)
      : new DOMRect(0, 0, 0, 0);
  });
}

/**
 * Component PageComponent
 * @class PageComponent
 *
 * @description
 * Routed page whose 48 px bar places the sidebar trigger, as the feature pages do.
 */
@Component({
  imports: [SidebarTriggerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<header><ui-sidebar-trigger class="-ml-2" /><span>Projets</span></header>`,
})
class PageComponent {}

/**
 * Function setup
 *
 * @description
 * Renders the admin layout with its owner ports over a test HTTP backend and answers the first
 * unread count.
 *
 * @param {Routes} routes - Routes added to the login one.
 * @param {Provider[]} providers - Extra providers, such as the build's `LOCALE_ID`.
 * @returns Fixture, root element and HTTP backend.
 */
async function setup(
  routes: Routes = [],
  providers: Provider[] = [],
): Promise<{
  backend: HttpTestingController;
  fixture: ComponentFixture<AdminLayoutComponent>;
  root: HTMLElement;
}> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'admin/login', children: [] }, ...routes]),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideAdminInboxSummary(),
      provideAdminProjectNavigation(),
      provideAdminSession(),
      ...providers,
    ],
  });
  const backend: HttpTestingController =
    TestBed.inject<HttpTestingController>(HttpTestingController);
  const fixture: ComponentFixture<AdminLayoutComponent> =
    TestBed.createComponent(AdminLayoutComponent);
  backend
    .expectOne((r) => r.url === '/api/contact/admin/messages')
    .flush({ member: [], totalItems: 0 });
  await fixture.whenStable();
  return { backend, fixture, root: fixture.nativeElement as HTMLElement };
}

/**
 * Function press
 *
 * @description
 * Dispatches a cancelable key press that bubbles up to the window.
 *
 * @param {string} key - Produced key.
 * @param {KeyboardEventInit} init - Modifiers.
 * @param {EventTarget} target - Element the key is typed in.
 *
 * @returns {KeyboardEvent} The dispatched event.
 */
function press(
  key: string,
  init: KeyboardEventInit = {},
  target: EventTarget = window,
): KeyboardEvent {
  const event: KeyboardEvent = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

/**
 * Function transitionEnd
 *
 * @description
 * Dispatches the end of a transition on an element (jsdom has no `TransitionEvent`).
 *
 * @param {Element} target - Element whose transition ended.
 * @param {string} propertyName - Longhand property that finished.
 */
function transitionEnd(target: Element, propertyName: string): void {
  const event: Event = new Event('transitionend', { bubbles: true });
  Object.defineProperty(event, 'propertyName', { value: propertyName });
  target.dispatchEvent(event);
}

/**
 * Function openPage
 *
 * @description
 * Renders the layout with a routed page holding a sidebar trigger and returns its button.
 *
 * @returns Fixture, root element and the page's trigger button, absent when unavailable.
 */
async function openPage(): Promise<{
  fixture: ComponentFixture<AdminLayoutComponent>;
  root: HTMLElement;
  trigger: () => HTMLButtonElement | null;
}> {
  const { fixture, root } = await setup([{ path: 'admin/projects', component: PageComponent }]);
  await TestBed.inject(Router).navigateByUrl('/admin/projects');
  await fixture.whenStable();
  return {
    fixture,
    root,
    trigger: (): HTMLButtonElement | null =>
      root.querySelector<HTMLButtonElement>('main ui-sidebar-trigger button'),
  };
}

/**
 * Function help
 *
 * @description
 * Finds the open keyboard shortcuts dialog.
 *
 * @returns {HTMLElement | undefined} The dialog panel, if open.
 */
function help(): HTMLElement | undefined {
  return [...document.querySelectorAll<HTMLElement>('[data-slot="dialog-content"]')].find((panel) =>
    panel.textContent?.includes('Raccourcis clavier'),
  );
}

/**
 * Function watchNavigation
 *
 * @description
 * Gives the layout a document whose `location.assign` is recorded (jsdom's own is not configurable)
 * and otherwise forwards to the real document, its methods bound to it.
 *
 * @returns {string[]} Addresses the layout loaded, in order.
 */
function watchNavigation(): string[] {
  const loaded: string[] = [];
  const location: Pick<Location, 'assign'> = {
    assign: (url: string | URL): void => {
      loaded.push(String(url));
    },
  };
  const proxy: Document = new Proxy<Document>(document, {
    get: (target: Document, property: string | symbol): unknown => {
      if (property === 'location') return location;
      const value: unknown = Reflect.get(target, property);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  TestBed.overrideComponent(AdminLayoutComponent, {
    add: { providers: [{ provide: DOCUMENT, useValue: proxy }] },
  });
  return loaded;
}

/**
 * Function languageMenu
 *
 * @description
 * Opens the sidebar's « Langue » menu and returns its trigger and radio items.
 *
 * @param {ComponentFixture<AdminLayoutComponent>} fixture - Rendered layout.
 * @param {HTMLElement} root - Layout element.
 * @returns Trigger button and the menu's radio items.
 */
async function languageMenu(
  fixture: ComponentFixture<AdminLayoutComponent>,
  root: HTMLElement,
): Promise<{ trigger: HTMLButtonElement | undefined; items: HTMLElement[] }> {
  const trigger: HTMLButtonElement | undefined = [
    ...root.querySelectorAll<HTMLButtonElement>('aside button'),
  ].find((button) => button.getAttribute('aria-label')?.startsWith('Langue'));
  trigger?.click();
  await fixture.whenStable();
  return { trigger, items: [...document.querySelectorAll<HTMLElement>('[role="menuitemradio"]')] };
}

/**
 * Function siteLink
 *
 * @description
 * Finds the sidebar entry opening the public site in a new tab.
 *
 * @param {HTMLElement} root - Layout element.
 * @returns {HTMLAnchorElement | undefined} The « Voir le site » link.
 */
function siteLink(root: HTMLElement): HTMLAnchorElement | undefined {
  return [...root.querySelectorAll<HTMLAnchorElement>('aside a[target="_blank"]')].find((link) =>
    link.textContent?.includes('Voir le site'),
  );
}

describe('AdminLayoutComponent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('starts the sidebar at its stored width in pixels behind a separator inside it', async () => {
    localStorage.setItem('portfolio.admin.layout.sidebar', '264');
    measureGroup(1440);
    const { root } = await setup();
    const aside: HTMLElement | null = root.querySelector('aside');
    const main: HTMLElement | null = root.querySelector('main');
    const handle: HTMLElement | null = root.querySelector('ui-resizable-handle');
    expect(Number.parseFloat(aside?.style.flex ?? '')).toBeCloseTo((264 / 1440) * 100, 5);
    expect(Number.parseFloat(main?.style.flex ?? '')).toBeCloseTo((1176 / 1440) * 100, 5);
    expect(handle?.getAttribute('role')).toBe('separator');
    expect(handle?.getAttribute('aria-label')).toBe('Redimensionner la barre latérale');
    expect(handle?.getAttribute('aria-controls')).toBe(aside?.id);
    // Inside the complementary landmark, along its end edge (axe region rule).
    expect(handle?.parentElement).toBe(aside);
    expect(handle?.classList).toContain('end-0');
    expect(handle?.getAttribute('aria-valuenow')).toBe('18');
    expect(handle?.getAttribute('aria-valuemin')).toBe('14');
    expect(handle?.getAttribute('aria-valuemax')).toBe('25');
    expect(handle?.className).toContain('bg-border');
    expect(handle?.className).toContain('focus-visible:outline-accent/55');
    expect(handle?.className).not.toContain('outline-fg');
    // The page keeps the document scroll, so its sticky title bars still stick.
    expect(main?.className).toContain('overflow-visible');
    expect(main?.className).not.toContain('overflow-hidden');
  });

  it('falls back to 232 px for a percentage layout stored before or an out-of-bounds width', async () => {
    localStorage.setItem('portfolio.admin.layout.sidebar', '[20,80]');
    const { root } = await setup();
    // Not measured (jsdom): the default lays out as a fixed basis.
    expect(root.querySelector<HTMLElement>('aside')?.style.flex).toBe('0 0 232px');
    TestBed.resetTestingModule();
    localStorage.setItem('portfolio.admin.layout.sidebar', '150');
    const again: Awaited<ReturnType<typeof setup>> = await setup();
    expect(again.root.querySelector<HTMLElement>('aside')?.style.flex).toBe('0 0 232px');
  });

  it('resizes the sidebar by 16 px steps within 200 to 360 px, remembers it and resets it', async () => {
    measureGroup(1440);
    const { fixture, root } = await setup();
    const handle: HTMLElement | null = root.querySelector('ui-resizable-handle');
    expect(press('ArrowRight', {}, handle ?? window).defaultPrevented).toBe(true);
    await fixture.whenStable();
    expect(localStorage.getItem('portfolio.admin.layout.sidebar')).toBe('248');

    press('End', {}, handle ?? window);
    await fixture.whenStable();
    expect(localStorage.getItem('portfolio.admin.layout.sidebar')).toBe('360');
    press('Home', {}, handle ?? window);
    await fixture.whenStable();
    expect(localStorage.getItem('portfolio.admin.layout.sidebar')).toBe('200');
    // At 200 px the search entry drops its key caps.
    expect(root.querySelector('aside button kbd')).toBeNull();

    handle?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await fixture.whenStable();
    expect(localStorage.getItem('portfolio.admin.layout.sidebar')).toBe('232');
    expect(root.querySelector('aside button kbd')?.textContent?.trim()).toBe('Ctrl K');
  });

  it('marks the document while mounted and spans the viewport, scrollbar given back as a margin', async () => {
    const html: HTMLElement = document.documentElement;
    // A window 10 px wider than the document: a 10 px classic scrollbar.
    vi.spyOn(html, 'clientWidth', 'get').mockReturnValue(window.innerWidth - 10);
    const { fixture, root } = await setup();
    expect(html.hasAttribute('data-admin')).toBe(true);
    expect(html.style.getPropertyValue('--admin-scrollbar')).toBe('10px');
    expect(fixture.nativeElement.className).toContain('w-screen');
    expect(root.querySelector('[data-slot="resizable-panel-group"]')?.className).toContain(
      'mr-(--admin-scrollbar)',
    );
    fixture.destroy();
    expect(html.hasAttribute('data-admin')).toBe(false);
    expect(html.style.getPropertyValue('--admin-scrollbar')).toBe('');
  });

  it('names the unread count with a real plural and retries failed sidebar loads with ghost buttons', async () => {
    const { backend, fixture, root } = await setup();
    const messages = (): HTMLAnchorElement | undefined =>
      [...root.querySelectorAll<HTMLAnchorElement>('nav a')].find((link) =>
        link.textContent?.includes('Messages'),
      );
    await TestBed.inject(Router).navigateByUrl('/admin/login');
    await fixture.whenStable();
    backend
      .expectOne((r) => r.url === '/api/contact/admin/messages')
      .flush({ member: [], totalItems: 1 });
    await flush();
    await fixture.whenStable();
    expect(messages()?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Messages 1 non lu');
    // A grey count, the figure alone (no dot), capped at 99+.
    expect(messages()?.querySelector('[data-slot="count-badge"]')?.className).toContain(
      'bg-surface-selected',
    );

    await TestBed.inject(Router).navigateByUrl('/admin/login?again');
    await fixture.whenStable();
    backend
      .expectOne((r) => r.url === '/api/contact/admin/messages')
      .flush(null, { status: 500, statusText: 'Server Error' });
    await flush();
    await fixture.whenStable();
    const retry: HTMLButtonElement | undefined = [
      ...root.querySelectorAll<HTMLButtonElement>('aside button'),
    ].find((button) => button.textContent?.trim() === 'Réessayer le compteur');
    // A catalogue ghost button; its tooltip, which names it in the rail, takes over its data-slot.
    expect(retry?.hasAttribute('uibtn')).toBe(true);
    expect(retry?.getAttribute('data-slot')).toBe('tooltip-trigger');
    expect(retry?.className).toContain('h-7');
  });

  it('skips to the page without changing the address', async () => {
    const { root } = await setup();
    const skip: HTMLAnchorElement | null = root.querySelector('a[href^="#ui-resizable-panel-"]');
    expect(skip?.textContent?.trim()).toBe('Aller au contenu');
    // Fixed and moved off-screen rather than sr-only: focused, it shows without moving the page.
    expect(skip?.className).toContain('fixed');
    expect(skip?.className).toContain('focus:translate-y-0');
    expect(skip?.className).not.toContain('not-sr-only');
    expect(skip?.compareDocumentPosition(root.querySelector('aside') as Node)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    const event: MouseEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    skip?.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(root.querySelector('main'));
    expect(skip?.getAttribute('href')).toBe(`#${root.querySelector('main')?.id}`);
  });

  it('renders no separator below the narrow breakpoint', async () => {
    const query: FakeMediaQuery = stubWidth(true);
    const { fixture, root } = await setup();
    expect(root.querySelector('ui-resizable-handle')).toBeNull();
    expect(root.querySelector('[uiResizablePanelGroup]')?.className).toContain(
      '@max-[1024px]:flex-col',
    );

    query.matches = false;
    query.listener?.({ matches: false });
    await fixture.whenStable();
    expect(root.querySelector('ui-resizable-handle')).not.toBeNull();
  });

  it('mounts one toaster and reports an unconfirmed logout in an error toast', async () => {
    const { backend, fixture, root } = await setup();
    const toasters: NodeListOf<Element> = document.querySelectorAll('[data-slot="toaster"]');
    expect(toasters).toHaveLength(1);
    expect(toasters[0]?.getAttribute('aria-label')).toBe('Notifications');
    expect(toasters[0]?.className).toContain('right-4');
    expect(root.querySelector('p[role="alert"]')).toBeNull();

    [...root.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('déconnecter'))
      ?.click();
    backend.expectOne('/api/auth/logout').flush(null, { status: 503, statusText: 'Unavailable' });
    await flush();
    await fixture.whenStable();
    const toast: Element | null = document.querySelector('[data-slot="toast"]');
    expect(toast?.getAttribute('data-type')).toBe('error');
    expect(toast?.getAttribute('role')).toBe('alert');
    expect(toast?.textContent).toContain('La déconnexion n’a pas été confirmée. Réessayez.');
    toast?.querySelector<HTMLButtonElement>('button[aria-label="Fermer la notification"]')?.click();
    await fixture.whenStable();
    expect(document.querySelector('[data-slot="toast"]')).toBeNull();
  });

  it('opens the keyboard shortcuts help on ? outside fields and dialogs, once', async () => {
    const { fixture } = await setup();
    const field: HTMLInputElement = document.body.appendChild(document.createElement('input'));
    expect(press('?', {}, field).defaultPrevented).toBe(false);
    field.remove();
    expect(press('?', { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(press('/').defaultPrevented).toBe(false);
    expect(help()).toBeUndefined();

    expect(press('?', { shiftKey: true }).defaultPrevented).toBe(true);
    await fixture.whenStable();
    const panel: HTMLElement | undefined = help();
    expect(panel?.getAttribute('role')).toBe('dialog');
    expect(panel?.querySelector('h2')?.textContent?.trim()).toBe('Raccourcis clavier');
    const rows: string[] = [...(panel?.querySelectorAll('dl > div') ?? [])].map(
      (row) => row.querySelector('dt')?.textContent?.trim() ?? '',
    );
    expect(rows).toEqual([
      'Ouvrir la palette de commandes',
      'Afficher cette aide',
      'Réduire ou déployer la barre latérale',
      'Enregistrer un projet',
      'Paragraphe',
      'Titre 2',
      'Titre 3',
      'Gras',
      'Italique',
      'Code',
      'Liste à puces',
      'Liste numérotée',
      'Citation',
      'Bloc de code',
      'Annuler',
      'Rétablir',
      'Naviguer entre les messages',
      'Archiver',
    ]);
    // One tab per context, opening on the shell-wide keys; only the editor tab, with two groups,
    // names them.
    expect(
      [...(panel?.querySelectorAll('[role="tab"]') ?? [])].map((tab) => tab.textContent?.trim()),
    ).toEqual(['Général', 'Édition', 'Messages']);
    expect(panel?.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim()).toBe(
      'Général',
    );
    expect([...(panel?.querySelectorAll('h3') ?? [])].map((h3) => h3.textContent)).toEqual([
      'Projets',
      'Article',
    ]);
    const caps = (index: number): (string | null)[] =>
      [...(panel?.querySelectorAll('dd')[index]?.querySelectorAll('kbd') ?? [])].map(
        (kbd) => kbd.textContent,
      );
    // Only the platform's modifier: Ctrl outside Apple platforms.
    expect(caps(0)).toEqual(['Ctrl', 'K']);
    expect(panel?.querySelectorAll('dd')[0]?.querySelector('.sr-only')?.textContent).toBe(
      'Contrôle K',
    );
    // The article editor's shortcuts, as its toolbar tooltips name them.
    expect(caps(10)).toEqual(['Ctrl', 'Maj', '8']);
    expect(panel?.querySelectorAll('dd')[10]?.querySelector('.sr-only')?.textContent).toBe(
      'Contrôle Majuscule 8',
    );
    expect(caps(2)).toEqual(['[']);
    expect(panel?.querySelectorAll('dd')[2]?.querySelector('.sr-only')?.textContent).toBe(
      'Crochet ouvrant',
    );
    const footer: Element | null | undefined = panel?.querySelector(
      ':scope > [data-slot="dialog-footer"]',
    );
    expect(footer?.getAttribute('data-variant')).toBe('bar');
    expect(
      [...(footer?.querySelectorAll('[data-slot="kbd-hint"] .sr-only') ?? [])].map(
        (hint) => hint.textContent,
      ),
    ).toEqual(['Échap : Fermer']);
    expect(panel?.className).toContain('[--dialog-inset:--spacing(6)]');
    expect(panel?.className).toContain('max-w-lg');
    const header: Element | null | undefined = panel?.querySelector(
      ':scope > [data-slot="dialog-header"]',
    );
    expect(header?.getAttribute('data-variant')).toBe('bar');
    expect(header?.querySelector('h2')?.textContent?.trim()).toBe('Raccourcis clavier');

    // Neither a ? typed inside the open help nor one from the page stacks a second help.
    const close: HTMLButtonElement | null | undefined = panel?.querySelector<HTMLButtonElement>(
      'button[data-slot="dialog-close"]',
    );
    expect(press('?', {}, close ?? window).defaultPrevented).toBe(false);
    press('?');
    await fixture.whenStable();
    expect(document.querySelectorAll('[data-slot="dialog-content"]')).toHaveLength(1);
    expect(close?.getAttribute('aria-label')).toBe('Fermer');
    close?.click();
    await flush();
    await fixture.whenStable();
    expect(help()).toBeUndefined();
  });

  it('lists the security page last in the sidebar and in the palette', async () => {
    const { backend, fixture, root } = await setup();
    const entries: HTMLAnchorElement[] = [
      ...root.querySelectorAll<HTMLAnchorElement>('nav[aria-label="Administration"] a'),
    ];
    expect(entries.map((entry) => entry.textContent?.trim())).toEqual([
      'Tableau de bord',
      'Projets',
      'Expériences',
      'Formations',
      'Informations',
      'Légal',
      'Messages',
      'Sécurité',
    ]);
    expect(entries.map((entry) => entry.getAttribute('href'))).toEqual([
      '/admin/dashboard',
      '/admin/projects',
      '/admin/experiences',
      '/admin/education',
      '/admin/information',
      '/admin/legal',
      '/admin/messages',
      '/admin/security',
    ]);
    expect(entries[0]?.querySelector('ng-icon')).not.toBeNull();
    expect(entries[7]?.querySelector('ng-icon')).not.toBeNull();

    press('k', { ctrlKey: true });
    backend.expectOne('/api/content/admin/projects').flush({ member: [], totalItems: 0 });
    await flush();
    await fixture.whenStable();
    const security: HTMLElement | undefined = [
      ...document.querySelectorAll<HTMLElement>('[role="option"]'),
    ].find((option) => option.textContent?.trim() === 'Sécurité');
    expect(security?.querySelector('ng-icon')).not.toBeNull();
  });

  it('recalls the palette keys in a footer bar under the list, flush with the panel', async () => {
    const { backend, fixture } = await setup();
    press('k', { ctrlKey: true });
    backend.expectOne('/api/content/admin/projects').flush({ member: [], totalItems: 0 });
    await flush();
    await fixture.whenStable();
    const panel: HTMLElement | null = document.querySelector('[aria-label="Palette de commandes"]');
    expect(panel?.className).toContain('[--dialog-inset:0px]');
    expect(panel?.className).toContain('sm:[--dialog-inset:0px]');
    expect(panel?.className).not.toContain('sm:[--dialog-inset:--spacing(8)]');
    // Anchored 15vh from the top, so that a shrinking result list never moves the input.
    expect(panel?.closest<HTMLElement>('.cdk-overlay-pane')?.style.marginTop).toBe('15vh');
    expect(panel?.querySelector('[data-slot="command-list"]')?.className).toContain(
      'max-h-[min(32rem,60dvh)]',
    );
    // The search row is the palette's header bar: same height, one hairline above the list.
    const search: Element | null | undefined = panel?.querySelector('ui-command-input');
    expect(search?.className).toContain('min-h-13');
    expect(search?.className).toContain('border-b');
    expect(panel?.querySelector('[data-slot="command-list"]')?.className).not.toContain('border-t');
    const footer: Element | null | undefined = panel?.querySelector(
      'ui-command + [data-slot="dialog-footer"]',
    );
    expect(footer?.getAttribute('data-variant')).toBe('bar');
    const hints: HTMLElement[] = [
      ...(footer?.querySelectorAll<HTMLElement>('[data-slot="kbd-hint"]') ?? []),
    ];
    expect(hints.map((hint) => hint.querySelector('.sr-only')?.textContent)).toEqual([
      'Flèches haut et bas : Naviguer',
      'Entrée : Ouvrir',
      'Échap : Fermer',
      'Point d’interrogation : Raccourcis',
    ]);
    expect(
      [...(hints[0]?.querySelectorAll('kbd[data-slot="kbd"]') ?? [])].map((kbd) => kbd.textContent),
    ).toEqual(['↑', '↓']);
    expect(hints[3]?.className).toContain('ml-auto');
    // Keyboard hints only: hidden on narrow, touch-first screens.
    expect(footer?.className).toContain('max-sm:hidden');
    // The hints add no tab stop: focus stays in the search field.
    expect(footer?.querySelector('button, a, [tabindex]')).toBeNull();
  });

  it('opens the keyboard shortcuts help from the command palette', async () => {
    const { backend, fixture } = await setup();
    press('k', { ctrlKey: true });
    backend.expectOne('/api/content/admin/projects').flush({ member: [], totalItems: 0 });
    await flush();
    await fixture.whenStable();
    [...document.querySelectorAll<HTMLElement>('[role="option"]')]
      .find((option) => option.textContent?.trim() === 'Raccourcis clavier')
      ?.click();
    await flush();
    await fixture.whenStable();
    expect(document.querySelector('[aria-label="Palette de commandes"]')).toBeNull();
    expect(help()).toBeDefined();
    TestBed.inject<HttpTestingController>(HttpTestingController).verify();
  });

  it('names the icon-only sidebar entries in tooltips on narrow screens only', async () => {
    const query: FakeMediaQuery = stubWidth(true);
    const { fixture, root } = await setup();
    const entry: (label: string) => HTMLElement | undefined = (
      label: string,
    ): HTMLElement | undefined =>
      [...root.querySelectorAll<HTMLElement>('aside a, aside button')].find((element) =>
        element.textContent?.includes(label),
      );
    const tip: (element: HTMLElement | undefined) => Promise<string | null> = async (
      element: HTMLElement | undefined,
    ): Promise<string | null> => {
      element?.dispatchEvent(new FocusEvent('focusin'));
      await fixture.whenStable();
      const text: string | null =
        document.querySelector('[role="tooltip"]')?.firstChild?.textContent?.trim() ?? null;
      element?.dispatchEvent(new FocusEvent('focusout'));
      await fixture.whenStable();
      return text;
    };

    expect(await tip(entry('Rechercher'))).toBe('Rechercher');
    entry('Rechercher')?.dispatchEvent(new FocusEvent('focusin'));
    await fixture.whenStable();
    expect(
      [...document.querySelectorAll('[role="tooltip"] kbd')].map((kbd) => kbd.textContent),
    ).toEqual(['Ctrl', 'K']);
    entry('Rechercher')?.dispatchEvent(new FocusEvent('focusout'));
    await fixture.whenStable();
    expect(await tip(entry('Voir le site'))).toBe('Voir le site');
    expect(await tip(entry('Se déconnecter'))).toBe('Se déconnecter');

    query.matches = false;
    query.listener?.({ matches: false });
    await fixture.whenStable();
    expect(await tip(entry('Se déconnecter'))).toBeNull();

    fixture.destroy();
    expect(query.listener).toBeNull();
  });

  it('collapses the sidebar to a 56 px rail from the page trigger and back to its width', async () => {
    localStorage.setItem('portfolio.admin.layout.sidebar', '264');
    measureGroup(1440);
    const { fixture, root, trigger } = await openPage();
    const aside: HTMLElement = root.querySelector('aside') as HTMLElement;
    const flex: string = aside.style.flex;
    expect(trigger()?.getAttribute('aria-label')).toBe('Réduire la barre latérale');
    expect(trigger()?.getAttribute('aria-expanded')).toBe('true');
    expect(trigger()?.getAttribute('aria-controls')).toBe(aside.id);
    // Expanded, the separator draws the same hairline the rail keeps.
    const handle: Element | null = root.querySelector('ui-resizable-handle');
    for (const hairline of ['absolute', 'inset-y-0', 'end-0', 'w-px', 'bg-border']) {
      expect(handle?.classList).toContain(hairline);
    }
    expect(trigger()?.getAttribute('aria-keyshortcuts')).toBe('[');
    expect(aside.hasAttribute('data-collapsed')).toBe(false);
    // The width animates with the duration tokens, never under reduced motion.
    expect(aside.className).toContain('data-collapsed:flex-[0_0_56px]!');
    expect(aside.className).toContain('motion-safe:data-transitioning:transition-[flex]');
    expect(aside.className).toContain('motion-safe:data-transitioning:duration-(--dur-roll)');

    trigger()?.click();
    await fixture.whenStable();
    expect(aside.hasAttribute('data-collapsed')).toBe(true);
    expect(aside.hasAttribute('data-transitioning')).toBe(true);
    expect(root.querySelector('ui-resizable-handle')).toBeNull();
    // The rail keeps the separator's hairline: 1 px of border colour on the end edge, inside.
    for (const hairline of [
      'data-collapsed:after:absolute',
      'data-collapsed:after:inset-y-0',
      'data-collapsed:after:end-0',
      'data-collapsed:after:w-px',
      'data-collapsed:after:bg-border',
    ]) {
      expect(aside.classList).toContain(hairline);
    }
    expect(localStorage.getItem('portfolio.admin.layout.sidebar-collapsed')).toBe('true');
    expect(trigger()?.getAttribute('aria-label')).toBe('Déployer la barre latérale');
    expect(trigger()?.getAttribute('aria-expanded')).toBe('false');
    // The group keeps the stored width under the rail's important basis.
    expect(aside.style.flex).toBe(flex);

    // An entry's colour transition bubbling up does not end the sidebar's.
    transitionEnd(aside.querySelector('nav a') as Element, 'background-color');
    transitionEnd(aside, 'flex-grow');
    await fixture.whenStable();
    expect(aside.hasAttribute('data-transitioning')).toBe(true);
    transitionEnd(aside, 'flex-basis');
    await fixture.whenStable();
    expect(aside.hasAttribute('data-transitioning')).toBe(false);

    trigger()?.click();
    await fixture.whenStable();
    expect(aside.hasAttribute('data-collapsed')).toBe(false);
    expect(root.querySelector('ui-resizable-handle')).not.toBeNull();
    expect(aside.style.flex).toBe(flex);
    expect(localStorage.getItem('portfolio.admin.layout.sidebar-collapsed')).toBe('false');
    expect(trigger()?.getAttribute('aria-expanded')).toBe('true');
  });

  it('starts collapsed only from a stored true', async () => {
    localStorage.setItem('portfolio.admin.layout.sidebar-collapsed', 'true');
    const { root } = await setup();
    expect(root.querySelector('aside')?.hasAttribute('data-collapsed')).toBe(true);
    expect(root.querySelector('ui-resizable-handle')).toBeNull();
    TestBed.resetTestingModule();
    localStorage.setItem('portfolio.admin.layout.sidebar-collapsed', '"yes"');
    const again: Awaited<ReturnType<typeof setup>> = await setup();
    expect(again.root.querySelector('aside')?.hasAttribute('data-collapsed')).toBe(false);
  });

  it('toggles the sidebar on [ outside fields and dialogs, AltGr included', async () => {
    const { fixture, root } = await setup();
    const aside: HTMLElement = root.querySelector('aside') as HTMLElement;
    const field: HTMLInputElement = document.body.appendChild(document.createElement('input'));
    expect(press('[', {}, field).defaultPrevented).toBe(false);
    field.remove();
    const editor: HTMLElement = document.body.appendChild(document.createElement('div'));
    editor.setAttribute('contenteditable', '');
    expect(press('[', {}, editor).defaultPrevented).toBe(false);
    editor.remove();
    expect(press('[', { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(press('[', { metaKey: true }).defaultPrevented).toBe(false);
    expect(press('[', { repeat: true }).defaultPrevented).toBe(false);
    await fixture.whenStable();
    expect(aside.hasAttribute('data-collapsed')).toBe(false);

    expect(press('[').defaultPrevented).toBe(true);
    await fixture.whenStable();
    expect(aside.hasAttribute('data-collapsed')).toBe(true);
    // AltGr+5 on a French Windows keyboard reports Ctrl and Alt.
    expect(
      press('[', { ctrlKey: true, altKey: true, modifierAltGraph: true }).defaultPrevented,
    ).toBe(true);
    await fixture.whenStable();
    expect(aside.hasAttribute('data-collapsed')).toBe(false);
  });

  it('shows the rail as icons named in tooltips beside it, the unread count on the icon', async () => {
    localStorage.setItem('portfolio.admin.layout.sidebar-collapsed', 'true');
    const { backend, fixture, root } = await setup();
    await TestBed.inject(Router).navigateByUrl('/admin/login');
    await fixture.whenStable();
    backend
      .expectOne((r) => r.url === '/api/contact/admin/messages')
      .flush({ member: [], totalItems: 3 });
    await flush();
    await fixture.whenStable();
    const entry = (label: string): HTMLElement | undefined =>
      [...root.querySelectorAll<HTMLElement>('aside a, aside button')].find((element) =>
        element.textContent?.includes(label),
      );
    const tip = async (element: HTMLElement | undefined): Promise<Element | null> => {
      element?.dispatchEvent(new FocusEvent('focusin'));
      await fixture.whenStable();
      const bubble: Element | null = document.querySelector('[role="tooltip"]');
      const text: Element | null = bubble ? (bubble.cloneNode(true) as Element) : null;
      element?.dispatchEvent(new FocusEvent('focusout'));
      await fixture.whenStable();
      return text;
    };
    const aside: HTMLElement = root.querySelector('aside') as HTMLElement;
    expect(aside.className).toContain('group/sidebar');
    // Labels stay the accessible names, hidden visually in the rail.
    const label: HTMLElement | null | undefined = entry('Projets')?.querySelector('span');
    expect(label?.className).toContain('group-data-collapsed/sidebar:sr-only');
    expect(entry('Rechercher')?.querySelector('kbd')?.className).toContain(
      'group-data-collapsed/sidebar:hidden',
    );
    for (const name of ['Valentin Fortin', 'Rechercher', 'Projets', 'Messages', 'Voir le site']) {
      const bubble: Element | null = await tip(entry(name));
      expect(bubble?.firstChild?.textContent?.trim()).toBe(name);
    }
    const messages: HTMLElement | undefined = entry('Messages');
    expect(messages?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Messages 3 non lus');
    const badge: Element | null | undefined = messages?.querySelector('[data-slot="count-badge"]');
    expect(badge?.classList.contains('bg-surface-selected')).toBe(true);
    expect(badge?.className).toContain('group-data-collapsed/sidebar:absolute');

    // Expanded, the entries keep their visible labels and no tooltip.
    press('[');
    await fixture.whenStable();
    expect(await tip(entry('Projets'))).toBeNull();
    expect(badge?.textContent?.replace(/\s+/g, ' ').trim()).toBe('3 non lus');
  });

  it('keeps the top bar below 1024 px, where the trigger and [ do nothing', async () => {
    localStorage.setItem('portfolio.admin.layout.sidebar-collapsed', 'true');
    const query: FakeMediaQuery = stubWidth(true);
    const { fixture, root, trigger } = await openPage();
    const aside: HTMLElement = root.querySelector('aside') as HTMLElement;
    expect(aside.hasAttribute('data-collapsed')).toBe(false);
    expect(trigger()).toBeNull();
    expect(root.querySelector('main ui-sidebar-trigger')?.className).toContain('hidden');
    expect(press('[').defaultPrevented).toBe(false);
    expect(localStorage.getItem('portfolio.admin.layout.sidebar-collapsed')).toBe('true');

    query.matches = false;
    query.listener?.({ matches: false });
    await fixture.whenStable();
    expect(aside.hasAttribute('data-collapsed')).toBe(true);
    expect(trigger()?.getAttribute('aria-label')).toBe('Déployer la barre latérale');
  });

  it('opens the chosen theme from the theme menu trigger, as on the public pages', async () => {
    const { fixture, root } = await setup([]);
    const set: MockInstance<ThemeService['set']> = vi
      .spyOn(TestBed.inject(ThemeService), 'set')
      .mockImplementation(() => undefined);
    const trigger: HTMLButtonElement | undefined = [
      ...root.querySelectorAll<HTMLButtonElement>('aside button'),
    ].find((button) => button.getAttribute('aria-label')?.startsWith('Thème'));
    trigger?.click();
    await fixture.whenStable();
    const light: HTMLElement | undefined = [
      ...document.querySelectorAll<HTMLElement>('[role="menuitemradio"]'),
    ].find((item) => item.textContent?.trim() === 'Clair');
    light?.click();
    await fixture.whenStable();
    expect(set).toHaveBeenCalledWith('light', trigger);
  });

  it('offers the languages beside the theme, named in their own language with their flag', async () => {
    const { fixture, root } = await setup([], [{ provide: LOCALE_ID, useValue: 'fr' }]);
    const { trigger, items } = await languageMenu(fixture, root);
    expect(trigger?.getAttribute('aria-label')).toBe('Langue : Français');
    expect(trigger?.textContent?.trim()).toBe('Langue');
    expect(trigger?.previousElementSibling?.getAttribute('aria-label')).toMatch(/^Thème : /);
    expect(trigger?.querySelector('ng-icon')).not.toBeNull();
    expect(items.map((item) => item.textContent?.trim())).toEqual(['Français', 'English']);
    expect(items.map((item) => item.getAttribute('lang'))).toEqual(['fr', 'en']);
    expect(items.map((item) => item.getAttribute('aria-checked'))).toEqual(['true', 'false']);
    expect(items.every((item) => item.querySelector('ng-icon') !== null)).toBe(true);
    // The public site opens in the administration's language.
    expect(siteLink(root)?.getAttribute('href')).toBe('/fr/');
  });

  it('loads the same admin address from the English build, and nothing for the current one', async () => {
    const loaded: string[] = watchNavigation();
    const { fixture, root } = await setup(
      [{ path: 'admin/projects', component: PageComponent }],
      [{ provide: LOCALE_ID, useValue: 'fr' }],
    );
    await TestBed.inject(Router).navigateByUrl('/admin/projects?statut=publie');
    await fixture.whenStable();
    let { items } = await languageMenu(fixture, root);
    items[0]?.click();
    await fixture.whenStable();
    expect(loaded).toEqual([]);

    ({ items } = await languageMenu(fixture, root));
    items[1]?.click();
    await fixture.whenStable();
    expect(loaded).toEqual(['/en/admin/projects?statut=publie']);
  });

  it('goes back to the French build from /en/admin, the site link following the language', async () => {
    const loaded: string[] = watchNavigation();
    const { fixture, root } = await setup(
      [{ path: 'admin/messages', children: [] }],
      [{ provide: LOCALE_ID, useValue: 'en' }],
    );
    await TestBed.inject(Router).navigateByUrl('/admin/messages');
    await fixture.whenStable();
    expect(siteLink(root)?.getAttribute('href')).toBe('/en/');
    const { trigger, items } = await languageMenu(fixture, root);
    // Source copy in tests; the English build reads "Language: English".
    expect(trigger?.getAttribute('aria-label')).toBe('Langue : English');
    expect(items.map((item) => item.getAttribute('aria-checked'))).toEqual(['false', 'true']);
    items[0]?.click();
    await fixture.whenStable();
    expect(loaded).toEqual(['/fr/admin/messages']);
  });
});
