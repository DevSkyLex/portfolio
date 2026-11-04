import {
  DomainError,
  InvalidValueError,
  TimelineEntry,
  type TimelineEntryDraft,
  type TimelineKind,
} from '@vfortin/content-domain';
import {
  NotFoundError,
  VersionMismatchError,
} from '@internal/content-application/lib/errors/application-error';
import {
  FixedClock,
  InMemoryTimeline,
  SequenceIds,
} from '@internal/content-application/lib/testing/content.fakes';
import {
  CreateTimelineEntry,
  type TimelineEntryChangeResult,
} from '@internal/content-application/lib/use-cases/create-timeline-entry/create-timeline-entry.use-case';
import { DeleteTimelineEntry } from '@internal/content-application/lib/use-cases/delete-timeline-entry/delete-timeline-entry.use-case';
import { GetAdminTimelineEntry } from '@internal/content-application/lib/use-cases/get-admin-timeline-entry/get-admin-timeline-entry.use-case';
import {
  type AdminTimelineView,
  ListAdminTimeline,
} from '@internal/content-application/lib/use-cases/list-admin-timeline/list-admin-timeline.use-case';
import {
  ReorderTimeline,
  type TimelineListChangeResult,
} from '@internal/content-application/lib/use-cases/reorder-timeline/reorder-timeline.use-case';
import type { MockInstance } from 'vitest';
import { ReviseTimelineEntry } from '@internal/content-application/lib/use-cases/revise-timeline-entry/revise-timeline-entry.use-case';

/**
 * Constant DRAFT
 *
 * @description
 * Complete bilingual entry content.
 */
const DRAFT: TimelineEntryDraft = {
  title: { fr: 'Développeur', en: 'Developer' },
  place: { fr: 'Tours', en: 'Tours' },
  description: { fr: 'Interfaces.', en: 'Interfaces.' },
  start: { year: 2023, month: 9 },
  end: { year: 2026, month: 6 },
  techs: ['angular'],
};

/**
 * Function stored
 *
 * @description
 * Builds a stored entry.
 *
 * @param {string} id - Identifier.
 * @param {number} position - Position within the kind.
 * @param {TimelineKind} kind - Kind.
 * @returns {TimelineEntry} Entry at version 1.
 */
function stored(id: string, position: number, kind: TimelineKind = 'experience'): TimelineEntry {
  return TimelineEntry.create({ id, kind, position }, TimelineEntry.revisionOf(DRAFT));
}

/**
 * Function ids
 *
 * @description
 * Identifiers of a list view, in order.
 *
 * @param {AdminTimelineView} view - List view.
 * @returns {string[]} Identifiers.
 */
const ids = (view: AdminTimelineView): string[] =>
  view.entries.map((entry: TimelineEntry): string => entry.id);

/**
 * Function setup
 *
 * @description
 * Creates the in-memory timeline with three experiences and one education entry, and the use cases.
 *
 * @returns {object} Store and use cases.
 */
function setup(): {
  readonly store: InMemoryTimeline;
  readonly list: ListAdminTimeline;
  readonly get: GetAdminTimelineEntry;
  readonly create: CreateTimelineEntry;
  readonly revise: ReviseTimelineEntry;
  readonly remove: DeleteTimelineEntry;
  readonly reorder: ReorderTimeline;
} {
  const store: InMemoryTimeline = new InMemoryTimeline([
    stored('a', 0),
    stored('b', 1),
    stored('c', 2),
    stored('bts', 0, 'education'),
  ]);
  const clock: FixedClock = new FixedClock();
  return {
    store,
    list: new ListAdminTimeline(store.entries, store.lists),
    get: new GetAdminTimelineEntry(store.entries),
    create: new CreateTimelineEntry(store, new SequenceIds(), clock),
    revise: new ReviseTimelineEntry(store, clock),
    remove: new DeleteTimelineEntry(store, clock),
    reorder: new ReorderTimeline(store, clock),
  };
}

describe('ListAdminTimeline', (): void => {
  it('lists one kind by position with its list version', async (): Promise<void> => {
    const { list } = setup();
    const view: AdminTimelineView = await list.execute('experience');
    expect(view).toMatchObject({ kind: 'experience', version: 1 });
    expect(ids(view)).toEqual(['a', 'b', 'c']);
    expect(ids(await list.execute('education'))).toEqual(['bts']);
  });
});

describe('GetAdminTimelineEntry', (): void => {
  it('loads an entry of the route kind and hides the other kind', async (): Promise<void> => {
    const { get } = setup();
    expect((await get.execute('experience', 'b')).position).toBe(1);
    await expect(get.execute('experience', 'bts')).rejects.toBeInstanceOf(NotFoundError);
    await expect(get.execute('education', 'missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('CreateTimelineEntry', (): void => {
  it('appends the entry, bumps the list version and requests a rebuild', async (): Promise<void> => {
    const { create, store } = setup();
    const result: TimelineEntryChangeResult = await create.execute('experience', DRAFT);
    expect(result.entry.id).toBe('00000000-0000-4000-8000-000000000001');
    expect(result).toMatchObject({ version: 1, revision: 2 });
    expect(result.entry.position).toBe(3);
    expect(store.listVersions.get('experience')).toBe(2);
    expect(store.listVersions.get('education')).toBe(1);
    expect(store.requests).toEqual([2]);
  });

  it('writes nothing for an incomplete entry', async (): Promise<void> => {
    const { create, store } = setup();
    const error: unknown = await create
      .execute('education', { ...DRAFT, title: { fr: 'Titre' } })
      .catch((e: unknown): unknown => e);
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe('content.timeline-entry-incomplete');
    expect(store.rows.size).toBe(4);
    expect(store.listVersions.get('education')).toBe(1);
    expect(store.requests).toEqual([]);
  });

  it('refuses an invalid draft before opening the unit of work', async (): Promise<void> => {
    const { create, store } = setup();
    const run: MockInstance<InMemoryTimeline['run']> = vi.spyOn(store, 'run');
    await expect(
      create.execute('experience', { ...DRAFT, end: { year: 2020, month: 1 } }),
    ).rejects.toBeInstanceOf(InvalidValueError);
    expect(run).not.toHaveBeenCalled();
  });
});

describe('ReviseTimelineEntry', (): void => {
  it('saves the content with If-Match, keeps the position and requests a rebuild', async (): Promise<void> => {
    const { revise, store } = setup();
    const result: TimelineEntryChangeResult = await revise.execute('experience', 'b', 1, {
      ...DRAFT,
      end: null,
      techs: ['php', 'symfony'],
    });
    expect(result).toMatchObject({ version: 2, revision: 2 });
    expect(store.rows.get('b')).toMatchObject({
      position: 1,
      version: 2,
      techs: ['php', 'symfony'],
    });
    expect(store.rows.get('b')?.period.isOngoing()).toBe(true);
    expect(store.listVersions.get('experience')).toBe(1);
  });

  it('rejects a stale version, an unknown entry and the other kind without a rebuild', async (): Promise<void> => {
    const { revise, store } = setup();
    await expect(revise.execute('experience', 'b', 7, DRAFT)).rejects.toBeInstanceOf(
      VersionMismatchError,
    );
    await expect(revise.execute('experience', 'zz', 1, DRAFT)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(revise.execute('education', 'b', 1, DRAFT)).rejects.toBeInstanceOf(NotFoundError);
    expect(store.requests).toEqual([]);
  });
});

describe('DeleteTimelineEntry', (): void => {
  it('deletes, renumbers the kind and requests a rebuild', async (): Promise<void> => {
    const { remove, store, list } = setup();
    const result: TimelineListChangeResult = await remove.execute('experience', 'a', 1);
    expect(result).toMatchObject({ kind: 'experience', version: 2, revision: 2 });
    expect(ids(result)).toEqual(['b', 'c']);
    const view: AdminTimelineView = await list.execute('experience');
    expect(ids(view)).toEqual(['b', 'c']);
    expect(view.entries.map((e: TimelineEntry): number => e.position)).toEqual([0, 1]);
    expect(view.version).toBe(2);
    expect(store.rows.get('b')?.version).toBe(1);
  });

  it('rolls back on a stale version', async (): Promise<void> => {
    const { remove, store } = setup();
    await expect(remove.execute('experience', 'a', 3)).rejects.toBeInstanceOf(VersionMismatchError);
    expect(store.rows.has('a')).toBe(true);
    expect(store.listVersions.get('experience')).toBe(1);
    expect(store.requests).toEqual([]);
  });

  it('deletes the last entry without moving the others', async (): Promise<void> => {
    const { remove, store } = setup();
    const move: MockInstance<InMemoryTimeline['entries']['move']> = vi.spyOn(store.entries, 'move');
    const result: TimelineListChangeResult = await remove.execute('experience', 'c', 1);
    expect(ids(result)).toEqual(['a', 'b']);
    expect(move).not.toHaveBeenCalled();
  });

  it('reports a stale version with the message the repository chose', async (): Promise<void> => {
    expect(new VersionMismatchError('The list changed.').message).toBe('The list changed.');
    expect(new VersionMismatchError().message).toBe(
      'The project was modified in the meantime; reload it.',
    );
  });

  it('reports an entry of the other kind as missing', async (): Promise<void> => {
    const { remove } = setup();
    await expect(remove.execute('experience', 'bts', 1)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ReorderTimeline', (): void => {
  it('moves the entries with If-Match on the list version, leaving their versions', async (): Promise<void> => {
    const { reorder, store } = setup();
    const result: TimelineListChangeResult = await reorder.execute('experience', 1, [
      'c',
      'a',
      'b',
    ]);
    expect(ids(result)).toEqual(['c', 'a', 'b']);
    expect(result).toMatchObject({ kind: 'experience', version: 2, revision: 2 });
    expect([...store.rows.values()].map((row) => [row.id, row.position, row.version])).toEqual([
      ['a', 1, 1],
      ['b', 2, 1],
      ['c', 0, 1],
      ['bts', 0, 1],
    ]);
  });

  it('bumps the version of an unchanged order without a rebuild', async (): Promise<void> => {
    const { reorder, store } = setup();
    expect(await reorder.execute('experience', 1, ['a', 'b', 'c'])).toMatchObject({
      version: 2,
      revision: null,
    });
    expect(store.requests).toEqual([]);
  });

  it('refuses a stale list version after a creation', async (): Promise<void> => {
    const { reorder, create } = setup();
    await create.execute('experience', DRAFT);
    await expect(reorder.execute('experience', 1, ['c', 'a', 'b'])).rejects.toBeInstanceOf(
      VersionMismatchError,
    );
  });

  it('refuses an order that is not a permutation and rolls back the version', async (): Promise<void> => {
    const { reorder, store } = setup();
    const error: unknown = await reorder
      .execute('experience', 1, ['a', 'b'])
      .catch((e: unknown): unknown => e);
    expect((error as DomainError).code).toBe('content.timeline-order-invalid');
    expect(store.listVersions.get('experience')).toBe(1);
  });
});
