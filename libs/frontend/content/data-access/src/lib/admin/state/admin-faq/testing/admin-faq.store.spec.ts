import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { type Observable, Subject, of, throwError } from 'rxjs';
import type { Mock } from 'vitest';
import type { AdminFaqEntry } from '@internal/content-web-data-access/lib/admin/models/admin-faq-entry/admin-faq-entry.interface';
import type { AdminFaqList } from '@internal/content-web-data-access/lib/admin/models/admin-faq-list/admin-faq-list.interface';
import { AdminFaqApiService } from '@internal/content-web-data-access/lib/admin/services/admin-faq/admin-faq.service';
import { AdminFaqStore } from '@internal/content-web-data-access/lib/admin/state/admin-faq/admin-faq.store';
import {
  emptyFaqEntryDraft,
  toFaqEntryDraft,
} from '@internal/content-web-data-access/lib/admin/utils/faq-entry-draft/faq-entry-draft.utils';

/**
 * Function entry
 *
 * @description
 * Builds a FAQ view model.
 *
 * @param {string} id - Identifier.
 * @param {number} position - Position.
 * @param {number} version - Entry version.
 *
 * @returns {AdminFaqEntry} Entry.
 */
const entry = (id: string, position: number, version: number = 1): AdminFaqEntry => ({
  id,
  position,
  version,
  question: { fr: `Question ${id}`, en: `Question ${id}` },
  answer: { fr: 'Réponse.', en: 'Answer.' },
});

/**
 * Function list
 *
 * @description
 * Builds a list view model from identifiers in order.
 *
 * @param {number} version - List version.
 * @param {readonly string[]} ids - Identifiers in order.
 *
 * @returns {AdminFaqList} List.
 */
const list = (version: number, ids: readonly string[]): AdminFaqList => ({
  version,
  entries: ids.map((id: string, position: number): AdminFaqEntry => entry(id, position)),
});

/**
 * Function failure
 *
 * @description
 * HTTP error answered by the API.
 *
 * @param {number} status - HTTP status.
 * @param {unknown} error - Problem body.
 *
 * @returns {Observable<never>} Failing call.
 */
const failure = (status: number, error: unknown = null): Observable<never> =>
  throwError(() => new HttpErrorResponse({ status, error, url: '/api/content/admin/faq' }));

/**
 * Interface ApiMock
 *
 * @description
 * Mocked methods of the API service.
 */
interface ApiMock {
  list: Mock<() => Observable<AdminFaqList>>;
  get: Mock<(id: string) => Observable<AdminFaqEntry>>;
  create: Mock<AdminFaqApiService['create']>;
  revise: Mock<AdminFaqApiService['revise']>;
  remove: Mock<AdminFaqApiService['remove']>;
  reorder: Mock<AdminFaqApiService['reorder']>;
}

/**
 * Function setup
 *
 * @description
 * Creates the store over a mocked API service.
 *
 * @returns {{ store: InstanceType<typeof AdminFaqStore>; api: ApiMock }} Harness.
 */
function setup(): { store: InstanceType<typeof AdminFaqStore>; api: ApiMock } {
  const api: ApiMock = {
    list: vi.fn(() => of(list(4, ['a', 'b', 'c']))),
    get: vi.fn((id: string) => of(entry(id, 0, 3))),
    create: vi.fn(() => of(entry('new', 3))),
    revise: vi.fn(() => of(entry('b', 1, 2))),
    remove: vi.fn(() => of(list(5, ['b', 'c']))),
    reorder: vi.fn((_version: number, ids: readonly string[]) => of(list(5, ids))),
  };
  TestBed.configureTestingModule({
    providers: [{ provide: AdminFaqApiService, useValue: api }, AdminFaqStore],
  });
  return { store: TestBed.inject<InstanceType<typeof AdminFaqStore>>(AdminFaqStore), api };
}

/**
 * Function ids
 *
 * @description
 * Identifiers of the stored entries in order.
 *
 * @param {InstanceType<typeof AdminFaqStore>} store - Store.
 *
 * @returns {string[]} Identifiers.
 */
const ids = (store: InstanceType<typeof AdminFaqStore>): string[] =>
  store.entries().map((item: AdminFaqEntry): string => item.id);

describe('AdminFaqStore', (): void => {
  it('loads the list with its version, then reports a failed load', async (): Promise<void> => {
    const { store, api } = setup();
    await store.load();
    expect(store.version()).toBe(4);
    expect(ids(store)).toEqual(['a', 'b', 'c']);

    api.list.mockReturnValueOnce(failure(500));
    await store.load();
    expect(store.loadCallState().status).toBe('error');
    expect(store.loadCallState().error?.retryable).toBe(true);
  });

  it('ignores an obsolete list answer and a cancelled read', async (): Promise<void> => {
    const { store, api } = setup();
    const first: Subject<AdminFaqList> = new Subject<AdminFaqList>();
    api.list.mockReturnValueOnce(first);
    const obsolete: Promise<void> = store.load();
    await store.load();
    first.next(list(9, ['x']));
    first.complete();
    await obsolete;
    expect(store.version()).toBe(4);

    const pending: Subject<AdminFaqList> = new Subject<AdminFaqList>();
    api.list.mockReturnValueOnce(pending);
    const cancelled: Promise<void> = store.load();
    store.cancelRead();
    expect(store.loading()).toBe(false);
    pending.next(list(8, ['y']));
    pending.complete();
    await cancelled;
    expect(store.version()).toBe(4);
  });

  it('loads one entry, or returns null for a missing one', async (): Promise<void> => {
    const { store, api } = setup();
    await expect(store.loadOne('a')).resolves.toMatchObject({ id: 'a', version: 3 });
    expect(api.get).toHaveBeenCalledWith('a');

    api.get.mockReturnValueOnce(failure(404, { code: 'content.not-found' }));
    await expect(store.loadOne('x')).resolves.toBeNull();
    expect(store.loadCallState().error?.status).toBe(404);
  });

  it('creates from a trimmed draft and appends the entry', async (): Promise<void> => {
    const { store, api } = setup();
    await store.load();
    const created: AdminFaqEntry | null = await store.create({
      ...emptyFaqEntryDraft(),
      question: { fr: ' Q ', en: '' },
      answer: { fr: 'R', en: 'A' },
    });
    expect(created?.id).toBe('new');
    expect(api.create).toHaveBeenCalledWith({
      question: { fr: 'Q' },
      answer: { fr: 'R', en: 'A' },
    });
    expect(ids(store)).toEqual(['a', 'b', 'c', 'new']);
  });

  it('saves in place, and returns the field errors of a refused save', async (): Promise<void> => {
    const { store, api } = setup();
    await store.load();
    const target: AdminFaqEntry = store.entries()[1] as AdminFaqEntry;
    await store.save(target, toFaqEntryDraft(target));
    expect(api.revise).toHaveBeenCalledWith(target, expect.any(Object));
    expect(store.entries()[1]?.version).toBe(2);
    expect(ids(store)).toEqual(['a', 'b', 'c']);

    api.revise.mockReturnValueOnce(
      failure(422, {
        code: 'content.faq-entry-incomplete',
        errors: [{ field: 'answer.en', message: 'English required.' }],
      }),
    );
    await expect(store.save(target, toFaqEntryDraft(target))).resolves.toBeNull();
    expect(store.writeError()?.fieldErrors).toEqual([
      { field: 'answer.en', message: 'English required.' },
    ]);
    expect(store.conflict()).toBe(false);
  });

  it('deletes and keeps the remaining list and version, or flags a conflict', async (): Promise<void> => {
    const { store, api } = setup();
    await store.load();
    await store.remove(store.entries()[0] as AdminFaqEntry);
    expect(store.version()).toBe(5);
    expect(ids(store)).toEqual(['b', 'c']);

    api.remove.mockReturnValueOnce(failure(412, { code: 'content.version-mismatch' }));
    await expect(store.remove(store.entries()[0] as AdminFaqEntry)).resolves.toBeNull();
    expect(store.conflict()).toBe(true);
    expect(ids(store)).toEqual(['b', 'c']);
    store.resetWriteState();
    expect(store.conflict()).toBe(false);
  });

  it('moves an entry at once and stores the order with the list version', async (): Promise<void> => {
    const { store, api } = setup();
    await store.load();
    const answer: Subject<AdminFaqList> = new Subject<AdminFaqList>();
    api.reorder.mockReturnValueOnce(answer);
    const moving: Promise<AdminFaqList | null> = store.move(2, 0);
    expect(ids(store)).toEqual(['c', 'a', 'b']);
    expect(api.reorder).toHaveBeenCalledWith(4, ['c', 'a', 'b']);
    answer.next(list(5, ['c', 'a', 'b']));
    answer.complete();
    await moving;
    expect(store.version()).toBe(5);
  });

  it('restores the order when a move is refused, and ignores a move that changes nothing', async (): Promise<void> => {
    const { store, api } = setup();
    await store.load();
    api.reorder.mockReturnValueOnce(failure(412, { code: 'content.version-mismatch' }));
    await expect(store.move(0, 1)).resolves.toBeNull();
    expect(ids(store)).toEqual(['a', 'b', 'c']);
    expect(store.version()).toBe(4);
    expect(store.conflict()).toBe(true);

    api.reorder.mockClear();
    await expect(store.move(1, 1)).resolves.toBeNull();
    await expect(store.move(0, 3)).resolves.toBeNull();
    expect(api.reorder).not.toHaveBeenCalled();
  });
});
