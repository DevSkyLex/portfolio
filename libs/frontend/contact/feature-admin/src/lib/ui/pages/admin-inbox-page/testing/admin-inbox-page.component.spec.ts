import type { AdminMessageStatus, AdminMessage } from '@vfortin/contact-web-data-access';

import { registerLocaleData } from '@angular/common';
import { type HttpRequest, provideHttpClient } from '@angular/common/http';
import {
  type TestRequest,
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import localeFr from '@angular/common/locales/fr';
import { type EnvironmentProviders, type Provider, LOCALE_ID } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { type MockInstance } from 'vitest';
import { ToastService } from '@vfortin/ui';

import { AdminInboxPageComponent } from '@internal/contact-web-feature-admin/lib/ui/pages/admin-inbox-page/admin-inbox-page.component';

/**
 * Constant message
 *
 * @description
 * Received job inquiry shown by the inbox page tests before its status is changed.
 *
 * @type {AdminMessage}
 */
const message: AdminMessage = {
  id: 'm1',
  name: 'Camille Martin',
  company: 'Atelier Nord',
  email: 'camille@exemple.fr',
  subject: 'job',
  message: 'Bonjour,\nnous recrutons.',
  locale: 'fr',
  status: 'received',
  receivedAt: '2026-11-02T10:00:00.000Z',
  purgeAt: '2029-11-02T10:00:00.000Z',
  version: 1,
};

/**
 * Function flush
 *
 * @description
 * Advances a timer turn so the inbox's asynchronous store updates can settle in the fixture.
 *
 * @returns {Promise<void>} Resolves on the next timer turn.
 */
const flush: () => Promise<unknown> = (): Promise<unknown> =>
  new Promise((resolve) => setTimeout(resolve));

// The French source build: dates and plurals follow its locale data.
registerLocaleData(localeFr);

/**
 * Constant PROVIDERS
 *
 * @description
 * French build locale, HTTP test backend and an empty router, whose root route carries the inbox
 * query parameters.
 */
const PROVIDERS: (EnvironmentProviders | Provider)[] = [
  { provide: LOCALE_ID, useValue: 'fr' },
  provideHttpClient(),
  provideHttpClientTesting(),
  provideRouter([]),
];

/**
 * Interface Page
 * @interface Page
 *
 * @description
 * Rendered inbox page with its HTTP backend and a helper settling the fixture.
 */
interface Page {
  // #region Properties
  /**
   * Property backend
   * @readonly
   *
   * @description
   * HTTP test backend.
   */
  readonly backend: HttpTestingController;

  /**
   * Property fixture
   * @readonly
   *
   * @description
   * Fixture of the page.
   */
  readonly fixture: ComponentFixture<AdminInboxPageComponent>;

  /**
   * Property root
   * @readonly
   *
   * @description
   * Page element.
   */
  readonly root: HTMLElement;

  /**
   * Property settle
   * @readonly
   *
   * @description
   * Lets the store and the router settle, then renders.
   */
  readonly settle: () => Promise<void>;
  // #endregion
}

/**
 * Function render
 *
 * @description
 * Creates the inbox page in the configured test module.
 *
 * @returns {Page} Page root, HTTP test backend and settle helper.
 */
function render(): Page {
  const backend: HttpTestingController =
    TestBed.inject<HttpTestingController>(HttpTestingController);
  const fixture: ComponentFixture<AdminInboxPageComponent> =
    TestBed.createComponent(AdminInboxPageComponent);
  const settle: () => Promise<void> = async (): Promise<void> => {
    await flush();
    await fixture.whenStable();
  };
  return { backend, fixture, root: fixture.nativeElement as HTMLElement, settle };
}

/**
 * Function setup
 *
 * @description
 * Renders the inbox page on a bare URL.
 *
 * @returns {Page} Page root, HTTP test backend and settle helper.
 */
function setup(): Page {
  TestBed.configureTestingModule({ providers: PROVIDERS });
  return render();
}

/**
 * Function setupAt
 *
 * @description
 * Navigates to a URL first, as a reload or Back does, then renders the inbox page there.
 *
 * @param {string} url - URL with the inbox query parameters.
 *
 * @returns {Promise<Page>} Page root, HTTP test backend and settle helper.
 */
async function setupAt(url: string): Promise<Page> {
  TestBed.configureTestingModule({ providers: PROVIDERS });
  await TestBed.inject<Router>(Router).navigateByUrl(url);
  return render();
}

/**
 * Function list
 *
 * @description
 * Matches the inbox collection request for a status filter and a page.
 *
 * @param {string | null} status - Expected status filter, `null` when omitted.
 * @param {number} page - Expected one-based page.
 *
 * @returns Request matcher for `HttpTestingController`.
 */
const list: (status: string | null, page?: number) => (request: HttpRequest<unknown>) => boolean =
  (status: string | null, page = 1): ((request: HttpRequest<unknown>) => boolean) =>
  (request: HttpRequest<unknown>) =>
    request.url === '/api/contact/admin/messages' &&
    request.params.get('status') === status &&
    request.params.get('page') === String(page) &&
    request.params.get('pageSize') === '20';

/**
 * Function count
 *
 * @description
 * Matches the one-row request counting the messages of every status for the heading.
 *
 * @param {HttpRequest<unknown>} request - Pending request.
 *
 * @returns {boolean} Whether it is the overall count.
 */
const count: (request: HttpRequest<unknown>) => boolean = (request: HttpRequest<unknown>) =>
  request.url === '/api/contact/admin/messages' &&
  !request.params.has('status') &&
  request.params.get('pageSize') === '1';

/**
 * Interface ToastSpies
 * @interface ToastSpies
 *
 * @description
 * Spies on the toast kinds the inbox reports its write outcomes with.
 */
interface ToastSpies {
  // #region Properties
  /**
   * Property success
   * @readonly
   *
   * @description
   * Spy on `ToastService.success`.
   */
  readonly success: MockInstance<ToastService['success']>;

  /**
   * Property warning
   * @readonly
   *
   * @description
   * Spy on `ToastService.warning`.
   */
  readonly warning: MockInstance<ToastService['warning']>;

  /**
   * Property error
   * @readonly
   *
   * @description
   * Spy on `ToastService.error`.
   */
  readonly error: MockInstance<ToastService['error']>;
  // #endregion
}

/**
 * Function spyToasts
 *
 * @description
 * Spies on the root toast service of the current test injector.
 *
 * @returns {ToastSpies} Success, warning and error spies.
 */
function spyToasts(): ToastSpies {
  const toasts: ToastService = TestBed.inject<ToastService>(ToastService);
  return {
    success: vi.spyOn(toasts, 'success'),
    warning: vi.spyOn(toasts, 'warning'),
    error: vi.spyOn(toasts, 'error'),
  };
}

/**
 * Interface FakeMediaQuery
 * @interface FakeMediaQuery
 *
 * @description
 * Narrow layout query answered by the stubbed `matchMedia`, with the listener the page registered.
 */
interface FakeMediaQuery {
  // #region Properties
  /**
   * Property listener
   *
   * @description
   * Change listener registered by the page, `null` once removed.
   *
   * @type {((event: { matches: boolean }) => void) | null}
   */
  listener: ((event: { matches: boolean }) => void) | null;
  // #endregion
}

/**
 * Function stubNarrow
 *
 * @description
 * Replaces `matchMedia` with a narrow-window query whose change listener can be fired.
 *
 * @returns {FakeMediaQuery} Query state shared with the stub.
 */
function stubNarrow(): FakeMediaQuery {
  const query: FakeMediaQuery = { listener: null };
  vi.stubGlobal('matchMedia', (media: string) => ({
    media,
    matches: true,
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

describe('AdminInboxPageComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('opens the list at its stored width in pixels beside the reading pane', async () => {
    localStorage.setItem('portfolio.admin.layout.inbox', '400');
    measureGroup(1440);
    const { backend, root, settle }: ReturnType<typeof setup> = setup();
    backend.expectOne(list(null)).flush({ member: [message], totalItems: 1 });
    await settle();
    const [listPane, readingPane] = [...root.querySelectorAll<HTMLElement>('[uiResizablePanel]')];
    const handle: HTMLElement | null = root.querySelector('ui-resizable-handle');
    expect(Number.parseFloat(listPane?.style.flex ?? '')).toBeCloseTo((400 / 1440) * 100, 5);
    expect(Number.parseFloat(readingPane?.style.flex ?? '')).toBeCloseTo((1040 / 1440) * 100, 5);
    expect(listPane?.querySelector('ul[aria-label="Tous les messages"]')).not.toBeNull();
    expect(readingPane?.querySelector('article')?.getAttribute('aria-label')).toBe(
      'Message de Camille Martin',
    );
    // Beside the list the reading pane is current, and its action bar sits on the page surface.
    expect(listPane?.querySelector('li button')?.getAttribute('aria-current')).toBe('true');
    const actions: Element | null | undefined = readingPane?.querySelector('article > div');
    expect(actions?.classList).toContain('bg-surface');
    expect(actions?.classList).not.toContain('bg-surface-raised');
    expect(handle?.getAttribute('role')).toBe('separator');
    expect(handle?.getAttribute('aria-label')).toBe('Redimensionner la liste des messages');
    expect(handle?.getAttribute('aria-valuenow')).toBe('28');
    // The list's 320 to 560 px bounds decide the reachable range at 1440 px.
    expect(handle?.getAttribute('aria-valuemin')).toBe('22');
    expect(handle?.getAttribute('aria-valuemax')).toBe('39');
    expect(handle?.className).toContain('focus-visible:outline-accent/55');
  });

  it('falls back to 380 px for a percentage layout stored before or an out-of-bounds width', async () => {
    localStorage.setItem('portfolio.admin.layout.inbox', '[40,60]');
    const { backend, root, settle }: ReturnType<typeof setup> = setup();
    backend.expectOne(list(null)).flush({ member: [message], totalItems: 1 });
    await settle();
    // Not measured (jsdom): the default lays out as a fixed basis.
    expect(root.querySelector<HTMLElement>('[uiResizablePanel]')?.style.flex).toBe('0 0 380px');
  });

  it('resizes the list by 16 px steps without moving through it, and remembers it', async () => {
    measureGroup(1440);
    const { backend, root, settle }: ReturnType<typeof setup> = setup();
    backend
      .expectOne(list(null))
      .flush({ member: [message, { ...message, id: 'm2', name: 'Hugo Lefèvre' }], totalItems: 2 });
    await settle();
    const handle: HTMLElement | null = root.querySelector('ui-resizable-handle');
    expect(press('ArrowLeft', {}, handle ?? window).defaultPrevented).toBe(true);
    await settle();
    expect(localStorage.getItem('portfolio.admin.layout.inbox')).toBe('364');
    expect(root.querySelector('article')?.getAttribute('aria-label')).toBe(
      'Message de Camille Martin',
    );

    handle?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle();
    expect(localStorage.getItem('portfolio.admin.layout.inbox')).toBe('380');
  });

  it('opens on every message and marks the one shown read after the reading delay, in place', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { backend, root, settle }: ReturnType<typeof setup> = setup();
    const toasts: ToastSpies = spyToasts();
    const first: TestRequest = backend.expectOne(list(null));
    expect(first.request.params.has('status')).toBe(false);
    first.flush({ member: [message], totalItems: 1, view: { page: 1, pageSize: 20 } });
    await settle();
    expect(root.textContent).toContain('Camille Martin');
    expect(root.textContent).toContain('Une offre de poste');
    // Marked read by being shown: no button for it.
    expect(
      [...root.querySelectorAll('button')].some((b) => b.textContent?.includes('Marquer comme lu')),
    ).toBe(false);

    await vi.advanceTimersByTimeAsync(900);
    backend.expectNone('/api/contact/admin/messages/m1/read');
    await vi.advanceTimersByTimeAsync(100);
    const call: TestRequest = backend.expectOne('/api/contact/admin/messages/m1/read');
    expect(call.request.method).toBe('POST');
    expect(call.request.headers.get('if-match')).toBe('"1"');
    call.flush({ ...message, status: 'read', version: 2 });
    await settle();
    // "Tous" keeps the message, with its new status, and does not reload.
    backend.expectNone(list(null));
    expect(root.querySelectorAll('li')).toHaveLength(1);
    expect(root.querySelector('li')?.textContent).not.toContain('Non lu');
    expect(root.querySelector('article dd [data-slot="badge"]')?.textContent?.trim()).toBe('Lu');
    expect(toasts.success).not.toHaveBeenCalled();
    expect(toasts.error).not.toHaveBeenCalled();
    // Once per message.
    await vi.advanceTimersByTimeAsync(2000);
    backend.expectNone('/api/contact/admin/messages/m1/read');
  });

  it('marks nothing while J and K pass over messages faster than the reading delay', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { backend, root, settle }: ReturnType<typeof setup> = setup();
    const second: AdminMessage = { ...message, id: 'm2', name: 'Hugo Lefèvre' };
    const read: AdminMessage = { ...message, id: 'm3', name: 'Inès Roy', status: 'read' };
    backend.expectOne(list(null)).flush({ member: [message, second, read], totalItems: 3 });
    await settle();
    await vi.advanceTimersByTimeAsync(600);
    press('j');
    await settle();
    await vi.advanceTimersByTimeAsync(600);
    backend.expectNone((r) => r.url.endsWith('/read'));
    press('j');
    await settle();
    // A message already read is never sent again.
    await vi.advanceTimersByTimeAsync(2000);
    backend.expectNone((r) => r.url.endsWith('/read'));
    press('k');
    await settle();
    await vi.advanceTimersByTimeAsync(1000);
    expect(root.querySelector('article')?.getAttribute('aria-label')).toBe(
      'Message de Hugo Lefèvre',
    );
    backend.expectOne('/api/contact/admin/messages/m2/read');
    backend.expectNone('/api/contact/admin/messages/m1/read');
  });

  it('keeps a message read on "Non lus" under the reader until another one opens', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { backend, root, settle }: Page = await setupAt('/?status=received');
    const second: AdminMessage = { ...message, id: 'm2', name: 'Hugo Lefèvre' };
    backend.expectOne(list('received')).flush({ member: [message, second], totalItems: 2 });
    backend.expectOne(count).flush({ member: [message], totalItems: 5 });
    await settle();
    const unread: () => string | undefined = (): string | undefined =>
      root.querySelector('ui-page-header [data-slot="count-badge"]')?.textContent?.trim();
    expect(unread()).toBe('2 non lus');

    await vi.advanceTimersByTimeAsync(1000);
    backend
      .expectOne('/api/contact/admin/messages/m1/read')
      .flush({ ...message, status: 'read', version: 2 });
    await settle();
    backend.expectNone(list('received'));
    expect(root.querySelectorAll('li')).toHaveLength(2);
    expect(root.querySelector('article')?.getAttribute('aria-label')).toBe(
      'Message de Camille Martin',
    );
    // The tab counts the rows still unread, not the stale list total.
    expect(unread()).toBe('1 non lus');

    press('j');
    await settle();
    backend.expectOne(list('received')).flush({ member: [second], totalItems: 1 });
    await settle();
    expect(root.querySelectorAll('li')).toHaveLength(1);
    expect(root.querySelector('article')?.getAttribute('aria-label')).toBe(
      'Message de Hugo Lefèvre',
    );
    expect(unread()).toBe('1 non lus');
  });

  it('opens the first message, then the one picked in the list', async () => {
    TestBed.configureTestingModule({
      providers: PROVIDERS,
    });
    const backend: HttpTestingController =
      TestBed.inject<HttpTestingController>(HttpTestingController);
    const fixture: ComponentFixture<AdminInboxPageComponent> =
      TestBed.createComponent(AdminInboxPageComponent);
    backend.expectOne(list(null)).flush({
      member: [
        message,
        { ...message, id: 'm2', name: '  léa  ', company: null, status: 'read', locale: 'en' },
      ],
      totalItems: 2,
      view: { page: 1, pageSize: 20 },
    });
    await flush();
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const [first, second]: HTMLLIElement[] = [...root.querySelectorAll('li')];
    expect(first?.querySelector('[data-slot="avatar"]')?.textContent?.trim()).toBe('CM');
    expect(second?.querySelector('[data-slot="avatar"]')?.textContent?.trim()).toBe('L');
    expect(first?.textContent).toContain('Non lu');
    expect(second?.textContent).not.toContain('Non lu');
    const pane: () => HTMLElement | null = (): HTMLElement | null => root.querySelector('article');
    expect(pane()?.getAttribute('aria-label')).toBe('Message de Camille Martin');
    expect(pane()?.textContent).toContain('Non lu');

    second?.querySelector('button')?.click();
    await fixture.whenStable();
    expect(second?.querySelector('button')?.getAttribute('aria-current')).toBe('true');
    expect(pane()?.getAttribute('aria-label')).toBe('Message de   léa  ');
    expect(pane()?.textContent).not.toContain('Non lu');
    expect(pane()?.textContent).toContain('Anglais');
  });

  it('deletes a message only once the deletion is confirmed in the dialog', async () => {
    TestBed.configureTestingModule({
      providers: PROVIDERS,
    });
    const backend: HttpTestingController =
      TestBed.inject<HttpTestingController>(HttpTestingController);
    const fixture: ComponentFixture<AdminInboxPageComponent> =
      TestBed.createComponent(AdminInboxPageComponent);
    const toasts: ToastSpies = spyToasts();
    backend
      .expectOne(list(null))
      .flush({ member: [message], totalItems: 1, view: { page: 1, pageSize: 20 } });
    await flush();
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const remove: HTMLButtonElement | undefined = [...root.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Supprimer'),
    );
    const dialog: () => Element | null = (): Element | null =>
      document.querySelector('[data-slot="alert-dialog-content"]');
    const answer: (label: string) => Promise<void> = async (label: string): Promise<void> => {
      [...(dialog()?.querySelectorAll('button') ?? [])]
        .find((b) => b.textContent?.trim() === label)
        ?.click();
      await flush();
      await fixture.whenStable();
    };

    remove?.click();
    await fixture.whenStable();
    expect(dialog()?.textContent).toContain(
      'Le message de Camille Martin sera effacé définitivement.',
    );
    await answer('Annuler');
    expect(dialog()).toBeNull();
    backend.expectNone('/api/contact/admin/messages/m1');
    expect(toasts.success).not.toHaveBeenCalled();

    remove?.click();
    await fixture.whenStable();
    await answer('Supprimer');
    const call: TestRequest = backend.expectOne('/api/contact/admin/messages/m1');
    expect(call.request.method).toBe('DELETE');
    call.flush(null, { status: 204, statusText: 'No Content' });
    await flush();
    backend
      .expectOne(list(null))
      .flush({ member: [], totalItems: 0, view: { page: 1, pageSize: 20 } });
    await flush();
    expect(toasts.success).toHaveBeenCalledWith('Message supprimé.');
  });

  it('moves through the list and acts on the open message from the keyboard', async () => {
    TestBed.configureTestingModule({
      providers: PROVIDERS,
    });
    const backend: HttpTestingController =
      TestBed.inject<HttpTestingController>(HttpTestingController);
    const fixture: ComponentFixture<AdminInboxPageComponent> =
      TestBed.createComponent(AdminInboxPageComponent);
    const toasts: ToastSpies = spyToasts();
    const second: AdminMessage = { ...message, id: 'm2', name: 'Hugo Lefèvre' };
    const page: (messages: AdminMessage[]) => {
      member: AdminMessage[];
      totalItems: number;
      view: { page: number; pageSize: number };
    } = (
      messages: AdminMessage[],
    ): {
      member: AdminMessage[];
      totalItems: number;
      view: { page: number; pageSize: number };
    } => ({
      member: messages,
      totalItems: messages.length,
      view: { page: 1, pageSize: 20 },
    });
    backend.expectOne(list(null)).flush(page([message, second]));
    await flush();
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const open: () => string | null | undefined = (): string | null | undefined =>
      root.querySelector('article')?.getAttribute('aria-label');

    expect(press('j').defaultPrevented).toBe(true);
    await fixture.whenStable();
    expect(open()).toBe('Message de Hugo Lefèvre');
    expect(document.activeElement?.id).toBe('message-m2');
    press('ArrowDown');
    await fixture.whenStable();
    expect(open()).toBe('Message de Hugo Lefèvre');
    press('k');
    await fixture.whenStable();
    expect(open()).toBe('Message de Camille Martin');

    expect(press('j', { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(press('x').defaultPrevented).toBe(false);
    const field: HTMLInputElement = document.body.appendChild(document.createElement('input'));
    expect(press('j', {}, field).defaultPrevented).toBe(false);
    field.remove();
    const dialog: HTMLElement = document.body.appendChild(document.createElement('div'));
    dialog.setAttribute('role', 'dialog');
    const inside: HTMLButtonElement = dialog.appendChild(document.createElement('button'));
    expect(press('j', {}, inside).defaultPrevented).toBe(false);
    dialog.remove();
    backend.expectNone((r) => !count(r));

    // R no longer marks as read: showing the message does.
    expect(press('r').defaultPrevented).toBe(false);
    backend.expectNone('/api/contact/admin/messages/m1/read');
    press('e');
    const archive: TestRequest = backend.expectOne('/api/contact/admin/messages/m1/archive');
    expect(archive.request.headers.get('if-match')).toBe('"1"');
    archive.flush({ ...message, status: 'archived', version: 2 });
    await flush();
    backend.expectOne(list(null)).flush(page([second]));
    await flush();
    expect(toasts.success).toHaveBeenLastCalledWith('Message archivé.');
  });

  it('filters by status with the page header tabs, keeping one tab selected', async () => {
    const { backend, fixture, root, settle }: ReturnType<typeof setup> = setup();
    fixture.detectChanges();
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Chargement…');
    expect(root.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(6);
    backend
      .expectOne(list(null))
      .flush({ member: [{ ...message, status: 'archived' }], totalItems: 1 });
    await settle();
    // The default tab lists every status: its total is the heading figure, without a count request.
    backend.expectNone(count);
    // The navigation bar names the section; the heading and the filters live in the page header.
    expect(root.querySelector('header')?.textContent?.trim()).toBe('Messages');
    // The bar starts with the layout's sidebar toggle, which renders nothing outside the layout.
    expect(root.querySelector('header')?.firstElementChild?.tagName).toBe('UI-SIDEBAR-TRIGGER');
    expect(root.querySelector('ui-page-header h1')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Messages 1 message',
    );
    const tablist: HTMLElement | null = root.querySelector('ui-page-header [role="tablist"]');
    expect(tablist?.getAttribute('aria-label')).toBe('Filtrer par statut');
    const filters: () => HTMLButtonElement[] = (): HTMLButtonElement[] => [
      ...root.querySelectorAll<HTMLButtonElement>('ui-page-header [role="tab"]'),
    ];
    const selected: () => string | undefined = (): string | undefined =>
      filters()
        .find((b) => b.getAttribute('aria-selected') === 'true')
        ?.textContent?.trim();
    expect(filters().map((b) => b.textContent?.trim())).toEqual([
      'Tous',
      'Non lus',
      'Lus',
      'Archivés',
    ]);
    expect(selected()).toBe('Tous');
    const panel: () => HTMLElement | null = (): HTMLElement | null =>
      root.querySelector('[role="tabpanel"]');
    expect(panel()?.getAttribute('aria-labelledby')).toBe(filters()[0]?.id);
    expect(root.querySelector('ul')?.getAttribute('aria-label')).toBe('Tous les messages');
    const badge: Element | null = root.querySelector('[role="tabpanel"] [data-slot="badge"]');
    expect(badge?.textContent?.trim()).toBe('Archivé');
    expect(badge?.getAttribute('data-variant')).toBe('outline');
    const router: Router = TestBed.inject<Router>(Router);
    expect(router.url).toBe('/');

    filters()[1]?.click();
    await settle();
    backend.expectOne(list('received')).flush({ member: [], totalItems: 0 });
    await settle();
    expect(selected()).toBe('Non lus');
    // The tab goes to the URL in place of the current entry; the overall count is already known.
    expect(router.url).toBe('/?status=received');
    backend.expectNone(count);
    expect(root.querySelector('ui-page-header h1')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Messages 1 message',
    );
    expect(panel()?.getAttribute('aria-labelledby')).toBe(filters()[1]?.id);
    expect(panel()?.querySelector('[data-slot="empty"]')?.textContent).toContain(
      'Aucun message non lu',
    );

    filters()[1]?.click();
    await settle();
    expect(selected()).toBe('Non lus');
    backend.expectNone((r) => !count(r));

    // Back to the default tab: the parameter leaves the URL.
    filters()[0]?.click();
    await settle();
    backend.expectOne(list(null)).flush({ member: [], totalItems: 0 });
    await settle();
    expect(selected()).toBe('Tous');
    expect(router.url).toBe('/');
  });

  it('moves along the filter tabs with the arrows and loads one only on Enter', async () => {
    const { backend, root, settle }: ReturnType<typeof setup> = setup();
    backend.expectOne(list(null)).flush({ member: [], totalItems: 0 });
    await settle();
    const tabs: HTMLButtonElement[] = [
      ...root.querySelectorAll<HTMLButtonElement>('ui-page-header [role="tab"]'),
    ];
    tabs[0]?.focus();
    tabs[0]?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', keyCode: 39, bubbles: true }),
    );
    await settle();
    expect(document.activeElement).toBe(tabs[1]);
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('false');
    backend.expectNone((r) => !count(r));
    tabs[1]?.click();
    await settle();
    backend.expectOne(list('received')).flush({ member: [], totalItems: 0 });
    await settle();
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('true');
  });

  it('shows a load failure as a danger alert with a retry and a write conflict as a warning toast', async () => {
    const { backend, root, settle }: ReturnType<typeof setup> = setup();
    const toasts: ToastSpies = spyToasts();
    backend.expectOne(list(null)).flush(null, { status: 500, statusText: 'Server Error' });
    await settle();
    const alert: () => Element | null = (): Element | null =>
      root.querySelector('[data-slot="alert"]');
    expect(alert()?.getAttribute('data-variant')).toBe('danger');
    expect(alert()?.getAttribute('role')).toBe('alert');
    expect(alert()?.textContent).toContain('Le service ne répond pas.');
    [...(alert()?.querySelectorAll('button') ?? [])]
      .find((b) => b.textContent?.trim() === 'Réessayer')
      ?.click();
    await settle();
    backend.expectOne(list(null)).flush(null, { status: 500, statusText: 'Server Error' });
    await settle();
    expect(alert()?.getAttribute('data-variant')).toBe('danger');

    [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Lus')?.click();
    await settle();
    backend.expectOne(list('read')).flush({ member: [message], totalItems: 1 });
    await settle();
    expect(alert()).toBeNull();
    const badge: Element | null = root.querySelector('[data-slot="badge"]');
    expect(badge?.textContent?.trim()).toBe('Non lu');
    expect(badge?.getAttribute('data-variant')).toBe('info');

    [...root.querySelectorAll('button')].find((b) => b.textContent?.includes('Archiver'))?.click();
    backend
      .expectOne('/api/contact/admin/messages/m1/archive')
      .flush(
        { code: 'contact.version-mismatch' },
        { status: 412, statusText: 'Precondition Failed' },
      );
    await settle();
    backend
      .expectOne(list('read'))
      .flush({ member: [{ ...message, status: 'read' }], totalItems: 1 });
    await settle();
    expect(toasts.warning).toHaveBeenCalledWith(
      'Ce message a changé entre-temps ; la liste a été rechargée.',
    );
    expect(toasts.success).not.toHaveBeenCalled();
    expect(alert()).toBeNull();
    expect(root.querySelector('[data-slot="badge"]')?.getAttribute('data-variant')).toBe('success');
  });

  it('reports a failed automatic read in an error toast with its cause, without retrying it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { backend, root, settle }: ReturnType<typeof setup> = setup();
    const toasts: ToastSpies = spyToasts();
    backend.expectOne(list(null)).flush({ member: [message], totalItems: 1 });
    await settle();
    await vi.advanceTimersByTimeAsync(1000);
    backend
      .expectOne('/api/contact/admin/messages/m1/read')
      .flush(null, { status: 503, statusText: 'Unavailable' });
    await settle();
    expect(toasts.error).toHaveBeenCalledWith('Le message n’a pas été marqué comme lu.', {
      description: 'Le service ne répond pas. Réessayez dans un moment.',
    });
    expect(toasts.success).not.toHaveBeenCalled();
    expect(root.querySelector('[data-slot="alert"]')).toBeNull();
    expect(root.querySelector('li')?.textContent).toContain('Non lu');
    backend.expectNone(list(null));
    await vi.advanceTimersByTimeAsync(2000);
    backend.expectNone('/api/contact/admin/messages/m1/read');
  });

  it('describes the keyboard actions in tooltips', async () => {
    const { backend, fixture, root, settle }: ReturnType<typeof setup> = setup();
    backend.expectOne(list(null)).flush({ member: [message], totalItems: 1 });
    await settle();
    const tip: (
      label: string,
    ) => Promise<{ keys: string[]; shortcut: string | null; text: string }> = async (
      label: string,
    ): Promise<{ keys: string[]; shortcut: string | null; text: string }> => {
      const button: HTMLButtonElement | undefined = [
        ...root.querySelectorAll<HTMLButtonElement>('article button'),
      ].find((b) => b.textContent?.includes(label));
      button?.dispatchEvent(new FocusEvent('focusin'));
      await fixture.whenStable();
      const tooltip: Element | null = document.querySelector('[role="tooltip"]');
      const result: { keys: string[]; shortcut: string | null; text: string } = {
        text: tooltip?.querySelector('span')?.textContent?.trim() ?? '',
        // Single letters: one cap, no platform modifier.
        keys: [...(tooltip?.querySelectorAll('kbd') ?? [])].map((k) => k.textContent ?? ''),
        shortcut: button?.getAttribute('aria-keyshortcuts') ?? null,
      };
      button?.dispatchEvent(new FocusEvent('focusout'));
      await fixture.whenStable();
      return result;
    };
    expect(await tip('Archiver')).toEqual({ text: 'Raccourci', keys: ['E'], shortcut: 'E' });
    expect(root.querySelectorAll('article [aria-keyshortcuts]')).toHaveLength(1);
    // The list hints name the keys left: no R, since showing a message marks it read.
    const hints: string[] = [
      ...(root.querySelector('contact-message-list-dataview > p')?.querySelectorAll('kbd') ?? []),
    ].map((k) => k.textContent?.trim() ?? '');
    expect(hints).toEqual(['J', 'K', 'E', '?']);
    expect(root.textContent).toContain('raccourcis');
  });

  it('opens a message in a right sheet on narrow screens and acts on it there', async () => {
    const query: FakeMediaQuery = stubNarrow();
    const { backend, fixture, root, settle }: ReturnType<typeof setup> = setup();
    const toasts: ToastSpies = spyToasts();
    const second: AdminMessage = { ...message, id: 'm2', name: 'Hugo Lefèvre' };
    backend.expectOne(list(null)).flush({ member: [message, second], totalItems: 2 });
    await settle();
    const sheet: () => HTMLElement | null = (): HTMLElement | null =>
      document.querySelector<HTMLElement>('[data-slot="sheet-content"]');
    const current: () => (string | null)[] = (): (string | null)[] =>
      [...root.querySelectorAll<HTMLButtonElement>('li button')].map((b) =>
        b.getAttribute('aria-current'),
      );
    expect(root.querySelector('article')).toBeNull();
    expect(root.querySelector('ui-resizable-handle')).toBeNull();
    expect(sheet()).toBeNull();
    // No message shows while the sheet is closed, so no row is current.
    expect(current()).toEqual(['false', 'false']);

    root.querySelectorAll<HTMLButtonElement>('li button')[0]?.click();
    await settle();
    expect(current()).toEqual(['true', 'false']);
    // One band: the action bar repeats the raised surface of the sheet under its title bar.
    const actions: Element | null | undefined = sheet()?.querySelector('article > div');
    expect(sheet()?.className).toContain('bg-surface-raised');
    expect(actions?.classList).toContain('bg-surface-raised');
    expect(actions?.classList).not.toContain('bg-surface');
    expect(sheet()?.getAttribute('role')).toBe('dialog');
    expect(sheet()?.getAttribute('aria-label')).toBe('Lecture du message');
    expect(sheet()?.className).toContain('border-l');
    expect(sheet()?.className).toContain('max-w-[640px]');
    const title: HTMLElement | null | undefined = sheet()?.querySelector(
      'h2[data-slot="sheet-title"]',
    );
    expect(title?.textContent?.trim()).toBe('Message de Camille Martin');
    expect(document.activeElement).toBe(title);
    expect(sheet()?.querySelector('article')?.getAttribute('aria-label')).toBe(
      'Message de Camille Martin',
    );

    // A second pick while it is open never stacks another sheet.
    root.querySelectorAll<HTMLButtonElement>('li button')[1]?.click();
    await settle();
    expect(document.querySelectorAll('[data-slot="sheet-content"]')).toHaveLength(1);
    expect(sheet()?.querySelector('article')?.getAttribute('aria-label')).toBe(
      'Message de Hugo Lefèvre',
    );

    // Keys typed in the sheet move through the list; the focus stays in the sheet.
    expect(press('k', {}, title ?? window).defaultPrevented).toBe(true);
    await settle();
    expect(sheet()?.querySelector('article')?.getAttribute('aria-label')).toBe(
      'Message de Camille Martin',
    );
    expect(document.activeElement?.id).not.toBe('message-m1');

    [...(sheet()?.querySelectorAll('button') ?? [])]
      .find((b) => b.textContent?.includes('Archiver'))
      ?.click();
    backend
      .expectOne('/api/contact/admin/messages/m1/archive')
      .flush({ ...message, status: 'archived', version: 2 });
    await settle();
    backend.expectOne(list(null)).flush({ member: [second], totalItems: 1 });
    await settle();
    expect(toasts.success).toHaveBeenCalledWith('Message archivé.');
    expect(sheet()).toBeNull();

    root.querySelector<HTMLButtonElement>('li button')?.click();
    await settle();
    const close: HTMLButtonElement | null | undefined = sheet()?.querySelector<HTMLButtonElement>(
      'button[aria-label="Fermer"]',
    );
    expect(close).not.toBeNull();
    close?.click();
    await settle();
    expect(sheet()).toBeNull();
    expect(current()).toEqual(['false']);

    // Widening the window closes the sheet: the second pane shows the message.
    root.querySelector<HTMLButtonElement>('li button')?.click();
    await settle();
    expect(sheet()).not.toBeNull();
    query.listener?.({ matches: false });
    await settle();
    expect(sheet()).toBeNull();
    expect(root.querySelector('article')?.getAttribute('aria-label')).toBe(
      'Message de Hugo Lefèvre',
    );
    expect(current()).toEqual(['true']);

    query.listener?.({ matches: true });
    await settle();
    root.querySelector<HTMLButtonElement>('li button')?.click();
    await settle();
    fixture.destroy();
    expect(query.listener).toBeNull();
    expect(sheet()).toBeNull();
  });

  it('marks read only once the sheet shows the message, and reloads silently on a conflict', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    stubNarrow();
    const { backend, root, settle }: ReturnType<typeof setup> = setup();
    const toasts: ToastSpies = spyToasts();
    backend.expectOne(list(null)).flush({ member: [message], totalItems: 1 });
    await settle();
    // The list alone shows no message.
    await vi.advanceTimersByTimeAsync(2000);
    backend.expectNone('/api/contact/admin/messages/m1/read');
    root.querySelector<HTMLButtonElement>('li button')?.click();
    await settle();
    await vi.advanceTimersByTimeAsync(1000);
    backend
      .expectOne('/api/contact/admin/messages/m1/read')
      .flush(
        { code: 'contact.version-mismatch' },
        { status: 412, statusText: 'Precondition Failed' },
      );
    await settle();
    backend
      .expectOne(list(null))
      .flush({ member: [{ ...message, status: 'read', version: 2 }], totalItems: 1 });
    await settle();
    expect(toasts.warning).not.toHaveBeenCalled();
    expect(toasts.error).not.toHaveBeenCalled();
    expect(document.querySelector('[data-slot="sheet-content"] article dd')?.textContent).toContain(
      'Lu',
    );
  });

  it('closes the reading sheet when a conflicting read reloads the list without its message', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    stubNarrow();
    const { backend, root, settle }: Page = await setupAt('/?status=received');
    backend.expectOne(list('received')).flush({ member: [message], totalItems: 1 });
    await settle();
    root.querySelector<HTMLButtonElement>('li button')?.click();
    await settle();
    await vi.advanceTimersByTimeAsync(1000);
    backend
      .expectOne('/api/contact/admin/messages/m1/read')
      .flush(
        { code: 'contact.version-mismatch' },
        { status: 412, statusText: 'Precondition Failed' },
      );
    await settle();
    backend.expectOne(list('received')).flush({ member: [], totalItems: 0 });
    await settle();
    expect(document.querySelector('[data-slot="sheet-content"]')).toBeNull();
  });

  it('names the empty state after the selected tab and offers the way back to every message', async () => {
    const { backend, root, settle }: ReturnType<typeof setup> = setup();
    backend.expectOne(list(null)).flush({ member: [], totalItems: 0 });
    await settle();
    const state = (): HTMLElement | null => root.querySelector<HTMLElement>('[data-slot="empty"]');
    const empty: () => string[] = (): string[] =>
      [...root.querySelectorAll('[data-slot="empty"] p')].map((p) => p.textContent?.trim() ?? '');
    const action = (): HTMLButtonElement | null =>
      root.querySelector<HTMLButtonElement>('[data-slot="empty-content"] button');
    const all: string =
      'Les messages envoyés depuis le formulaire de contact du site arrivent ici. Ils sont supprimés automatiquement trois ans après leur réception.';
    // Nothing follows the list in its panel: the empty state fills it.
    expect(state()?.dataset['layout']).toBe('fill');
    expect(empty()).toEqual(['Aucun message', all]);
    expect(action()).toBeNull();
    const tabs: HTMLButtonElement[] = [
      ...root.querySelectorAll<HTMLButtonElement>('ui-page-header [role="tab"]'),
    ];
    for (const [index, status, texts] of [
      [
        1,
        'received',
        [
          'Aucun message non lu',
          'Les nouveaux messages restent dans cet onglet jusqu’à leur lecture.',
        ],
      ],
      [
        2,
        'read',
        ['Aucun message lu', 'Un message affiché pendant une seconde passe dans cet onglet.'],
      ],
      [
        3,
        'archived',
        [
          'Aucun message archivé',
          'Archivez un message avec E ou son bouton « Archiver » pour le ranger ici.',
        ],
      ],
    ] as const) {
      tabs[index]?.click();
      await settle();
      backend.expectOne(list(status)).flush({ member: [], totalItems: 0 });
      await settle();
      expect(empty()).toEqual(texts);
      expect(action()?.textContent?.trim()).toBe('Voir tous les messages');
    }
    action()?.click();
    await settle();
    backend.expectOne(list(null)).flush({ member: [], totalItems: 0 });
    await settle();
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
    expect(empty()).toEqual(['Aucun message', all]);
  });

  it('shows the load failure without an empty state', async () => {
    const { backend, root, settle }: ReturnType<typeof setup> = setup();
    backend
      .expectOne(list(null))
      .flush({ title: 'Indisponible' }, { status: 503, statusText: 'Service Unavailable' });
    await settle();
    expect(root.querySelector('[uiAlert]')).not.toBeNull();
    expect(root.querySelector('[data-slot="empty"]')).toBeNull();
  });

  it('counts every message beside the heading whatever the tab, and the unread ones on "Non lus"', async () => {
    const { backend, fixture, root, settle }: ReturnType<typeof setup> = setup();
    const heading: () => string | undefined = (): string | undefined =>
      root.querySelector('ui-page-header h1')?.textContent?.replace(/\s+/g, ' ').trim();
    const unread: () => Element | null = (): Element | null =>
      root.querySelector('ui-page-header [role="tab"] [data-slot="count-badge"]');
    fixture.detectChanges();
    // No false zero before the first answer.
    expect(heading()).toBe('Messages');
    expect(unread()).toBeNull();
    backend.expectOne(list(null)).flush({
      member: [message, { ...message, id: 'm2', status: 'read' }],
      totalItems: 8,
    });
    await settle();
    // The unfiltered list gives the heading figure by itself.
    backend.expectNone(count);
    expect(heading()).toBe('Messages 8 messages');
    expect(root.querySelector('ui-page-header h1 .sr-only')?.textContent).toBe(' messages');
    // Elsewhere than "Non lus" the tab shows the owner summary, unknown here since no layout
    // refreshed it.
    expect(unread()).toBeNull();

    const tabs: () => HTMLButtonElement[] = (): HTMLButtonElement[] => [
      ...root.querySelectorAll<HTMLButtonElement>('ui-page-header [role="tab"]'),
    ];
    tabs()[1]?.click();
    await settle();
    backend.expectOne(list('received')).flush({
      member: [message, { ...message, id: 'm3' }],
      totalItems: 120,
    });
    await settle();
    // The loaded unread list gives the count of its tab: a grey figure capped at 99+, then the
    // spoken words.
    expect(unread()?.textContent?.trim()).toBe('99+ non lus');
    expect(unread()?.querySelector('.sr-only')?.textContent).toBe(' non lus');
    expect(unread()?.className).toContain('bg-surface-selected');
    expect(unread()?.getAttribute('data-variant')).toBeNull();
    expect(unread()?.closest('[role="tab"]')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Non lus 99+ non lus',
    );
    expect(heading()).toBe('Messages 8 messages');

    tabs()[3]?.click();
    await settle();
    backend
      .expectOne(list('archived'))
      .flush({ member: [{ ...message, status: 'archived' }], totalItems: 1 });
    await settle();
    // Another tab keeps the overall count: the heading means one thing on every tab.
    expect(heading()).toBe('Messages 8 messages');
    backend.expectNone(count);
    expect(root.querySelector('ul')?.getAttribute('aria-label')).toBe('Messages archivés');
    expect(unread()).toBeNull();
  });

  it('restores the filter tab from the URL and follows it on Back and on the sidebar link', async () => {
    const { backend, root, settle }: Page = await setupAt('/?status=archived');
    const selected: () => string | undefined = (): string | undefined =>
      [...root.querySelectorAll<HTMLButtonElement>('ui-page-header [role="tab"]')]
        .find((b) => b.getAttribute('aria-selected') === 'true')
        ?.textContent?.trim();
    backend.expectNone(list(null));
    backend
      .expectOne(list('archived'))
      .flush({ member: [{ ...message, status: 'archived' }], totalItems: 1 });
    await settle();
    expect(selected()).toBe('Archivés');
    expect(root.querySelector('ul')?.getAttribute('aria-label')).toBe('Messages archivés');

    const router: Router = TestBed.inject<Router>(Router);
    await router.navigateByUrl('/?status=read');
    await settle();
    backend.expectOne(list('read')).flush({ member: [], totalItems: 0 });
    await settle();
    expect(selected()).toBe('Lus');

    await router.navigateByUrl('/?status=received');
    await settle();
    backend.expectOne(list('received')).flush({ member: [], totalItems: 0 });
    await settle();
    expect(selected()).toBe('Non lus');

    // The bare URL (the sidebar entry) is the "Tous" tab; an unknown value falls back to it too.
    await router.navigateByUrl('/');
    await settle();
    backend.expectOne(list(null)).flush({ member: [], totalItems: 0 });
    await settle();
    expect(selected()).toBe('Tous');
    await router.navigateByUrl('/?status=spam');
    await settle();
    backend.expectNone((r) => !count(r));
    expect(selected()).toBe('Tous');
  });

  it('lays out each row on a fixed grid with the time beside the sender', async () => {
    const { backend, root, settle }: ReturnType<typeof setup> = setup();
    backend.expectOne(list(null)).flush({
      member: [message, { ...message, id: 'm2', status: 'read' }, { ...message, id: 'm3' }],
      totalItems: 3,
    });
    await settle();
    const [current, read, unread] = [...root.querySelectorAll<HTMLButtonElement>('li > button')];
    for (const row of [unread, read]) {
      expect(row?.className).toContain('grid-cols-[28px_minmax(0,1fr)_auto]');
      expect(row?.querySelector('time')?.className).toContain('col-start-3');
      expect(row?.querySelector('time')?.getAttribute('datetime')).toBe(message.receivedAt);
    }
    const name: (row: Element | undefined) => Element | null | undefined = (
      row: Element | undefined,
    ): Element | null | undefined => row?.querySelector('.col-start-2.row-start-1');
    expect(name(unread)?.textContent?.trim()).toBe('Camille Martin');
    expect(name(unread)?.className).toContain('font-semibold');
    expect(name(read)?.className).toContain('font-medium');
    // Unread rows take the start bar of the current row in neutral ink; the current one keeps the
    // accent, and the state is spoken too.
    for (const row of [current, read, unread]) {
      expect(row?.className).toContain('before:w-0.5');
      expect(row?.className).toContain('aria-[current=true]:before:bg-accent');
      expect(row?.querySelector('.bg-info')).toBeNull();
    }
    expect(current?.getAttribute('aria-current')).toBe('true');
    expect(current?.className).toContain('before:bg-border-strong');
    expect(unread?.className).toContain('before:bg-border-strong');
    expect(read?.className).not.toContain('before:bg-border-strong');
    expect(unread?.querySelector('.sr-only')?.textContent).toBe('Non lu');
    expect(read?.querySelector('.sr-only')).toBeNull();
    // The panes let their content shrink instead of overflowing.
    const pane: HTMLElement | null = root.querySelector('[uiResizablePanel]');
    expect(pane?.className).toContain('grid-cols-[minmax(0,1fr)]');
    expect(root.querySelector('contact-message-list-dataview')?.className).toContain('min-w-0');
  });

  it('heads the reading pane with the subject and the sender, then the properties and the body', async () => {
    const { backend, root, settle }: ReturnType<typeof setup> = setup();
    backend.expectOne(list(null)).flush({ member: [message], totalItems: 1 });
    await settle();
    const article: HTMLElement | null = root.querySelector('article');
    const header: HTMLElement | null | undefined = article?.querySelector('header');
    expect(header?.querySelector('h2')?.textContent?.trim()).toBe('Une offre de poste');
    const sender: string[] = [...(header?.querySelectorAll('p > *') ?? [])].map(
      (part) => part.textContent?.trim() ?? '',
    );
    expect(sender).toEqual(['Camille Martin', '· Atelier Nord', '·', 'camille@exemple.fr']);
    expect(header?.querySelector('a')?.getAttribute('href')).toBe('mailto:camille@exemple.fr');
    const terms: string[] = [...(article?.querySelectorAll('dt') ?? [])].map(
      (term) => term.textContent?.trim() ?? '',
    );
    expect(terms).toEqual(['Statut', 'Reçu le', 'Langue', 'Suppression auto le']);
    // Terms read as in the project properties panel.
    for (const term of article?.querySelectorAll('dt') ?? []) {
      expect(term.className).toBe('font-medium text-fg-muted');
    }
    const values: NodeListOf<HTMLElement> | undefined = article?.querySelectorAll('dd');
    const status: Element | null | undefined = values?.[0]?.querySelector('[data-slot="badge"]');
    expect(status?.textContent?.trim()).toBe('Non lu');
    // In the definition list a status reads as plain text after its coloured dot, without a frame.
    expect(status?.getAttribute('data-appearance')).toBe('ghost');
    expect(status?.classList).toContain('text-fg');
    expect(values?.[2]?.textContent?.trim()).toBe('Français');
    expect(values?.[3]?.textContent?.trim()).toBe('02/11/2029');
    const body: HTMLElement | null | undefined = article?.querySelector('dl + p');
    expect(body?.textContent).toBe('Bonjour,\nnous recrutons.');
    // The column spans the pane; only the body text keeps a reading measure.
    expect(body?.className).toContain('max-w-[75ch]');
    expect(article?.querySelector('header')?.parentElement?.className).not.toContain('max-w-');
  });

  it('takes the singular for zero messages in French', async () => {
    const { backend, root, settle }: Page = setup();
    backend.expectOne(list(null)).flush({ member: [], totalItems: 0 });
    await settle();
    expect(root.querySelector('ui-page-header h1')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Messages 0 message',
    );
  });

  it('follows the plural rules and the date formats of another build locale', async () => {
    TestBed.configureTestingModule({
      providers: [...PROVIDERS, { provide: LOCALE_ID, useValue: 'en-US' }],
    });
    const { backend, root, settle }: Page = render();
    backend.expectOne(list(null)).flush({ member: [], totalItems: 0 });
    await settle();
    // English takes the plural for zero; the words stay the untranslated French source here.
    expect(root.querySelector('ui-page-header h1')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Messages 0 messages',
    );
    root.querySelectorAll<HTMLButtonElement>('ui-page-header [role="tab"]')[3]?.click();
    await settle();
    backend
      .expectOne(list('archived'))
      .flush({ member: [{ ...message, status: 'archived' }], totalItems: 1 });
    await settle();
    expect(root.querySelectorAll('article dd')[3]?.textContent?.trim()).toBe('11/2/29');
  });

  it('pages through the messages', async () => {
    const { backend, root, settle }: ReturnType<typeof setup> = setup();
    const full: {
      id: string;
      name: string;
      company: string | null;
      email: string;
      subject: 'project' | 'job' | 'other';
      message: string;
      locale: 'fr' | 'en';
      status: AdminMessageStatus;
      receivedAt: string;
      purgeAt: string;
      version: number;
    }[] = Array.from({ length: 20 }, (_, i) => ({ ...message, id: `m${i}` }));
    backend.expectOne(list(null)).flush({ member: full, totalItems: 21 });
    await settle();
    const button: (label: string) => HTMLButtonElement | undefined = (
      label: string,
    ): HTMLButtonElement | undefined =>
      [...root.querySelectorAll<HTMLButtonElement>('nav button')].find((b) =>
        b.textContent?.includes(label),
      );
    expect(root.querySelector('nav')?.textContent).toContain('1 / 2');
    expect(button('Précédents')?.disabled).toBe(true);

    button('Suivants')?.click();
    await settle();
    backend
      .expectOne(list(null, 2))
      .flush({ member: [{ ...message, id: 'last' }], totalItems: 21 });
    await settle();
    expect(root.querySelector('nav')?.textContent).toContain('2 / 2');
    expect(button('Suivants')?.disabled).toBe(true);

    button('Précédents')?.click();
    await settle();
    backend.expectOne(list(null, 1)).flush({ member: full, totalItems: 21 });
    await settle();
    expect(root.querySelector('nav')?.textContent).toContain('1 / 2');
  });
});
