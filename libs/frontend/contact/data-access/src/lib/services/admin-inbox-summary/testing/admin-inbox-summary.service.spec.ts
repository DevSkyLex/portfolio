import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AdminInboxSummaryService } from '@internal/contact-web-data-access/lib/services/admin-inbox-summary/admin-inbox-summary.service';
import { AdminMessagesApiService } from '@internal/contact-web-data-access/lib/services/admin-messages/admin-messages.service';
import { AdminInboxStore } from '@internal/contact-web-data-access/lib/state/admin-inbox/admin-inbox.store';
import type { AdminMessage } from '@internal/contact-web-data-access/lib/models/admin-message/admin-message.type';
import type { ContactMessageList } from '@vfortin/contact-contracts';

/**
 * Constant message
 *
 * @description
 * Readable inbox fixture with its observed version for write preconditions.
 */
const message: AdminMessage = {
  id: 'one',
  name: 'Test',
  company: null,
  email: 'test@example.test',
  subject: 'project',
  message: 'A project request',
  locale: 'fr',
  status: 'received',
  receivedAt: '2026-01-01T00:00:00Z',
  purgeAt: '2027-01-01T00:00:00Z',
  version: 1,
};

/**
 * Function page
 *
 * @description
 * Builds an authoritative count response for the summary contract.
 * @param {number} count - Received message count.
 * @returns {ContactMessageList} One-page response.
 */
function page(count: number): ContactMessageList {
  return { member: [], totalItems: count, view: { page: 1, pageSize: 20 } };
}

describe('AdminInboxSummaryService', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('distinguishes unknown and failed counts from successful zero', async () => {
    const api: { list: Mock<AdminMessagesApiService['list']> } = {
      list: vi
        .fn<AdminMessagesApiService['list']>()
        .mockReturnValue(throwError(() => new Error('offline'))),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: AdminMessagesApiService, useValue: api }],
    });
    const summary: AdminInboxSummaryService =
      TestBed.inject<AdminInboxSummaryService>(AdminInboxSummaryService);
    expect(summary.count()).toBeNull();
    await summary.refresh();
    expect(summary.count()).toBeNull();
    expect(summary.callState().status).toBe('error');
    api.list.mockReturnValue(of(page(0)));
    await summary.refresh();
    expect(summary.count()).toBe(0);
    expect(summary.callState().status).toBe('success');
  });
  it('discards an older count after a newer refresh', async () => {
    const first: Subject<ContactMessageList> = new Subject<ContactMessageList>();
    const second: Subject<ContactMessageList> = new Subject<ContactMessageList>();
    const api: { list: Mock<AdminMessagesApiService['list']> } = {
      list: vi
        .fn<AdminMessagesApiService['list']>()
        .mockReturnValueOnce(first)
        .mockReturnValueOnce(second),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: AdminMessagesApiService, useValue: api }],
    });
    const summary: AdminInboxSummaryService =
      TestBed.inject<AdminInboxSummaryService>(AdminInboxSummaryService);
    const a: Promise<void> = summary.refresh();
    const b: Promise<void> = summary.refresh();
    second.next(page(2));
    await b;
    first.next(page(9));
    await a;
    expect(summary.count()).toBe(2);
  });
  it('refreshes active summary consumers after read, archive and removal without navigation', async () => {
    const api: {
      list: Mock<AdminMessagesApiService['list']>;
      transition: Mock<AdminMessagesApiService['transition']>;
      remove: Mock<AdminMessagesApiService['remove']>;
    } = {
      list: vi.fn<AdminMessagesApiService['list']>().mockReturnValue(of(page(3))),
      transition: vi
        .fn<AdminMessagesApiService['transition']>()
        .mockReturnValue(of({ ...message, status: 'read' })),
      remove: vi.fn<AdminMessagesApiService['remove']>().mockReturnValue(of(undefined)),
    };
    TestBed.configureTestingModule({
      providers: [AdminInboxStore, { provide: AdminMessagesApiService, useValue: api }],
    });
    const summary: AdminInboxSummaryService =
      TestBed.inject<AdminInboxSummaryService>(AdminInboxSummaryService);
    const store: InstanceType<typeof AdminInboxStore> =
      TestBed.inject<InstanceType<typeof AdminInboxStore>>(AdminInboxStore);
    await summary.refresh();
    api.list.mockReturnValue(of(page(2)));
    await store.markRead(message);
    expect(summary.count()).toBe(2);
    api.list.mockReturnValue(of(page(1)));
    await store.archive(message);
    expect(summary.count()).toBe(1);
    api.list.mockReturnValue(of(page(0)));
    await store.remove(message);
    expect(summary.count()).toBe(0);
  });
});
