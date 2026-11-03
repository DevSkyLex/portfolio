import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import {
  DataTableCellDirective,
  DataTableComponent,
} from '@internal/ui/lib/data-table/data-table.component';
import {
  compareValues,
  filterRows,
  nextSort,
  pageCount,
  pageRows,
  sortRows,
} from '@internal/ui/lib/data-table/utils/data-table/data-table.utils';
import type { DataTableColumn } from '@internal/ui/lib/data-table/models/data-table/data-table-column.interface';
import type { DataTableSort } from '@internal/ui/lib/data-table/models/data-table/data-table-sort.interface';

/**
 * Interface Person
 * @interface Person
 *
 * @description
 * Row fixture covering sortable text, nullable text, numeric values and a stable selection key.
 */
interface Person {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable row identity used by table tracking and selection assertions.
   *
   * @type {number}
   */
  readonly id: number;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Name used to exercise locale-aware sorting and text filtering.
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property city
   * @readonly
   *
   * @description
   * Nullable city value used to verify that empty cells sort after populated values.
   *
   * @type {string | null}
   */
  readonly city: string | null;

  /**
   * Property age
   * @readonly
   *
   * @description
   * Numeric value rendered through a custom cell template and sorted independently of display text.
   *
   * @type {number}
   */
  readonly age: number;
  // #endregion
}

/**
 * Constant people
 *
 * @description
 * Four row examples covering accented names, a missing city, duplicate ages and multiple cities for
 * table filtering, sorting, pagination and selection.
 *
 * @type {Person[]}
 */
const people: Person[] = [
  { id: 1, name: 'Élodie', city: 'Blois', age: 34 },
  { id: 2, name: 'adam', city: null, age: 28 },
  { id: 3, name: 'Zoé', city: 'Tours', age: 41 },
  { id: 4, name: 'Bruno', city: 'Orléans', age: 28 },
];

describe('data table utils', () => {
  const collator: Intl.Collator = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' });

  it('sorts with the locale collator, keeping empty values last', () => {
    expect(sortRows(people, (p) => p.name, 'asc', collator).map((p) => p.id)).toEqual([2, 4, 1, 3]);
    expect(sortRows(people, (p) => p.city, 'asc', collator).map((p) => p.id)).toEqual([1, 4, 3, 2]);
    expect(sortRows(people, (p) => p.city, 'desc', collator).map((p) => p.id)).toEqual([
      3, 4, 1, 2,
    ]);
    expect(sortRows(people, (p) => p.age, 'desc', collator).map((p) => p.id)).toEqual([3, 1, 2, 4]);
  });

  it('filters without case or accents, every word matching', () => {
    const values = (p: Person): (string | null)[] => [p.name, p.city];
    expect(filterRows(people, 'elodie', values).map((p) => p.id)).toEqual([1]);
    expect(filterRows(people, 'ORLEANS bru', values).map((p) => p.id)).toEqual([4]);
    expect(filterRows(people, '  ', values)).toHaveLength(4);
  });

  it('compares dates, booleans and mixed types, and finds dates by their ISO text', () => {
    const early: Date = new Date('2026-01-15T00:00:00.000Z');
    const late: Date = new Date('2026-06-01T00:00:00.000Z');
    expect(compareValues(late, early, collator)).toBeGreaterThan(0);
    expect(compareValues(true, false, collator)).toBe(1);
    expect(compareValues(false, true, collator)).toBe(-1);

    // Different types fall back to their text.
    expect(compareValues(10, '9', collator)).toBeGreaterThan(0);
    expect(compareValues(true, 'non', collator)).toBeGreaterThan(0);
    expect(compareValues(early, 3, collator)).toBe(collator.compare(String(early), '3'));

    const events: { id: number; at: Date }[] = [
      { id: 1, at: late },
      { id: 2, at: early },
    ];
    expect(filterRows(events, '2026-01', (e) => [e.at]).map((e) => e.id)).toEqual([2]);
  });

  it('paginates and cycles the sort of a column', () => {
    expect(pageCount(0, 10)).toBe(1);
    expect(pageCount(21, 10)).toBe(3);
    expect(pageRows([1, 2, 3, 4, 5], 1, 2)).toEqual([3, 4]);
    expect(nextSort(null, 'name')).toEqual({ column: 'name', direction: 'asc' });
    expect(nextSort({ column: 'name', direction: 'asc' }, 'name')?.direction).toBe('desc');
    expect(nextSort({ column: 'name', direction: 'desc' }, 'name')).toBeNull();
    expect(nextSort({ column: 'name', direction: 'desc' }, 'age')?.column).toBe('age');
  });
});

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Test fixture binding representative rows, columns and mutable table controls to the UI component.
 */
@Component({
  imports: [DataTableComponent, DataTableCellDirective],
  template: `<ui-data-table
    caption="People"
    [data]="people"
    [columns]="columns"
    [rowKey]="key"
    [rowLabel]="label"
    [selectable]="true"
    [pageSizeOptions]="[2, 4]"
    [(pageSize)]="pageSize"
    [(sort)]="sort"
    [(selection)]="selection"
  >
    <ng-template uiDataTableCell="age" [uiDataTableCellRows]="people" let-person>
      <strong>{{ person.age }} ans</strong>
    </ng-template>
  </ui-data-table>`,
})
class HostComponent {
  // #region Properties
  /**
   * Property people
   * @readonly
   *
   * @description
   * Fixture rows bound to the generic data table.
   *
   * @type {Person[]}
   */
  public readonly people: Person[] = people;

  /**
   * Property columns
   * @readonly
   *
   * @description
   * Name, city and age definitions exercising displayed values, sort values, alignment and sorting.
   *
   * @type {DataTableColumn<Person>[]}
   */
  public readonly columns: DataTableColumn<Person>[] = [
    { id: 'name', header: 'Nom', cell: (p) => p.name, sortable: true },
    { id: 'city', header: 'Ville', cell: (p) => p.city },
    { id: 'age', header: 'Âge', sortValue: (p) => p.age, sortable: true, align: 'end' },
  ];

  /**
   * Property key
   * @readonly
   *
   * @description
   * Row identity selector based on the fixture's stable numeric id.
   *
   * @type {(person: Person) => number}
   */
  public readonly key: (person: Person) => number = (p: Person): number => p.id;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Human-readable row name used in checkbox accessible labels.
   *
   * @type {(person: Person) => string}
   */
  public readonly label: (person: Person) => string = (p: Person): string => p.name;

  /**
   * Property pageSize
   * @readonly
   *
   * @description
   * Two-row initial page size bound bidirectionally to the table.
   *
   * @type {WritableSignal<number>}
   */
  public readonly pageSize: WritableSignal<number> = signal<number>(2);

  /**
   * Property sort
   * @readonly
   *
   * @description
   * Mutable sort state observed by header interaction assertions.
   *
   * @type {WritableSignal<DataTableSort | null>}
   */
  public readonly sort: WritableSignal<DataTableSort | null> = signal<DataTableSort | null>(null);

  /**
   * Property selection
   * @readonly
   *
   * @description
   * Selected row collection observed by the tri-state header checkbox assertions.
   *
   * @type {WritableSignal<readonly Person[]>}
   */
  public readonly selection: WritableSignal<readonly Person[]> = signal<readonly Person[]>([]);
  // #endregion
}

/**
 * Function setup
 *
 * @description
 * Creates a stable table fixture and exposes row names and the fixture component for interaction tests.
 *
 * @returns {Promise<{ fixture: ComponentFixture<HostComponent>; element: HTMLElement; names: () => (string | undefined)[]; host: HostComponent }>} Stable fixture handles and row-name reader.
 */
async function setup(): Promise<{
  fixture: ComponentFixture<HostComponent>;
  element: HTMLElement;
  names: () => (string | undefined)[];
  host: HostComponent;
}> {
  const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  const names = (): (string | undefined)[] =>
    Array.from(element.querySelectorAll('tbody tr')).map((row) =>
      row.querySelectorAll('td')[1]?.textContent?.trim(),
    );
  return { fixture, element, names, host: fixture.componentInstance };
}

describe('DataTableComponent', () => {
  it('renders a page of rows with the cell templates', async () => {
    const { element, names } = await setup();
    expect(element.querySelector('caption')?.textContent?.trim()).toBe('People');
    expect(names()).toEqual(['Élodie', 'adam']);
    expect(element.querySelector('tbody strong')?.textContent).toBe('34 ans');
    expect(element.textContent).toContain('Page 1 sur 2');
  });

  it('sorts from the header and exposes aria-sort', async () => {
    const { fixture, element, names, host } = await setup();
    const [, nameHeader] = Array.from(element.querySelectorAll('th'));
    const button: HTMLButtonElement = nameHeader?.querySelector('button') as HTMLButtonElement;
    button.click();
    await fixture.whenStable();
    expect(nameHeader?.getAttribute('aria-sort')).toBe('ascending');
    expect(names()).toEqual(['adam', 'Bruno']);
    button.click();
    await fixture.whenStable();
    expect(host.sort()).toEqual({ column: 'name', direction: 'desc' });
    expect(nameHeader?.getAttribute('aria-sort')).toBe('descending');
    expect(names()).toEqual(['Zoé', 'Élodie']);
  });

  it('filters the rows and shows the empty state', async () => {
    const { fixture, element, names } = await setup();
    const search: HTMLInputElement = element.querySelector(
      'input[type="search"]',
    ) as HTMLInputElement;
    search.value = 'tours';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(names()).toEqual(['Zoé']);
    search.value = 'nobody';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(element.querySelector('tbody td')?.textContent?.trim()).toBe('Aucun résultat.');
  });

  it('moves between pages', async () => {
    const { fixture, element, names } = await setup();
    const next: HTMLButtonElement = element.querySelector(
      '[aria-label="Page suivante"]',
    ) as HTMLButtonElement;
    next.click();
    await fixture.whenStable();
    expect(names()).toEqual(['Zoé', 'Bruno']);
    expect(next.disabled).toBe(true);
  });

  it('selects rows with a tri-state header checkbox', async () => {
    const { fixture, element, host } = await setup();
    const header: HTMLInputElement = element.querySelector('thead input') as HTMLInputElement;
    const rows = (): HTMLInputElement[] =>
      Array.from(element.querySelectorAll<HTMLInputElement>('tbody input'));
    expect(rows()[0]?.getAttribute('aria-label')).toBe('Sélectionner Élodie');
    rows()[0]?.click();
    await fixture.whenStable();
    expect(host.selection().map((p) => p.id)).toEqual([1]);
    expect(header.indeterminate).toBe(true);
    expect(header.checked).toBe(false);
    header.click();
    await fixture.whenStable();
    expect(host.selection().map((p) => p.id)).toEqual([1, 2]);
    expect(header.checked).toBe(true);
    expect(header.indeterminate).toBe(false);
    header.click();
    await fixture.whenStable();
    expect(host.selection()).toEqual([]);
  });
});
