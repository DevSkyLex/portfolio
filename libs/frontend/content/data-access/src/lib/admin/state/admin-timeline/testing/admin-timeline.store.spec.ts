import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type {
  AdminTimelineEntryDto,
  AdminTimelineList as AdminTimelineListDto,
} from '@vfortin/content-contracts';
import type { AdminTimelineEntry } from '@internal/content-web-data-access/lib/admin/models/admin-timeline-entry/admin-timeline-entry.interface';
import type { AdminTimelineList } from '@internal/content-web-data-access/lib/admin/models/admin-timeline-list/admin-timeline-list.interface';
import { AdminTimelineStore } from '@internal/content-web-data-access/lib/admin/state/admin-timeline/admin-timeline.store';
import {
  emptyTimelineEntryDraft,
  toTimelineEntryDraft,
} from '@internal/content-web-data-access/lib/admin/utils/timeline-entry-draft/timeline-entry-draft.utils';
import type { TimelineEntryDraft } from '@internal/content-web-data-access/lib/admin/models/timeline-entry-draft/timeline-entry-draft.interface';

/**
 * Constant BASE
 *
 * @description
 * Experience endpoint of the API.
 *
 * @type {string}
 */
const BASE: string = '/api/content/admin/timeline/experience';

/**
 * Function dto
 *
 * @description
 * Builds an experience DTO.
 *
 * @param {string} id - Identifier.
 * @param {number} position - Position.
 * @param {number} version - Entry version.
 *
 * @returns {AdminTimelineEntryDto} Entry DTO.
 */
const dto = (id: string, position: number, version: number = 1): AdminTimelineEntryDto => ({
  id,
  kind: 'experience',
  position,
  version,
  title: { fr: `Poste ${id}`, en: `Job ${id}` },
  place: { fr: 'Ville-Exemple', en: 'Ville-Exemple' },
  description: { fr: 'Texte.', en: 'Text.' },
  start: { year: 2023, month: 9 },
  end: null,
  techs: [],
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
 * @returns {AdminTimelineListDto} List DTO.
 */
const list = (version: number, ids: readonly string[]): AdminTimelineListDto => ({
  kind: 'experience',
  version,
  totalItems: ids.length,
  member: ids.map((id: string, position: number): AdminTimelineEntryDto => dto(id, position)),
});

/**
 * Function setup
 *
 * @description
 * Creates the store and the HTTP testing backend.
 *
 * @returns {{ store: InstanceType<typeof AdminTimelineStore>; backend: HttpTestingController }} Harness.
 */
function setup(): {
  store: InstanceType<typeof AdminTimelineStore>;
  backend: HttpTestingController;
} {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), AdminTimelineStore],
  });
  return {
    store: TestBed.inject<InstanceType<typeof AdminTimelineStore>>(AdminTimelineStore),
    backend: TestBed.inject<HttpTestingController>(HttpTestingController),
  };
}

/**
 * Function loaded
 *
 * @description
 * Loads three experiences at list version 4.
 *
 * @param {ReturnType<typeof setup>} harness - Store and backend.
 *
 * @returns {Promise<void>} Completion after the load.
 */
async function loaded({ store, backend }: ReturnType<typeof setup>): Promise<void> {
  const loading: Promise<void> = store.load('experience');
  backend.expectOne(`${BASE}/entries`).flush(list(4, ['a', 'b', 'c']));
  await loading;
}

describe('AdminTimelineStore', (): void => {
  afterEach((): void => TestBed.inject<HttpTestingController>(HttpTestingController).verify());

  it('loads a kind with its list version, then reports a failed load', async (): Promise<void> => {
    const harness: ReturnType<typeof setup> = setup();
    await loaded(harness);
    const { store, backend } = harness;
    expect(store.kind()).toBe('experience');
    expect(store.version()).toBe(4);
    expect(store.entries().map((e: AdminTimelineEntry): string => e.id)).toEqual(['a', 'b', 'c']);

    const failing: Promise<void> = store.load('experience');
    expect(store.loading()).toBe(true);
    backend.expectOne(`${BASE}/entries`).flush(null, { status: 500, statusText: 'Server Error' });
    await failing;
    expect(store.loadCallState().status).toBe('error');
    expect(store.loadCallState().error?.retryable).toBe(true);
  });

  it('ignores an obsolete list answer', async (): Promise<void> => {
    const { store, backend } = setup();
    const first: Promise<void> = store.load('experience');
    const second: Promise<void> = store.load('education');
    const calls: TestRequest[] = backend.match((): boolean => true);
    calls[1]?.flush({ ...list(2, ['bts']), kind: 'education' });
    calls[0]?.flush(list(9, ['a']));
    await Promise.all([first, second]);
    expect(store.kind()).toBe('education');
    expect(store.version()).toBe(2);
  });

  it('loads one entry, or returns null for a missing one', async (): Promise<void> => {
    const { store, backend } = setup();
    const one: Promise<AdminTimelineEntry | null> = store.loadOne('experience', 'a b');
    backend.expectOne(`${BASE}/entries/a%20b`).flush(dto('a b', 0, 3));
    await expect(one).resolves.toMatchObject({ id: 'a b', version: 3 });

    const missing: Promise<AdminTimelineEntry | null> = store.loadOne('experience', 'x');
    backend
      .expectOne(`${BASE}/entries/x`)
      .flush({ code: 'content.not-found' }, { status: 404, statusText: 'Not Found' });
    await expect(missing).resolves.toBeNull();
    expect(store.loadCallState().error?.status).toBe(404);
  });

  it('creates an entry from a draft', async (): Promise<void> => {
    const { store, backend } = setup();
    const draft: TimelineEntryDraft = {
      ...emptyTimelineEntryDraft(),
      title: { fr: 'Stage', en: 'Internship' },
      place: { fr: 'Ville-Exemple', en: 'Ville-Exemple' },
      description: { fr: 'Outils.', en: 'Tools.' },
      startMonth: 2,
      startYear: 2025,
      ongoing: true,
    };
    const creating: Promise<AdminTimelineEntry | null> = store.create('experience', draft);
    const call: TestRequest = backend.expectOne(`${BASE}/entries`);
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toMatchObject({ start: { year: 2025, month: 2 }, end: null });
    call.flush(dto('new', 3));
    await expect(creating).resolves.toMatchObject({ id: 'new', position: 3 });
    expect(store.entries()).toHaveLength(1);
  });

  it('saves with the entry version and returns field errors of a refused save', async (): Promise<void> => {
    const harness: ReturnType<typeof setup> = setup();
    await loaded(harness);
    const { store, backend } = harness;
    const entry: AdminTimelineEntry = store.entries()[1] as AdminTimelineEntry;
    const saving: Promise<AdminTimelineEntry | null> = store.save(
      entry,
      toTimelineEntryDraft(entry),
    );
    const call: TestRequest = backend.expectOne(`${BASE}/entries/b`);
    expect(call.request.method).toBe('PUT');
    expect(call.request.headers.get('if-match')).toBe('"1"');
    call.flush({ ...dto('b', 1, 2), place: { fr: 'Paris', en: 'Paris' } });
    await saving;
    expect(store.entries()[1]).toMatchObject({ version: 2, place: { fr: 'Paris' } });

    const refused: Promise<AdminTimelineEntry | null> = store.save(
      entry,
      toTimelineEntryDraft(entry),
    );
    backend.expectOne(`${BASE}/entries/b`).flush(
      {
        code: 'content.timeline-entry-incomplete',
        errors: [{ field: 'title.en', message: 'English required.' }],
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    await expect(refused).resolves.toBeNull();
    expect(store.writeError()?.fieldErrors).toEqual([
      { field: 'title.en', message: 'English required.' },
    ]);
    expect(store.conflict()).toBe(false);
  });

  it('keeps the list most recent first, whatever the API order, also after a save', async (): Promise<void> => {
    const { store, backend } = setup();
    const loading: Promise<void> = store.load('experience');
    backend.expectOne(`${BASE}/entries`).flush({
      ...list(4, []),
      totalItems: 4,
      member: [
        { ...dto('old', 0), start: { year: 2021, month: 9 }, end: { year: 2023, month: 6 } },
        { ...dto('ended', 1), start: { year: 2023, month: 9 }, end: { year: 2024, month: 6 } },
        { ...dto('recent', 2), start: { year: 2025, month: 1 }, end: { year: 2025, month: 3 } },
        // Same start as « ended », still ongoing: it comes first.
        { ...dto('ongoing', 3), start: { year: 2023, month: 9 }, end: null },
      ],
    });
    await loading;
    const ids = (): string[] => store.entries().map((e: AdminTimelineEntry): string => e.id);
    expect(ids()).toEqual(['recent', 'ongoing', 'ended', 'old']);

    const old: AdminTimelineEntry = store.entries()[3] as AdminTimelineEntry;
    const saving: Promise<AdminTimelineEntry | null> = store.save(old, toTimelineEntryDraft(old));
    backend
      .expectOne(`${BASE}/entries/old`)
      .flush({ ...dto('old', 0, 2), start: { year: 2026, month: 2 }, end: null });
    await saving;
    // The new start takes the entry to the top.
    expect(ids()).toEqual(['old', 'recent', 'ongoing', 'ended']);
  });

  it('flags a stale entry version as a conflict and keeps the list', async (): Promise<void> => {
    const harness: ReturnType<typeof setup> = setup();
    await loaded(harness);
    const { store, backend } = harness;
    const removing: Promise<AdminTimelineList | null> = store.remove(
      store.entries()[0] as AdminTimelineEntry,
    );
    backend
      .expectOne(`${BASE}/entries/a`)
      .flush(
        { code: 'content.version-mismatch' },
        { status: 412, statusText: 'Precondition Failed' },
      );
    await expect(removing).resolves.toBeNull();
    expect(store.conflict()).toBe(true);
    expect(store.entries().map((e: AdminTimelineEntry): string => e.id)).toEqual(['a', 'b', 'c']);
    store.resetWriteState();
    expect(store.conflict()).toBe(false);
  });

  it('deletes with the entry version and keeps the remaining list and version', async (): Promise<void> => {
    const harness: ReturnType<typeof setup> = setup();
    await loaded(harness);
    const { store, backend } = harness;
    const removing: Promise<AdminTimelineList | null> = store.remove(
      store.entries()[0] as AdminTimelineEntry,
    );
    const call: TestRequest = backend.expectOne(`${BASE}/entries/a`);
    expect(call.request.method).toBe('DELETE');
    expect(call.request.headers.get('if-match')).toBe('"1"');
    call.flush(list(5, ['b', 'c']));
    await removing;
    expect(store.version()).toBe(5);
    expect(store.entries().map((e: AdminTimelineEntry): string => e.id)).toEqual(['b', 'c']);
  });

  it('cancels a pending read', async (): Promise<void> => {
    const { store, backend } = setup();
    const loading: Promise<void> = store.load('experience');
    store.cancelRead();
    expect(store.loading()).toBe(false);
    backend.expectOne(`${BASE}/entries`).flush(list(4, ['a']));
    await loading;
    expect(store.entries()).toEqual([]);
  });
});
