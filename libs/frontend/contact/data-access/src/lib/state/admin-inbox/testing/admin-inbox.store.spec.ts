import { provideHttpClient } from '@angular/common/http';
import {
  type TestRequest,
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { INBOX_PAGE_SIZE } from '@internal/contact-web-data-access/lib/constants/admin-messages.constants';
import type { AdminMessage } from '@internal/contact-web-data-access/lib/models/admin-message/admin-message.type';
import { AdminInboxStore } from '@internal/contact-web-data-access/lib/state/admin-inbox/admin-inbox.store';

/**
 * Function message
 *
 * @description
 * Builds a received inbox message fixture with a caller-supplied identifier.
 *
 * @param {string} id - Identifier assigned to the fixture.
 *
 * @returns {AdminMessage} Message used to exercise pagination and status transitions.
 */
const message = (id: string): AdminMessage => ({
  id,
  name: 'Camille Martin',
  company: null,
  email: 'camille@exemple.fr',
  subject: 'job',
  message: 'Bonjour, nous recrutons.',
  locale: 'fr',
  status: 'received',
  receivedAt: '2026-11-02T10:00:00.000Z',
  purgeAt: '2029-11-02T10:00:00.000Z',
  version: 1,
});

/**
 * Function flush
 *
 * @description
 * Advances a timer turn so asynchronous inbox store state can settle.
 *
 * @returns {Promise<void>} Resolves on the next timer turn.
 */
const flush: () => Promise<unknown> = (): Promise<unknown> =>
  new Promise((resolve) => setTimeout(resolve));

/**
 * Function setup
 *
 * @description
 * Configures HTTP testing and provides a fresh inbox store with its request backend.
 *
 * @returns {{ store: InstanceType<typeof AdminInboxStore>; backend: HttpTestingController }} Test dependencies for one inbox store case.
 */
function setup(): { store: InstanceType<typeof AdminInboxStore>; backend: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), AdminInboxStore],
  });
  return {
    store: TestBed.inject<InstanceType<typeof AdminInboxStore>>(AdminInboxStore),
    backend: TestBed.inject<HttpTestingController>(HttpTestingController),
  };
}

/**
 * Function listCall
 *
 * @description
 * Selects the pending inbox collection request for its expected status and page query.
 *
 * @param {HttpTestingController} backend - Mock backend containing the request.
 * @param {string | null} status - Expected status filter, or `null` when omitted.
 * @param {number} page - Expected one-based page number.
 *
 * @returns Matching pending HTTP request for the test to flush.
 */
const listCall: (
  backend: HttpTestingController,
  status: string | null,
  page: number,
) => TestRequest = (
  backend: HttpTestingController,
  status: string | null,
  page: number,
): TestRequest =>
  backend.expectOne(
    (r) =>
      r.url === '/api/contact/admin/messages' &&
      r.params.get('status') === status &&
      r.params.get('page') === String(page),
  );

describe('AdminInboxStore', () => {
  it('drops the answer of a list request overtaken by a new filter', async () => {
    const { store, backend }: ReturnType<typeof setup> = setup();
    const first: Promise<void> = store.load();
    const second: Promise<void> = store.filter('archived');
    const late: TestRequest = listCall(backend, 'received', 1);
    listCall(backend, 'archived', 1).flush({ member: [message('a2')], totalItems: 1 });
    await second;
    late.flush({ member: [message('r1'), message('r2')], totalItems: 2 });
    await first;
    expect(store.messages().map((m) => m.id)).toEqual(['a2']);
    expect(store.total()).toBe(1);
    expect(store.loading()).toBe(false);
  });

  it('drops a late failure as well', async () => {
    const { store, backend }: ReturnType<typeof setup> = setup();
    const first: Promise<void> = store.load();
    const second: Promise<void> = store.filter(null);
    const late: TestRequest = listCall(backend, 'received', 1);
    listCall(backend, null, 1).flush({ member: [message('m1')], totalItems: 1 });
    await second;
    late.flush(null, { status: 500, statusText: 'Server Error' });
    await first;
    expect(store.error()).toBeNull();
    expect(store.messages()).toHaveLength(1);
  });

  it('goes back one page when the last message of the last page leaves', async () => {
    const { store, backend }: ReturnType<typeof setup> = setup();
    const full: AdminMessage[] = Array.from({ length: INBOX_PAGE_SIZE }, (_, i) =>
      message(`m${i}`),
    );
    const loading: Promise<void> = store.load();
    listCall(backend, 'received', 1).flush({ member: full, totalItems: INBOX_PAGE_SIZE + 1 });
    await loading;
    const paging: Promise<void> = store.goTo(2);
    listCall(backend, 'received', 2).flush({
      member: [message('last')],
      totalItems: INBOX_PAGE_SIZE + 1,
    });
    await paging;
    expect(store.pages()).toBe(2);

    const removing: Promise<void> = store.remove(message('last'));
    backend.expectOne('/api/contact/admin/messages/last').flush(null);
    await flush();
    listCall(backend, 'received', 2).flush({ member: [], totalItems: INBOX_PAGE_SIZE });
    await flush();
    listCall(backend, 'received', 1).flush({ member: full, totalItems: INBOX_PAGE_SIZE });
    await removing;
    expect(store.page()).toBe(1);
    expect(store.pages()).toBe(1);
    expect(store.messages()).toHaveLength(INBOX_PAGE_SIZE);
  });

  it('marks as read and archives with If-Match, then reloads, showing a conflict', async () => {
    const { store, backend }: ReturnType<typeof setup> = setup();
    const reading: Promise<void> = store.markRead(message('m1'));
    expect(store.writing()).toBe(true);
    const read: TestRequest = backend.expectOne('/api/contact/admin/messages/m1/read');
    expect(read.request.headers.get('if-match')).toBe('"1"');
    read.flush({ ...message('m1'), status: 'read', version: 2 });
    await flush();
    listCall(backend, 'received', 1).flush({ member: [], totalItems: 0 });
    await reading;
    expect(store.writeCallState().status).toBe('success');
    expect(store.conflict()).toBe(false);

    const archiving: Promise<void> = store.archive(message('m2'));
    backend
      .expectOne('/api/contact/admin/messages/m2/archive')
      .flush(
        { code: 'contact.version-mismatch' },
        { status: 412, statusText: 'Precondition Failed' },
      );
    await flush();
    listCall(backend, 'received', 1).flush({ member: [message('m2')], totalItems: 1 });
    await archiving;
    expect(store.error()?.status).toBe(412);
    expect(store.conflict()).toBe(true);
    expect(store.messages()).toHaveLength(1);
  });
});
