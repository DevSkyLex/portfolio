import {
  compareValues,
  filterRows,
  matchesSearch,
  nextSort,
  nextSorts,
  pageCount,
  pageRows,
  sortRows,
  sortRowsBy,
} from '@internal/ui/lib/data-table/utils/data-table/data-table.utils';
import {
  facetOptions,
  facetValues,
  matchesFacets,
  toggleValue,
} from '@internal/ui/lib/data-table/utils/data-table-facets/data-table-facets.utils';
import {
  hasActiveFilters,
  withFacet,
  withoutFilters,
} from '@internal/ui/lib/data-table/utils/data-table-state/data-table-state.utils';
import { DATA_TABLE_INITIAL_STATE } from '@internal/ui/lib/data-table/constants/data-table-initial-state.constants';
import type { DataTableFacet } from '@internal/ui/lib/data-table/models/data-table/data-table-facet.interface';
import type { DataTableState } from '@internal/ui/lib/data-table/models/data-table/data-table-state.interface';
import type { DataTableSort } from '@internal/ui/lib/data-table/models/data-table/data-table-sort.interface';

/** Row fixture: accented names, a missing city, duplicate ages and multi-valued tags. */
interface Person {
  readonly id: number;
  readonly name: string;
  readonly city: string | null;
  readonly age: number;
  readonly tags: readonly string[];
}

/**
 * Constant people
 *
 * @description
 * Four rows covering locale sorting, empty values, ties and multi-valued facets.
 *
 * @type {Person[]}
 */
const people: Person[] = [
  { id: 1, name: 'Élodie', city: 'Blois', age: 34, tags: ['a'] },
  { id: 2, name: 'adam', city: null, age: 28, tags: [] },
  { id: 3, name: 'Zoé', city: 'Tours', age: 41, tags: ['a', 'b'] },
  { id: 4, name: 'Bruno', city: 'Orléans', age: 28, tags: ['b'] },
];

describe('data table utils', (): void => {
  const collator: Intl.Collator = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' });
  const ids = (rows: readonly Person[]): number[] => rows.map((p) => p.id);

  it('sorts with the locale collator, keeping empty values last', (): void => {
    expect(ids(sortRows(people, (p) => p.name, 'asc', collator))).toEqual([2, 4, 1, 3]);
    expect(ids(sortRows(people, (p) => p.city, 'asc', collator))).toEqual([1, 4, 3, 2]);
    expect(ids(sortRows(people, (p) => p.city, 'desc', collator))).toEqual([3, 4, 1, 2]);
    expect(ids(sortRows(people, (p) => p.age, 'desc', collator))).toEqual([3, 1, 2, 4]);
  });

  it('sorts by several keys, stable on ties and empty values last in either direction', (): void => {
    expect(ids(sortRowsBy(people, [], collator))).toEqual([1, 2, 3, 4]);
    expect(
      ids(
        sortRowsBy(
          people,
          [
            { value: (p: Person): number => p.age, direction: 'asc' },
            { value: (p: Person): string => p.name, direction: 'desc' },
          ],
          collator,
        ),
      ),
    ).toEqual([4, 2, 1, 3]);
    // Equal ages keep their input order without a secondary key.
    expect(
      ids(
        sortRowsBy(people, [{ value: (p: Person): number => p.age, direction: 'asc' }], collator),
      ),
    ).toEqual([2, 4, 1, 3]);
    expect(
      ids(
        sortRowsBy(
          people,
          [{ value: (p: Person): string | null => p.city, direction: 'desc' }],
          collator,
        ),
      ).at(-1),
    ).toBe(2);
  });

  it('filters without case or accents, every word matching', (): void => {
    const values = (p: Person): (string | null)[] => [p.name, p.city];
    expect(ids(filterRows(people, 'elodie', values))).toEqual([1]);
    expect(ids(filterRows(people, 'ORLEANS bru', values))).toEqual([4]);
    expect(filterRows(people, '  ', values)).toHaveLength(4);
    expect(matchesSearch(['Médecin'], '  ')).toBe(true);
    expect(matchesSearch(['Médecin', null, 3], 'medecin 3')).toBe(true);
  });

  it('compares dates, booleans and mixed types, and finds dates by their ISO text', (): void => {
    const early: Date = new Date('2026-01-15T00:00:00.000Z');
    const late: Date = new Date('2026-06-01T00:00:00.000Z');
    expect(compareValues(late, early, collator)).toBeGreaterThan(0);
    expect(compareValues(true, false, collator)).toBe(1);
    expect(compareValues(false, true, collator)).toBe(-1);
    expect(compareValues(10, '9', collator)).toBeGreaterThan(0);
    expect(compareValues(true, 'non', collator)).toBeGreaterThan(0);
    expect(compareValues(early, 3, collator)).toBe(collator.compare(String(early), '3'));
    const events: { id: number; at: Date }[] = [
      { id: 1, at: late },
      { id: 2, at: early },
    ];
    expect(filterRows(events, '2026-01', (e) => [e.at]).map((e) => e.id)).toEqual([2]);
  });

  it('paginates and cycles the sort keys, Shift keeping the others', (): void => {
    expect(pageCount(0, 10)).toBe(1);
    expect(pageCount(21, 10)).toBe(3);
    expect(pageCount(5, 0)).toBe(5);
    expect(pageRows([1, 2, 3, 4, 5], 1, 2)).toEqual([3, 4]);
    expect(nextSort(null, 'name')).toEqual({ column: 'name', direction: 'asc' });
    expect(nextSort({ column: 'name', direction: 'desc' }, 'name')).toBeNull();

    expect(nextSorts([], 'name', false)).toEqual([{ column: 'name', direction: 'asc' }]);
    expect(nextSorts([{ column: 'name', direction: 'asc' }], 'name', false)).toEqual([
      { column: 'name', direction: 'desc' },
    ]);
    expect(nextSorts([{ column: 'name', direction: 'desc' }], 'name', false)).toEqual([]);
    expect(
      nextSorts(
        [
          { column: 'age', direction: 'asc' },
          { column: 'name', direction: 'asc' },
        ],
        'age',
        false,
      ),
    ).toEqual([{ column: 'age', direction: 'desc' }]);
    const two: DataTableSort[] = nextSorts([{ column: 'age', direction: 'asc' }], 'name', true);
    expect(two).toEqual([
      { column: 'age', direction: 'asc' },
      { column: 'name', direction: 'asc' },
    ]);
    expect(nextSorts(two, 'age', true)).toEqual([
      { column: 'age', direction: 'desc' },
      { column: 'name', direction: 'asc' },
    ]);
    expect(
      nextSorts(
        [
          { column: 'age', direction: 'desc' },
          { column: 'name', direction: 'asc' },
        ],
        'age',
        true,
      ),
    ).toEqual([{ column: 'name', direction: 'asc' }]);
  });

  it('matches facets with OR inside a facet and AND across facets, and derives options', (): void => {
    const tags: DataTableFacet<Person> = { id: 'tags', label: 'Tags', value: (p) => p.tags };
    const age: DataTableFacet<Person> = {
      id: 'age',
      label: 'Âge',
      value: (p) => String(p.age),
      options: [{ value: '28', label: '28 ans' }],
    };
    expect(facetValues(age, people[0] as Person)).toEqual(['34']);
    const pass = (selected: Record<string, string[]>, ignored?: string): number[] =>
      ids(people.filter((p) => matchesFacets(p, [tags, age], selected, ignored)));
    expect(pass({})).toEqual([1, 2, 3, 4]);
    expect(pass({ tags: ['a', 'b'] })).toEqual([1, 3, 4]);
    expect(pass({ tags: ['b'], age: ['28'] })).toEqual([4]);
    expect(pass({ tags: ['b'], age: ['28'] }, 'age')).toEqual([3, 4]);
    expect(facetOptions(tags, people, collator)).toEqual([
      { value: 'a', label: 'a' },
      { value: 'b', label: 'b' },
    ]);
    expect(facetOptions(age, people, collator)).toBe(age.options);
    expect(toggleValue(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleValue(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('updates the serialisable state, back on the first page', (): void => {
    const state: DataTableState = { ...DATA_TABLE_INITIAL_STATE, page: 3 };
    expect(hasActiveFilters(state)).toBe(false);
    expect(hasActiveFilters({ ...state, search: ' x ' })).toBe(true);
    const faceted: DataTableState = withFacet(state, 'tags', ['a']);
    expect(faceted).toEqual({ ...state, facets: { tags: ['a'] }, page: 0 });
    expect(hasActiveFilters(faceted)).toBe(true);
    expect(withFacet(faceted, 'tags', []).facets).toEqual({});
    expect(
      withoutFilters({
        ...faceted,
        search: 'x',
        page: 2,
        sort: [{ column: 'a', direction: 'asc' }],
      }),
    ).toEqual({ ...state, sort: [{ column: 'a', direction: 'asc' }], page: 0 });
  });
});
