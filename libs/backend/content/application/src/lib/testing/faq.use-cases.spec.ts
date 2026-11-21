import {
  DomainError,
  FaqEntry,
  type FaqEntryDraft,
  InvalidValueError,
} from '@vfortin/content-domain';
import type { MockInstance } from 'vitest';
import {
  NotFoundError,
  VersionMismatchError,
} from '@internal/content-application/lib/errors/application-error';
import {
  FixedClock,
  InMemoryFaq,
  SequenceIds,
} from '@internal/content-application/lib/testing/content.fakes';
import {
  CreateFaqEntry,
  type FaqEntryChangeResult,
} from '@internal/content-application/lib/use-cases/create-faq-entry/create-faq-entry.use-case';
import { DeleteFaqEntry } from '@internal/content-application/lib/use-cases/delete-faq-entry/delete-faq-entry.use-case';
import { GetAdminFaqEntry } from '@internal/content-application/lib/use-cases/get-admin-faq-entry/get-admin-faq-entry.use-case';
import {
  type AdminFaqView,
  ListAdminFaq,
} from '@internal/content-application/lib/use-cases/list-admin-faq/list-admin-faq.use-case';
import {
  type FaqListChangeResult,
  ReorderFaq,
} from '@internal/content-application/lib/use-cases/reorder-faq/reorder-faq.use-case';
import { ReviseFaqEntry } from '@internal/content-application/lib/use-cases/revise-faq-entry/revise-faq-entry.use-case';

/**
 * Constant DRAFT
 *
 * @description
 * Complete bilingual question and answer.
 */
const DRAFT: FaqEntryDraft = {
  question: { fr: 'Travailles-tu à distance ?', en: 'Do you work remotely?' },
  answer: { fr: 'Oui.', en: 'Yes.' },
};

/**
 * Function stored
 *
 * @description
 * Builds a stored entry.
 *
 * @param {string} id - Identifier.
 * @param {number} position - Position in the list.
 * @returns {FaqEntry} Entry at version 1.
 */
function stored(id: string, position: number): FaqEntry {
  return FaqEntry.create({ id, position }, FaqEntry.revisionOf(DRAFT));
}

/**
 * Function ids
 *
 * @description
 * Identifiers of a list view, in order.
 *
 * @param {AdminFaqView} view - List view.
 * @returns {string[]} Identifiers.
 */
const ids = (view: AdminFaqView): string[] =>
  view.entries.map((entry: FaqEntry): string => entry.id);

/**
 * Function setup
 *
 * @description
 * Creates the in-memory FAQ with three entries, and the use cases.
 *
 * @returns {object} Store and use cases.
 */
function setup(): {
  readonly store: InMemoryFaq;
  readonly list: ListAdminFaq;
  readonly get: GetAdminFaqEntry;
  readonly create: CreateFaqEntry;
  readonly revise: ReviseFaqEntry;
  readonly remove: DeleteFaqEntry;
  readonly reorder: ReorderFaq;
} {
  const store: InMemoryFaq = new InMemoryFaq([stored('a', 0), stored('b', 1), stored('c', 2)]);
  const clock: FixedClock = new FixedClock();
  return {
    store,
    list: new ListAdminFaq(store.entries, store.lists),
    get: new GetAdminFaqEntry(store.entries),
    create: new CreateFaqEntry(store, new SequenceIds(), clock),
    revise: new ReviseFaqEntry(store, clock),
    remove: new DeleteFaqEntry(store, clock),
    reorder: new ReorderFaq(store, clock),
  };
}

describe('ListAdminFaq', (): void => {
  it('lists the entries by position with the list version', async (): Promise<void> => {
    const { list } = setup();
    const view: AdminFaqView = await list.execute();
    expect(view.version).toBe(1);
    expect(ids(view)).toEqual(['a', 'b', 'c']);
  });
});

describe('GetAdminFaqEntry', (): void => {
  it('loads an entry and reports a missing one', async (): Promise<void> => {
    const { get } = setup();
    expect((await get.execute('b')).position).toBe(1);
    await expect(get.execute('missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('CreateFaqEntry', (): void => {
  it('appends the entry, bumps the list version and requests a rebuild', async (): Promise<void> => {
    const { create, store } = setup();
    const result: FaqEntryChangeResult = await create.execute(DRAFT);
    expect(result.entry.id).toBe('00000000-0000-4000-8000-000000000001');
    expect(result).toMatchObject({ version: 1, revision: 2 });
    expect(result.entry.position).toBe(3);
    expect(store.listVersion).toBe(2);
    expect(store.requests).toEqual([2]);
  });

  it('writes nothing for an incomplete entry', async (): Promise<void> => {
    const { create, store } = setup();
    const error: unknown = await create
      .execute({ ...DRAFT, answer: { fr: 'Oui.' } })
      .catch((e: unknown): unknown => e);
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe('content.faq-entry-incomplete');
    expect(store.rows.size).toBe(3);
    expect(store.listVersion).toBe(1);
    expect(store.requests).toEqual([]);
  });

  it('refuses an invalid draft before opening the unit of work', async (): Promise<void> => {
    const { create, store } = setup();
    const run: MockInstance<InMemoryFaq['run']> = vi.spyOn(store, 'run');
    await expect(
      create.execute({ ...DRAFT, question: { fr: 'x'.repeat(201), en: 'Q' } }),
    ).rejects.toBeInstanceOf(InvalidValueError);
    expect(run).not.toHaveBeenCalled();
  });
});

describe('ReviseFaqEntry', (): void => {
  it('saves the content with If-Match, keeps the position and requests a rebuild', async (): Promise<void> => {
    const { revise, store } = setup();
    const result: FaqEntryChangeResult = await revise.execute('b', 1, {
      ...DRAFT,
      answer: { fr: 'Non.', en: 'No.' },
    });
    expect(result).toMatchObject({ version: 2, revision: 2 });
    expect(store.rows.get('b')).toMatchObject({ position: 1, version: 2 });
    expect(store.rows.get('b')?.answer.toProps()).toEqual({ fr: 'Non.', en: 'No.' });
    expect(store.listVersion).toBe(1);
  });

  it('rejects a stale version and an unknown entry without a rebuild', async (): Promise<void> => {
    const { revise, store } = setup();
    await expect(revise.execute('b', 7, DRAFT)).rejects.toBeInstanceOf(VersionMismatchError);
    await expect(revise.execute('zz', 1, DRAFT)).rejects.toBeInstanceOf(NotFoundError);
    expect(store.requests).toEqual([]);
  });
});

describe('DeleteFaqEntry', (): void => {
  it('deletes, renumbers the list and requests a rebuild', async (): Promise<void> => {
    const { remove, store, list } = setup();
    const result: FaqListChangeResult = await remove.execute('a', 1);
    expect(result).toMatchObject({ version: 2, revision: 2 });
    expect(ids(result)).toEqual(['b', 'c']);
    const view: AdminFaqView = await list.execute();
    expect(view.entries.map((e: FaqEntry): number => e.position)).toEqual([0, 1]);
    expect(view.version).toBe(2);
    expect(store.rows.get('b')?.version).toBe(1);
  });

  it('rolls back on a stale version', async (): Promise<void> => {
    const { remove, store } = setup();
    await expect(remove.execute('a', 3)).rejects.toBeInstanceOf(VersionMismatchError);
    expect(store.rows.has('a')).toBe(true);
    expect(store.listVersion).toBe(1);
    expect(store.requests).toEqual([]);
  });

  it('deletes the last entry without moving the others, and reports a missing one', async (): Promise<void> => {
    const { remove, store } = setup();
    const move: MockInstance<InMemoryFaq['entries']['move']> = vi.spyOn(store.entries, 'move');
    const result: FaqListChangeResult = await remove.execute('c', 1);
    expect(ids(result)).toEqual(['a', 'b']);
    expect(move).not.toHaveBeenCalled();
    await expect(remove.execute('zz', 1)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ReorderFaq', (): void => {
  it('moves the entries with If-Match on the list version, leaving their versions', async (): Promise<void> => {
    const { reorder, store } = setup();
    const result: FaqListChangeResult = await reorder.execute(1, ['c', 'a', 'b']);
    expect(ids(result)).toEqual(['c', 'a', 'b']);
    expect(result).toMatchObject({ version: 2, revision: 2 });
    expect([...store.rows.values()].map((row) => [row.id, row.position, row.version])).toEqual([
      ['a', 1, 1],
      ['b', 2, 1],
      ['c', 0, 1],
    ]);
  });

  it('bumps the version of an unchanged order without a rebuild', async (): Promise<void> => {
    const { reorder, store } = setup();
    expect(await reorder.execute(1, ['a', 'b', 'c'])).toMatchObject({
      version: 2,
      revision: null,
    });
    expect(store.requests).toEqual([]);
  });

  it('refuses a stale list version after a creation', async (): Promise<void> => {
    const { reorder, create } = setup();
    await create.execute(DRAFT);
    await expect(reorder.execute(1, ['c', 'a', 'b'])).rejects.toBeInstanceOf(VersionMismatchError);
  });

  it('refuses an order that is not a permutation and rolls back the version', async (): Promise<void> => {
    const { reorder, store } = setup();
    const error: unknown = await reorder.execute(1, ['a', 'b']).catch((e: unknown): unknown => e);
    expect((error as DomainError).code).toBe('content.faq-order-invalid');
    expect(store.listVersion).toBe(1);
  });
});
