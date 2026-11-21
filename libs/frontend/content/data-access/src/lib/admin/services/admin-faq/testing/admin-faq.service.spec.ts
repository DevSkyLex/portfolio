import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type {
  AdminFaqEntryDto,
  AdminFaqList as AdminFaqListDto,
  FaqEntryRequest,
} from '@vfortin/content-contracts';
import { firstValueFrom } from 'rxjs';
import type { AdminFaqEntry } from '@internal/content-web-data-access/lib/admin/models/admin-faq-entry/admin-faq-entry.interface';
import type { AdminFaqList } from '@internal/content-web-data-access/lib/admin/models/admin-faq-list/admin-faq-list.interface';
import { AdminFaqApiService } from '@internal/content-web-data-access/lib/admin/services/admin-faq/admin-faq.service';

/**
 * Constant BASE
 *
 * @description
 * FAQ endpoint of the API.
 *
 * @type {string}
 */
const BASE: string = '/api/content/admin/faq';

/**
 * Function dto
 *
 * @description
 * Builds a FAQ entry DTO.
 *
 * @param {string} id - Identifier.
 * @param {number} position - Position.
 * @param {number} version - Entry version.
 *
 * @returns {AdminFaqEntryDto} Entry DTO.
 */
const dto = (id: string, position: number, version: number = 1): AdminFaqEntryDto => ({
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
 * Builds a list DTO from identifiers in order.
 *
 * @param {number} version - List version.
 * @param {readonly string[]} ids - Identifiers in order.
 *
 * @returns {AdminFaqListDto} List DTO.
 */
const list = (version: number, ids: readonly string[]): AdminFaqListDto => ({
  version,
  totalItems: ids.length,
  member: ids.map((id: string, position: number): AdminFaqEntryDto => dto(id, position)),
});

/**
 * Function setup
 *
 * @description
 * Creates the service and the HTTP testing backend.
 *
 * @returns {{ api: AdminFaqApiService; backend: HttpTestingController }} Harness.
 */
function setup(): { api: AdminFaqApiService; backend: HttpTestingController } {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return {
    api: TestBed.inject<AdminFaqApiService>(AdminFaqApiService),
    backend: TestBed.inject<HttpTestingController>(HttpTestingController),
  };
}

describe('AdminFaqApiService', (): void => {
  afterEach((): void => TestBed.inject<HttpTestingController>(HttpTestingController).verify());

  it('lists the entries by position, and reads one by its encoded identifier', async (): Promise<void> => {
    const { api, backend } = setup();
    const listing: Promise<AdminFaqList> = firstValueFrom(api.list());
    const call: TestRequest = backend.expectOne(`${BASE}/entries`);
    expect(call.request.method).toBe('GET');
    call.flush({ ...list(3, []), totalItems: 2, member: [dto('b', 1), dto('a', 0)] });
    const answered: AdminFaqList = await listing;
    expect(answered.version).toBe(3);
    expect(answered.entries.map((entry: AdminFaqEntry): string => entry.id)).toEqual(['a', 'b']);

    const one: Promise<AdminFaqEntry> = firstValueFrom(api.get('a b'));
    backend.expectOne(`${BASE}/entries/a%20b`).flush(dto('a b', 0, 4));
    await expect(one).resolves.toMatchObject({ id: 'a b', version: 4 });
  });

  it('creates without If-Match, revises and deletes with the entry version', async (): Promise<void> => {
    const { api, backend } = setup();
    const body: FaqEntryRequest = { question: { fr: 'Q', en: 'Q' }, answer: { fr: 'R', en: 'A' } };
    const creating: Promise<AdminFaqEntry> = firstValueFrom(api.create(body));
    const created: TestRequest = backend.expectOne(`${BASE}/entries`);
    expect(created.request.method).toBe('POST');
    expect(created.request.headers.has('if-match')).toBe(false);
    expect(created.request.body).toEqual(body);
    created.flush(dto('n', 2));
    const entry: AdminFaqEntry = await creating;

    const revising: Promise<AdminFaqEntry> = firstValueFrom(api.revise(entry, body));
    const revised: TestRequest = backend.expectOne(`${BASE}/entries/n`);
    expect(revised.request.method).toBe('PUT');
    expect(revised.request.headers.get('if-match')).toBe('"1"');
    revised.flush(dto('n', 2, 2));
    await expect(revising).resolves.toMatchObject({ version: 2 });

    const removing: Promise<AdminFaqList> = firstValueFrom(api.remove(entry));
    const removed: TestRequest = backend.expectOne(`${BASE}/entries/n`);
    expect(removed.request.method).toBe('DELETE');
    expect(removed.request.headers.get('if-match')).toBe('"1"');
    removed.flush(list(5, ['a']));
    await expect(removing).resolves.toMatchObject({ version: 5 });
  });

  it('reorders with the list version and the identifiers in order', async (): Promise<void> => {
    const { api, backend } = setup();
    const reordering: Promise<AdminFaqList> = firstValueFrom(api.reorder(4, ['b', 'a']));
    const call: TestRequest = backend.expectOne(`${BASE}/order`);
    expect(call.request.method).toBe('PUT');
    expect(call.request.headers.get('if-match')).toBe('"4"');
    expect(call.request.body).toEqual({ ids: ['b', 'a'] });
    call.flush(list(5, ['b', 'a']));
    await expect(reordering).resolves.toMatchObject({ version: 5 });
  });

  it('lets a refused write through untouched', async (): Promise<void> => {
    const { api, backend } = setup();
    const reordering: Promise<AdminFaqList> = firstValueFrom(api.reorder(4, ['a']));
    backend
      .expectOne(`${BASE}/order`)
      .flush(
        { code: 'content.version-mismatch' },
        { status: 412, statusText: 'Precondition Failed' },
      );
    await expect(reordering).rejects.toMatchObject({ status: 412 });
  });
});
