import { provideHttpClient } from '@angular/common/http';
import {
  type TestRequest,
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { INBOX_PAGE_SIZE } from '@internal/contact-web-data-access/lib/constants/admin-messages.constants';
import type { AdminMessage } from '@internal/contact-web-data-access/lib/models/admin-message/admin-message.type';
import { AdminInboxSummaryService } from '@internal/contact-web-data-access/lib/services/admin-inbox-summary/admin-inbox-summary.service';
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
      r.params.get('page') === String(page) &&
      r.params.get('pageSize') === String(INBOX_PAGE_SIZE),
  );

/**
 * Function countCall
 *
 * @description
 * Selects the pending one-row request that counts the messages of every status.
 *
 * @param {HttpTestingController} backend - Mock backend containing the request.
 *
 * @returns Matching pending HTTP request for the test to flush.
 */
const countCall: (backend: HttpTestingController) => TestRequest = (
  backend: HttpTestingController,
): TestRequest =>
  backend.expectOne(
    (r) =>
      r.url === '/api/contact/admin/messages' &&
      !r.params.has('status') &&
      r.params.get('page') === '1' &&
      r.params.get('pageSize') === '1',
  );

describe('AdminInboxStore', () => {
  it('reads the owner unread count, unknown until the summary answers', () => {
    const { store }: ReturnType<typeof setup> = setup();
    expect(store.unread()).toBeNull();
    TestBed.inject<AdminInboxSummaryService>(AdminInboxSummaryService).count.set(3);
    expect(store.unread()).toBe(3);
  });

  it('drops the answer of a list request overtaken by a new filter', async () => {
    const { store, backend }: ReturnType<typeof setup> = setup();
    const first: Promise<void> = store.load();
    const second: Promise<void> = store.filter('archived');
    const late: TestRequest = listCall(backend, null, 1);
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
    const first: Promise<void> = store.filter('received');
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
    listCall(backend, null, 1).flush({ member: full, totalItems: INBOX_PAGE_SIZE + 1 });
    await loading;
    const paging: Promise<void> = store.goTo(2);
    listCall(backend, null, 2).flush({
      member: [message('last')],
      totalItems: INBOX_PAGE_SIZE + 1,
    });
    await paging;
    expect(store.pages()).toBe(2);

    const removing: Promise<void> = store.remove(message('last'));
    backend.expectOne('/api/contact/admin/messages/last').flush(null);
    await flush();
    listCall(backend, null, 2).flush({ member: [], totalItems: INBOX_PAGE_SIZE });
    await flush();
    listCall(backend, null, 1).flush({ member: full, totalItems: INBOX_PAGE_SIZE });
    await removing;
    expect(store.page()).toBe(1);
    expect(store.pages()).toBe(1);
    expect(store.messages()).toHaveLength(INBOX_PAGE_SIZE);
  });

  it('counts every status once beside a filtered list, and again after a deletion', async () => {
    const { store, backend }: ReturnType<typeof setup> = setup();
    const loading: Promise<void> = store.filter('received');
    expect(store.allTotal()).toBeNull();
    listCall(backend, 'received', 1).flush({ member: [message('m1')], totalItems: 1 });
    countCall(backend).flush({ member: [message('m1')], totalItems: 5 });
    await loading;
    await flush();
    expect(store.allTotal()).toBe(5);
    expect(store.total()).toBe(1);

    // Known: a filter change, a status change or a reload does not count again.
    const filtering: Promise<void> = store.filter('read');
    listCall(backend, 'read', 1).flush({ member: [], totalItems: 0 });
    await filtering;
    const reading: Promise<void> = store.markRead(message('m1'));
    backend.expectOne('/api/contact/admin/messages/m1/read').flush(message('m1'));
    await reading;
    backend.expectNone((r) => r.params.get('pageSize') === '1');

    const removing: Promise<void> = store.remove(message('m1'));
    backend.expectOne('/api/contact/admin/messages/m1').flush(null);
    await flush();
    listCall(backend, 'read', 1).flush({ member: [], totalItems: 0 });
    await removing;
    countCall(backend).flush({ member: [], totalItems: 4 });
    await flush();
    expect(store.allTotal()).toBe(4);
    expect(store.countCallState().status).toBe('success');
  });

  it('takes the overall count from an unfiltered list and drops an older count', async () => {
    const { store, backend }: ReturnType<typeof setup> = setup();
    const loading: Promise<void> = store.filter('received');
    const late: TestRequest = countCall(backend);
    listCall(backend, 'received', 1).flush({ member: [], totalItems: 0 });
    await loading;
    const all: Promise<void> = store.filter(null);
    listCall(backend, null, 1).flush({ member: [message('m1')], totalItems: 7 });
    await all;
    expect(store.allTotal()).toBe(7);
    late.flush({ member: [], totalItems: 3 });
    await flush();
    expect(store.allTotal()).toBe(7);

    // An unfiltered deletion reloads the list, which counts by itself.
    const removing: Promise<void> = store.remove(message('m1'));
    backend.expectOne('/api/contact/admin/messages/m1').flush(null);
    await flush();
    listCall(backend, null, 1).flush({ member: [], totalItems: 6 });
    await removing;
    expect(store.allTotal()).toBe(6);
    backend.expectNone((r) => r.params.get('pageSize') === '1');
  });

  it('keeps the overall count unknown after a failed count, and counts again on the next load', async () => {
    const { store, backend }: ReturnType<typeof setup> = setup();
    const loading: Promise<void> = store.filter('received');
    countCall(backend).flush(null, { status: 503, statusText: 'Unavailable' });
    listCall(backend, 'received', 1).flush({ member: [], totalItems: 0 });
    await loading;
    await flush();
    expect(store.allTotal()).toBeNull();
    expect(store.countCallState().status).toBe('error');
    expect(store.loadCallState().status).toBe('success');

    const again: Promise<void> = store.load();
    countCall(backend).flush({ member: [], totalItems: 2 });
    listCall(backend, 'received', 1).flush({ member: [], totalItems: 0 });
    await again;
    await flush();
    expect(store.allTotal()).toBe(2);
  });

  it('starts on every status, so the first load needs no separate count', async () => {
    const { store, backend }: ReturnType<typeof setup> = setup();
    expect(store.status()).toBeNull();
    const loading: Promise<void> = store.load();
    listCall(backend, null, 1).flush({ member: [message('m1')], totalItems: 3 });
    await loading;
    await flush();
    backend.expectNone((r) => r.params.get('pageSize') === '1');
    expect(store.allTotal()).toBe(3);
    expect(store.total()).toBe(3);
  });

  it('marks a message read in place with If-Match, keeping it on the unread filter until the next load', async () => {
    const { store, backend }: ReturnType<typeof setup> = setup();
    const loading: Promise<void> = store.filter('received');
    listCall(backend, 'received', 1).flush({
      member: [message('m1'), message('m2')],
      totalItems: 2,
    });
    countCall(backend).flush({ member: [], totalItems: 2 });
    await loading;
    expect(store.outdated()).toBe(0);

    const reading: Promise<void> = store.markRead(message('m1'));
    expect(store.writing()).toBe(true);
    const read: TestRequest = backend.expectOne('/api/contact/admin/messages/m1/read');
    expect(read.request.headers.get('if-match')).toBe('"1"');
    read.flush({ ...message('m1'), status: 'read', version: 2 });
    await reading;
    // No reload: the row takes the new status and version where it stands.
    backend.expectNone((r) => r.url === '/api/contact/admin/messages');
    expect(store.writeCallState().status).toBe('success');
    expect(store.conflict()).toBe(false);
    expect(store.messages().map((m) => [m.id, m.status, m.version])).toEqual([
      ['m1', 'read', 2],
      ['m2', 'received', 1],
    ]);
    expect(store.outdated()).toBe(1);
    expect(store.total()).toBe(2);

    const reloading: Promise<void> = store.load();
    listCall(backend, 'received', 1).flush({ member: [message('m2')], totalItems: 1 });
    await reloading;
    expect(store.outdated()).toBe(0);
  });

  it('keeps the row of a read that failed for another reason than a conflict', async () => {
    const { store, backend }: ReturnType<typeof setup> = setup();
    const loading: Promise<void> = store.load();
    listCall(backend, null, 1).flush({ member: [message('m1')], totalItems: 1 });
    await loading;
    const reading: Promise<void> = store.markRead(message('m1'));
    backend
      .expectOne('/api/contact/admin/messages/m1/read')
      .flush(null, { status: 503, statusText: 'Unavailable' });
    await reading;
    backend.expectNone((r) => r.url === '/api/contact/admin/messages');
    expect(store.error()?.status).toBe(503);
    expect(store.conflict()).toBe(false);
    expect(store.messages().map((m) => m.status)).toEqual(['received']);
  });

  it('reloads after a read or an archive refused for a conflict, showing it', async () => {
    const { store, backend }: ReturnType<typeof setup> = setup();
    const reading: Promise<void> = store.markRead(message('m1'));
    backend
      .expectOne('/api/contact/admin/messages/m1/read')
      .flush(
        { code: 'contact.version-mismatch' },
        { status: 412, statusText: 'Precondition Failed' },
      );
    await flush();
    listCall(backend, null, 1).flush({
      member: [{ ...message('m1'), status: 'read', version: 2 }],
      totalItems: 1,
    });
    await reading;
    expect(store.conflict()).toBe(true);
    expect(store.messages().map((m) => m.status)).toEqual(['read']);

    const archiving: Promise<void> = store.archive(message('m2'));
    backend
      .expectOne('/api/contact/admin/messages/m2/archive')
      .flush(
        { code: 'contact.version-mismatch' },
        { status: 412, statusText: 'Precondition Failed' },
      );
    await flush();
    listCall(backend, null, 1).flush({ member: [message('m2')], totalItems: 1 });
    await archiving;
    expect(store.error()?.status).toBe(412);
    expect(store.conflict()).toBe(true);
    expect(store.messages()).toHaveLength(1);
  });
});
