import type { AdminMessageStatus, AdminMessage } from '@vfortin/contact-web-data-access';

import { type HttpRequest, provideHttpClient } from '@angular/common/http';
import {
  type TestRequest,
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

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

describe('AdminInboxPageComponent', () => {
  it('shows unread messages, marks one as read with If-Match and reloads', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
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
  });

  it('moves through the list and acts on the open message from the keyboard', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const backend: HttpTestingController =
      TestBed.inject<HttpTestingController>(HttpTestingController);
    const fixture: ComponentFixture<AdminInboxPageComponent> =
      TestBed.createComponent(AdminInboxPageComponent);
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
    const press: (key: string, init?: KeyboardEventInit, target?: EventTarget) => KeyboardEvent = (
      key: string,
      init: KeyboardEventInit = {},
      target: EventTarget = window,
    ): KeyboardEvent => {
      const event: KeyboardEvent = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...init,
      });
      target.dispatchEvent(event);
      return event;
    };

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
    press('e');
    expect(
      backend.expectOne('/api/contact/admin/messages/m1/archive').request.headers.get('if-match'),
    ).toBe('"2"');
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

  it('shows a load failure as a danger alert and a write conflict as a warning', async () => {
    const { backend, root, settle }: ReturnType<typeof setup> = setup();
    backend.expectOne(list('received')).flush(null, { status: 500, statusText: 'Server Error' });
    await settle();
    const alert: () => Element | null = (): Element | null =>
      root.querySelector('[data-slot="alert"]');
    expect(alert()?.getAttribute('data-variant')).toBe('danger');
    expect(alert()?.getAttribute('role')).toBe('alert');

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
    expect(alert()?.getAttribute('data-variant')).toBe('warning');
    expect(alert()?.textContent).toContain('Ce message a changé entre-temps');
    expect(root.querySelector('[data-slot="badge"]')?.getAttribute('data-variant')).toBe('success');
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
