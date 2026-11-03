import type { AdminMessageStatus, AdminMessage } from '@vfortin/contact-web-data-access';

import { type HttpRequest, provideHttpClient } from '@angular/common/http';
import {
  type TestRequest,
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
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

/**
 * Function setup
 *
 * @description
 * Renders the inbox page and returns its root, its HTTP backend and a helper settling the fixture.
 *
 * @returns Page root, HTTP test backend and settle helper.
 */
function setup(): {
  backend: HttpTestingController;
  fixture: ComponentFixture<AdminInboxPageComponent>;
  root: HTMLElement;
  settle: () => Promise<void>;
} {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
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
    request.params.get('page') === String(page);

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

describe('AdminInboxPageComponent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows unread messages, marks one as read with If-Match and reloads', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const toasts: ToastSpies = spyToasts();
    const backend: HttpTestingController =
      TestBed.inject<HttpTestingController>(HttpTestingController);
    const fixture: ComponentFixture<AdminInboxPageComponent> =
      TestBed.createComponent(AdminInboxPageComponent);
    const list: TestRequest = backend.expectOne((r) => r.url === '/api/contact/admin/messages');
    expect(list.request.params.get('status')).toBe('received');
    list.flush({ member: [message], totalItems: 1, view: { page: 1, pageSize: 20 } });
    await flush();
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain('Camille Martin');
    expect(root.textContent).toContain('Une offre de poste');

    const read: HTMLButtonElement | undefined = [...root.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Marquer comme lu'),
    );
    read?.click();
    const call: TestRequest = backend.expectOne('/api/contact/admin/messages/m1/read');
    expect(call.request.headers.get('if-match')).toBe('"1"');
    call.flush({ ...message, status: 'read', version: 2 });
    await flush();
    backend
      .expectOne((r) => r.url === '/api/contact/admin/messages')
      .flush({ member: [], totalItems: 0, view: { page: 1, pageSize: 20 } });
    await flush();
    await fixture.whenStable();
    expect(root.textContent).toContain('Aucun message.');
    expect(toasts.success).toHaveBeenCalledWith('Message marqué comme lu.');
  });

  it('opens the first message, then the one picked in the list', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const backend: HttpTestingController =
      TestBed.inject<HttpTestingController>(HttpTestingController);
    const fixture: ComponentFixture<AdminInboxPageComponent> =
      TestBed.createComponent(AdminInboxPageComponent);
    backend
      .expectOne((r) => r.url === '/api/contact/admin/messages')
      .flush({
        member: [message, { ...message, id: 'm2', name: '  léa  ', company: null, status: 'read' }],
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
    expect(pane()?.textContent).toContain('Marquer comme lu');

    second?.querySelector('button')?.click();
    await fixture.whenStable();
    expect(second?.querySelector('button')?.getAttribute('aria-current')).toBe('true');
    expect(pane()?.getAttribute('aria-label')).toBe('Message de   léa  ');
    expect(pane()?.textContent).not.toContain('Marquer comme lu');
  });

  it('deletes a message only once the deletion is confirmed in the dialog', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const backend: HttpTestingController =
      TestBed.inject<HttpTestingController>(HttpTestingController);
    const fixture: ComponentFixture<AdminInboxPageComponent> =
      TestBed.createComponent(AdminInboxPageComponent);
    const toasts: ToastSpies = spyToasts();
    backend
      .expectOne((r) => r.url === '/api/contact/admin/messages')
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
      .expectOne((r) => r.url === '/api/contact/admin/messages')
      .flush({ member: [], totalItems: 0, view: { page: 1, pageSize: 20 } });
    await flush();
    expect(toasts.success).toHaveBeenCalledWith('Message supprimé.');
  });

  it('moves through the list and acts on the open message from the keyboard', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
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
    backend
      .expectOne((r) => r.url === '/api/contact/admin/messages')
      .flush(page([message, second]));
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
    backend.expectNone(() => true);

    press('r');
    backend
      .expectOne('/api/contact/admin/messages/m1/read')
      .flush({ ...message, status: 'read', version: 2 });
    await flush();
    backend
      .expectOne((r) => r.url === '/api/contact/admin/messages')
      .flush(page([{ ...message, status: 'read', version: 2 }, second]));
    await flush();
    await fixture.whenStable();
    expect(press('r').defaultPrevented).toBe(false);
    expect(toasts.success).toHaveBeenLastCalledWith('Message marqué comme lu.');
    press('e');
    const archive: TestRequest = backend.expectOne('/api/contact/admin/messages/m1/archive');
    expect(archive.request.headers.get('if-match')).toBe('"2"');
    archive.flush({ ...message, status: 'archived', version: 3 });
    await flush();
    backend.expectOne((r) => r.url === '/api/contact/admin/messages').flush(page([second]));
    await flush();
    expect(toasts.success).toHaveBeenLastCalledWith('Message archivé.');
  });

  it('filters by status with a pressed toggle, keeping one filter pressed', async () => {
    const { backend, fixture, root, settle }: ReturnType<typeof setup> = setup();
    fixture.detectChanges();
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Chargement…');
    expect(root.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(6);
    backend.expectOne(list('received')).flush({ member: [], totalItems: 0 });
    await settle();
    const filters: () => HTMLButtonElement[] = (): HTMLButtonElement[] => [
      ...root.querySelectorAll<HTMLButtonElement>('[data-slot="toggle-group-item"]'),
    ];
    const pressed: () => string | undefined = (): string | undefined =>
      filters()
        .find((b) => b.getAttribute('aria-pressed') === 'true')
        ?.textContent?.trim();
    expect(filters().map((b) => b.textContent?.trim())).toEqual([
      'Non lus',
      'Lus',
      'Archivés',
      'Tous',
    ]);
    expect(pressed()).toBe('Non lus');
    expect(root.querySelector('[data-slot="empty"]')?.textContent).toContain('Aucun message.');

    filters()[3]?.click();
    await settle();
    backend
      .expectOne(list(null))
      .flush({ member: [{ ...message, status: 'archived' }], totalItems: 1 });
    await settle();
    expect(pressed()).toBe('Tous');
    const badge: Element | null = root.querySelector('[data-slot="badge"]');
    expect(badge?.textContent?.trim()).toBe('Archivé');
    expect(badge?.getAttribute('data-variant')).toBe('default');

    filters()[3]?.click();
    await settle();
    expect(pressed()).toBe('Tous');
    backend.expectNone(() => true);
  });

  it('shows a load failure as a danger alert with a retry and a write conflict as a warning toast', async () => {
    const { backend, root, settle }: ReturnType<typeof setup> = setup();
    const toasts: ToastSpies = spyToasts();
    backend.expectOne(list('received')).flush(null, { status: 500, statusText: 'Server Error' });
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
    backend.expectOne(list('received')).flush(null, { status: 500, statusText: 'Server Error' });
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

  it('reports a failed status change in an error toast with its cause', async () => {
    const { backend, root, settle }: ReturnType<typeof setup> = setup();
    const toasts: ToastSpies = spyToasts();
    backend.expectOne(list('received')).flush({ member: [message], totalItems: 1 });
    await settle();
    [...root.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Marquer comme lu'))
      ?.click();
    backend
      .expectOne('/api/contact/admin/messages/m1/read')
      .flush(null, { status: 503, statusText: 'Unavailable' });
    await settle();
    backend.expectOne(list('received')).flush({ member: [message], totalItems: 1 });
    await settle();
    expect(toasts.error).toHaveBeenCalledWith('Le message n’a pas été marqué comme lu.', {
      description: 'Le service ne répond pas. Réessayez dans un moment.',
    });
    expect(toasts.success).not.toHaveBeenCalled();
    expect(root.querySelector('[data-slot="alert"]')).toBeNull();
  });

  it('describes the keyboard actions in tooltips', async () => {
    const { backend, fixture, root, settle }: ReturnType<typeof setup> = setup();
    backend.expectOne(list('received')).flush({ member: [message], totalItems: 1 });
    await settle();
    const tip: (label: string) => Promise<string | null> = async (
      label: string,
    ): Promise<string | null> => {
      const button: HTMLButtonElement | undefined = [
        ...root.querySelectorAll<HTMLButtonElement>('article button'),
      ].find((b) => b.textContent?.includes(label));
      button?.dispatchEvent(new FocusEvent('focusin'));
      await fixture.whenStable();
      const text: string | null =
        document.querySelector('[role="tooltip"]')?.textContent?.trim() ?? null;
      button?.dispatchEvent(new FocusEvent('focusout'));
      await fixture.whenStable();
      return text;
    };
    expect(await tip('Marquer comme lu')).toBe('Raccourci : R');
    expect(await tip('Archiver')).toBe('Raccourci : E');
    expect(root.textContent).toContain('raccourcis');
  });

  it('opens a message in a right sheet on narrow screens and acts on it there', async () => {
    const query: FakeMediaQuery = stubNarrow();
    const { backend, fixture, root, settle }: ReturnType<typeof setup> = setup();
    const toasts: ToastSpies = spyToasts();
    const second: AdminMessage = { ...message, id: 'm2', name: 'Hugo Lefèvre' };
    backend.expectOne(list('received')).flush({ member: [message, second], totalItems: 2 });
    await settle();
    const sheet: () => HTMLElement | null = (): HTMLElement | null =>
      document.querySelector<HTMLElement>('[data-slot="sheet-content"]');
    expect(root.querySelector('article')).toBeNull();
    expect(sheet()).toBeNull();

    root.querySelectorAll<HTMLButtonElement>('li button')[0]?.click();
    await settle();
    expect(sheet()?.getAttribute('role')).toBe('dialog');
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
    backend.expectOne(list('received')).flush({ member: [second], totalItems: 1 });
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

    query.listener?.({ matches: true });
    await settle();
    root.querySelector<HTMLButtonElement>('li button')?.click();
    await settle();
    fixture.destroy();
    expect(query.listener).toBeNull();
    expect(sheet()).toBeNull();
  });

  it('keeps the reading sheet open when a write is refused for a conflict', async () => {
    stubNarrow();
    const { backend, root, settle }: ReturnType<typeof setup> = setup();
    const toasts: ToastSpies = spyToasts();
    backend.expectOne(list('received')).flush({ member: [message], totalItems: 1 });
    await settle();
    root.querySelector<HTMLButtonElement>('li button')?.click();
    await settle();
    const sheet: HTMLElement | null = document.querySelector('[data-slot="sheet-content"]');
    expect(press('r', {}, sheet?.querySelector('h2') ?? window).defaultPrevented).toBe(true);
    backend
      .expectOne('/api/contact/admin/messages/m1/read')
      .flush(
        { code: 'contact.version-mismatch' },
        { status: 412, statusText: 'Precondition Failed' },
      );
    await settle();
    backend
      .expectOne(list('received'))
      .flush({ member: [{ ...message, version: 2 }], totalItems: 1 });
    await settle();
    expect(toasts.warning).toHaveBeenCalledOnce();
    expect(document.querySelector('[data-slot="sheet-content"]')).not.toBeNull();
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
    backend.expectOne(list('received')).flush({ member: full, totalItems: 21 });
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
      .expectOne(list('received', 2))
      .flush({ member: [{ ...message, id: 'last' }], totalItems: 21 });
    await settle();
    expect(root.querySelector('nav')?.textContent).toContain('2 / 2');
    expect(button('Suivants')?.disabled).toBe(true);

    button('Précédents')?.click();
    await settle();
    backend.expectOne(list('received', 1)).flush({ member: full, totalItems: 21 });
    await settle();
    expect(root.querySelector('nav')?.textContent).toContain('1 / 2');
  });
});
