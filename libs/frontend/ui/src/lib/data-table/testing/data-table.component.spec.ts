import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { DataTableComponent } from '@internal/ui/lib/data-table/data-table.component';
import { DataTableCellDirective } from '@internal/ui/lib/data-table/directives/data-table-cell/data-table-cell.directive';
import { DataTableEmptyDirective } from '@internal/ui/lib/data-table/directives/data-table-empty/data-table-empty.directive';
import type { DataTableEmptyLayout } from '@internal/ui/lib/data-table/models/data-table/data-table-empty-layout.type';
import { DATA_TABLE_INITIAL_STATE } from '@internal/ui/lib/data-table/constants/data-table-initial-state.constants';
import type { DataTableColumn } from '@internal/ui/lib/data-table/models/data-table/data-table-column.interface';
import type { DataTableFacet } from '@internal/ui/lib/data-table/models/data-table/data-table-facet.interface';
import type { DataTableSearchPredicate } from '@internal/ui/lib/data-table/models/data-table/data-table-search-predicate.type';
import type { DataTableState } from '@internal/ui/lib/data-table/models/data-table/data-table-state.interface';

/** Row fixture covering text, nullable text, numbers and a status facet. */
interface Person {
  readonly id: number;
  readonly name: string;
  readonly city: string | null;
  readonly age: number;
  readonly status: 'active' | 'away';
}

/**
 * Constant people
 *
 * @description
 * Four rows: accented names, a missing city, duplicate ages, two statuses.
 *
 * @type {Person[]}
 */
const people: Person[] = [
  { id: 1, name: 'Élodie', city: 'Blois', age: 34, status: 'active' },
  { id: 2, name: 'adam', city: null, age: 28, status: 'away' },
  { id: 3, name: 'Zoé', city: 'Tours', age: 41, status: 'active' },
  { id: 4, name: 'Bruno', city: 'Orléans', age: 28, status: 'active' },
];

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Binds rows, columns, a status facet, the controlled state and selection, and an inner action button.
 */
@Component({
  imports: [DataTableComponent, DataTableCellDirective, DataTableEmptyDirective],
  template: `<ui-data-table
    caption="People"
    activatable
    [data]="data()"
    [columns]="columns"
    [facets]="facets"
    [rowKey]="key"
    [rowLabel]="label"
    [selectable]="true"
    [loading]="loading()"
    [skeletonRows]="3"
    [searchPredicate]="predicate()"
    [pageSizeOptions]="[2, 4]"
    [emptyLayout]="emptyLayout()"
    [(state)]="state"
    [(selection)]="selection"
    (rowActivated)="activated.push($event.id)"
  >
    <ng-template uiDataTableCell="age" [uiDataTableCellRows]="people" let-person>
      <strong>{{ person.age }} ans</strong>
      <button type="button" (click)="pressed.push(person.id)">Action</button>
    </ng-template>
    @if (customEmpty()) {
      <ng-template uiDataTableEmpty let-layout
        ><p class="custom-empty" [attr.data-layout]="layout">Rien ici</p></ng-template
      >
    }
    <button uiDataTableToolbar type="button">Ajouter</button>
  </ui-data-table>`,
})
class HostComponent {
  public readonly people: Person[] = people;
  public readonly data: WritableSignal<readonly Person[]> = signal<readonly Person[]>(people);
  public readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  public readonly customEmpty: WritableSignal<boolean> = signal<boolean>(false);
  public readonly emptyLayout: WritableSignal<DataTableEmptyLayout> =
    signal<DataTableEmptyLayout>('inline');
  public readonly predicate: WritableSignal<DataTableSearchPredicate<Person> | undefined> = signal<
    DataTableSearchPredicate<Person> | undefined
  >(undefined);
  public readonly columns: DataTableColumn<Person>[] = [
    { id: 'name', header: 'Nom', cell: (p) => p.name, sortable: true, hideable: false },
    { id: 'city', header: 'Ville', cell: (p) => p.city, sortable: true },
    { id: 'age', header: 'Âge', sortValue: (p) => p.age, sortable: true, align: 'end' },
  ];
  public readonly facets: DataTableFacet<Person>[] = [
    {
      id: 'status',
      label: 'Statut',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" data-glyph="status"></svg>',
      value: (p) => p.status,
      options: [
        { value: 'active', label: 'Actif' },
        { value: 'away', label: 'Absent' },
      ],
    },
  ];
  public readonly key: (person: Person) => number = (p: Person): number => p.id;
  public readonly label: (person: Person) => string = (p: Person): string => p.name;
  public readonly state: WritableSignal<DataTableState> = signal<DataTableState>({
    ...DATA_TABLE_INITIAL_STATE,
    pageSize: 2,
  });
  public readonly selection: WritableSignal<readonly Person[]> = signal<readonly Person[]>([]);
  public readonly activated: number[] = [];
  public readonly pressed: number[] = [];
}

/** Handles returned by `setup`. */
interface Harness {
  fixture: ComponentFixture<HostComponent>;
  element: HTMLElement;
  host: HostComponent;
  names: () => (string | undefined)[];
  stable: () => Promise<void>;
  button: (label: string) => HTMLButtonElement;
}

/**
 * Function setup
 *
 * @description
 * Renders the host and exposes the rendered names, the host and lookup helpers.
 *
 * @returns {Promise<Harness>} Fixture handles.
 */
async function setup(): Promise<Harness> {
  const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  const names = (): (string | undefined)[] =>
    Array.from(element.querySelectorAll('tbody tr')).map((row) =>
      row.querySelectorAll('td')[1]?.textContent?.trim(),
    );
  const stable = async (): Promise<void> => {
    await fixture.whenStable();
  };
  const button = (label: string): HTMLButtonElement => {
    const found: HTMLButtonElement | undefined = Array.from(
      document.querySelectorAll<HTMLButtonElement>('button'),
    ).find(
      (candidate) =>
        (candidate.getAttribute('aria-label') ?? candidate.textContent?.trim()) === label,
    );
    if (!found) throw new Error(`${label} missing`);
    return found;
  };
  return { fixture, element, host: fixture.componentInstance, names, stable, button };
}

/**
 * Function header
 *
 * @description
 * Finds a heading cell by its text.
 *
 * @param {HTMLElement} element - Rendered host.
 * @param {string} text - Heading text.
 * @returns {HTMLTableCellElement} The heading.
 */
function header(element: HTMLElement, text: string): HTMLTableCellElement {
  const found: HTMLTableCellElement | undefined = Array.from(
    element.querySelectorAll<HTMLTableCellElement>('th'),
  ).find((th) => th.textContent?.trim().startsWith(text));
  if (!found) throw new Error(`${text} heading missing`);
  return found;
}

describe('DataTableComponent', (): void => {
  afterEach((): void => {
    document.querySelectorAll('.cdk-overlay-container').forEach((node) => node.remove());
  });

  it('renders a page of rows with the cell templates, the range and the toolbar slot', async (): Promise<void> => {
    const { element, names } = await setup();
    expect(element.querySelector('caption')?.textContent?.trim()).toBe('People');
    expect(names()).toEqual(['Élodie', 'adam']);
    expect(element.querySelector('tbody strong')?.textContent).toBe('34 ans');
    expect(element.textContent).toContain('1–2 sur 4');
    expect(element.querySelector('[data-slot="data-table-page"]')?.textContent?.trim()).toBe(
      'Page 1 sur 2',
    );
    expect(element.querySelector('[data-slot="data-table-toolbar"]')?.textContent).toContain(
      'Ajouter',
    );
  });

  it('cycles the sort from the header with aria-sort, Shift adding a secondary key', async (): Promise<void> => {
    const { element, names, host, stable } = await setup();
    const name: HTMLTableCellElement = header(element, 'Nom');
    const age: HTMLTableCellElement = header(element, 'Âge');
    expect(name.getAttribute('aria-sort')).toBe('none');
    const sortButton: HTMLButtonElement = name.querySelector('button') as HTMLButtonElement;
    sortButton.click();
    await stable();
    expect(name.getAttribute('aria-sort')).toBe('ascending');
    expect(names()).toEqual(['adam', 'Bruno']);
    sortButton.click();
    await stable();
    expect(host.state().sort).toEqual([{ column: 'name', direction: 'desc' }]);
    expect(name.getAttribute('aria-sort')).toBe('descending');
    expect(names()).toEqual(['Zoé', 'Élodie']);
    sortButton.click();
    await stable();
    expect(name.getAttribute('aria-sort')).toBe('none');
    expect(names()).toEqual(['Élodie', 'adam']);

    (age.querySelector('button') as HTMLButtonElement).click();
    await stable();
    sortButton.dispatchEvent(new MouseEvent('click', { shiftKey: true, bubbles: true }));
    await stable();
    expect(host.state().sort).toEqual([
      { column: 'age', direction: 'asc' },
      { column: 'name', direction: 'asc' },
    ]);
    expect(names()).toEqual(['adam', 'Bruno']);
    expect(name.querySelector('button')?.textContent).toContain('2');
    expect(header(element, 'Ville').getAttribute('aria-sort')).toBe('none');
  });

  it('combines the search with a facet, counts the options and removes the chips', async (): Promise<void> => {
    const { element, names, host, stable, button } = await setup();
    host.state.update((state) => ({ ...state, page: 1 }));
    await stable();
    const search: HTMLInputElement = element.querySelector(
      'input[type="search"]',
    ) as HTMLInputElement;
    // The search group rests on the field fill of the page-size select.
    expect(search.closest('[data-slot="input-group"]')?.classList).toContain('bg-surface-field');
    search.value = 'o';
    search.dispatchEvent(new Event('input'));
    await stable();
    // Changing the search goes back to the first page.
    expect(host.state().page).toBe(0);
    expect(names()).toEqual(['Élodie', 'Zoé']);

    button('Statut').click();
    await stable();
    const panel: HTMLElement = document.querySelector(
      '[data-slot="popover-content"]',
    ) as HTMLElement;
    expect(panel.getAttribute('aria-label')).toBe('Filtrer par Statut');
    // A compact menu panel: 3 px inside its border around 32 px rows, not the 16 px popover padding.
    expect(panel.classList).toContain('p-[3px]');
    expect(panel.classList).not.toContain('p-4');
    const options: string[] = Array.from(panel.querySelectorAll('label')).map((label) =>
      Array.from(label.querySelectorAll('span'))
        .map((span) => span.textContent?.trim())
        .join(' '),
    );
    // "o" matches Élodie, Zoé, Bruno (Orléans): three active, no away.
    expect(options).toEqual(['Actif 3', 'Absent 0']);
    const active: HTMLInputElement = panel.querySelector('input') as HTMLInputElement;
    active.click();
    await stable();
    expect(host.state().facets).toEqual({ status: ['active'] });
    expect(element.querySelector('[data-slot="data-table-filter-chip"]')?.textContent).toContain(
      'Statut : Actif',
    );
    // The chip alone shows the value: the facet button carries no count.
    const facet: HTMLElement | null = element.querySelector(
      '[data-slot="data-table-facet-filter"] button',
    );
    expect(facet?.textContent?.trim()).toBe('Statut');
    expect(facet?.hasAttribute('data-active')).toBe(true);
    // The facet's own glyph replaces the generic filter one.
    expect(facet?.querySelector('svg[data-glyph="status"]')).not.toBeNull();
    // The 20 px remove button widens its pointer target to 24 px.
    expect(
      element.querySelector('[data-slot="data-table-filter-chip"] button')?.classList,
    ).toContain('after:-inset-0.5');
    search.value = 'bru';
    search.dispatchEvent(new Event('input'));
    await stable();
    expect(names()).toEqual(['Bruno']);
    button('Effacer').click();
    await stable();
    expect(host.state().facets).toEqual({});

    (document.querySelector('[data-slot="popover-content"] input') as HTMLInputElement).click();
    await stable();
    button('Retirer le filtre Statut : Actif').click();
    await stable();
    expect(host.state().facets).toEqual({});
    expect(element.querySelector('[data-slot="data-table-filter-chip"]')).toBeNull();
    button('Réinitialiser').click();
    await stable();
    expect(host.state().search).toBe('');
    expect(element.querySelector('[data-slot="data-table-reset"]')).toBeNull();
  });

  it('shows a no-result state with a reset action and steady columns, distinct from the empty table', async (): Promise<void> => {
    const { element, host, stable, button } = await setup();
    const widths: Record<string, number> = { name: 180, city: 140, age: 90 };
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ): DOMRect {
      return new DOMRect(0, 0, widths[this.dataset['column'] ?? ''] ?? 0, 40);
    });
    host.state.update((state) => ({ ...state, search: 'adam' }));
    await stable();
    host.state.update((state) => ({ ...state, search: 'nobody' }));
    await stable();
    expect(element.querySelector('[data-slot="data-table-no-results"]')?.textContent).toContain(
      'Aucun résultat.',
    );
    expect(element.querySelector('[data-slot="data-table-no-results"]')?.textContent).toContain(
      'Modifiez la recherche ou retirez des filtres.',
    );
    expect(element.querySelector('[role="status"]')?.textContent?.trim()).toBe('Aucun résultat.');
    expect(element.querySelector('ui-data-table-pagination')).toBeNull();
    // Below the heading row, not in a spanning cell, with the reset as its action.
    expect(element.querySelectorAll('tbody tr')).toHaveLength(0);
    expect(
      element.querySelector('[data-slot="data-table-no-results"] button')?.textContent?.trim(),
    ).toBe('Réinitialiser les filtres');
    expect(element.querySelector('table')?.classList).toContain('table-fixed');
    // The widths sit on a colgroup, which the fixed layout reads before any heading class.
    const column = (id: string): HTMLElement | null =>
      element.querySelector<HTMLElement>(`colgroup > col[data-column="${id}"]`);
    expect(column('name')?.style.width).toBe('180px');
    expect(column('age')?.style.width).toBe('90px');
    expect(element.querySelector<HTMLElement>('th[data-column="name"]')?.style.width).toBe('');
    vi.restoreAllMocks();
    button('Réinitialiser').click();
    await stable();
    expect(host.state().search).toBe('');
    expect(element.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(element.querySelector('table')?.classList).not.toContain('table-fixed');
    expect(element.querySelector('colgroup')).toBeNull();

    host.data.set([]);
    await stable();
    expect(element.querySelector('[data-slot="data-table-empty"]')?.textContent).toBe(
      'Aucune donnée.',
    );
    host.customEmpty.set(true);
    await stable();
    expect(element.querySelector('.custom-empty')?.textContent).toBe('Rien ici');
    // The projected template receives the layout as its context.
    expect(element.querySelector<HTMLElement>('.custom-empty')?.dataset['layout']).toBe('inline');
  });

  it('grows into its column for a fill empty state only while no row shows', async (): Promise<void> => {
    const { element, host, stable, button } = await setup();
    const table: HTMLElement = element.querySelector<HTMLElement>('ui-data-table') as HTMLElement;
    const frame = (): HTMLElement =>
      element.querySelector<HTMLElement>('[data-slot="data-table-frame"]') as HTMLElement;
    host.emptyLayout.set('fill');
    await stable();
    expect(table.className).not.toContain('flex-1');

    host.state.update((state) => ({ ...state, search: 'nobody' }));
    await stable();
    expect(table.className).toContain('flex-1');
    expect(frame().className).toContain('flex-1');
    const empty: HTMLElement | null = element.querySelector<HTMLElement>(
      '[data-slot="data-table-no-results"] [data-slot="empty"]',
    );
    expect(empty?.dataset['layout']).toBe('fill');

    button('Réinitialiser les filtres').click();
    await stable();
    expect(host.state().search).toBe('');
    expect(table.className).not.toContain('flex-1');

    host.data.set([]);
    host.customEmpty.set(true);
    await stable();
    expect(element.querySelector<HTMLElement>('.custom-empty')?.dataset['layout']).toBe('fill');
  });

  it('renders skeleton rows matching the visible columns while loading', async (): Promise<void> => {
    const { element, host, stable } = await setup();
    host.data.set([]);
    host.loading.set(true);
    await stable();
    const rows: HTMLElement[] = Array.from(
      element.querySelectorAll('[data-slot="data-table-skeleton-row"]'),
    );
    expect(rows).toHaveLength(3);
    // Selection cell plus three columns, one text line each.
    expect(rows[0]?.querySelectorAll('td')).toHaveLength(4);
    expect(rows[0]?.querySelectorAll('[data-slot="skeleton"][data-shape="text"]')).toHaveLength(3);
    expect(element.querySelector('table')?.getAttribute('aria-busy')).toBe('true');
    expect(element.querySelector('[role="status"]')?.textContent).toBe('Chargement…');
    host.data.set(people);
    await stable();
    // A reload keeps the rows and stays busy.
    expect(element.querySelector('[data-slot="data-table-skeleton-row"]')).toBeNull();
    expect(element.querySelector('table')?.getAttribute('aria-busy')).toBe('true');
    host.loading.set(false);
    await stable();
    expect(element.querySelector('table')?.hasAttribute('aria-busy')).toBe(false);
  });

  it('keeps the page within bounds and goes back to the first page on a new page size', async (): Promise<void> => {
    const { element, names, host, stable, button } = await setup();
    const next: HTMLButtonElement = button('Page suivante');
    const last: HTMLButtonElement = button('Dernière page');
    const first: HTMLButtonElement = button('Première page');
    expect(first.disabled).toBe(true);
    last.click();
    await stable();
    expect(names()).toEqual(['Zoé', 'Bruno']);
    expect(element.textContent).toContain('3–4 sur 4');
    expect(next.disabled).toBe(true);
    button('Page précédente').click();
    await stable();
    expect(host.state().page).toBe(0);
    next.click();
    await stable();
    first.click();
    await stable();
    expect(host.state().page).toBe(0);

    // A page that no longer exists (an old URL) shows the last one.
    host.state.update((state) => ({ ...state, page: 9 }));
    await stable();
    expect(names()).toEqual(['Zoé', 'Bruno']);
    // The page size is the catalogue's `ui-select`, an h-8 trigger named by its label (D43).
    const trigger: HTMLButtonElement = element.querySelector(
      '[data-slot="data-table-page-size"] button[role="combobox"]',
    ) as HTMLButtonElement;
    expect(element.querySelector('select')).toBeNull();
    expect(trigger.className).toContain('h-8');
    expect(trigger.className).toContain('rounded-sm');
    expect(trigger.textContent?.trim()).toBe('2');
    const labelId: string | null = trigger.getAttribute('aria-labelledby');
    expect(labelId && document.getElementById(labelId)?.textContent).toBe('Lignes par page');
    trigger.click();
    await stable();
    const options: HTMLElement[] = Array.from(
      document.querySelectorAll<HTMLElement>('[role="option"]'),
    );
    expect(options.map((option) => option.textContent?.trim())).toEqual(['2', '4']);
    options[1]?.click();
    await stable();
    expect(host.state()).toEqual(expect.objectContaining({ page: 0, pageSize: 4 }));
    expect(trigger.textContent?.trim()).toBe('4');
    expect(names()).toHaveLength(4);
  });

  it('hides and shows the hideable columns from the "Colonnes" menu', async (): Promise<void> => {
    const { element, host, stable, button } = await setup();
    // Under 640 px the few remaining columns need no menu.
    expect(button('Colonnes').classList).toContain('@max-[640px]:hidden');
    button('Colonnes').click();
    await stable();
    const items = (): HTMLElement[] =>
      Array.from(
        document.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-checkbox-item"]'),
      );
    expect(items().map((item) => item.textContent?.trim())).toEqual(['Ville', 'Âge']);
    expect(items()[0]?.getAttribute('aria-checked')).toBe('true');
    items()[0]?.click();
    await stable();
    expect(host.state().hidden).toEqual(['city']);
    expect(Array.from(element.querySelectorAll('th')).map((th) => th.textContent?.trim())).toEqual([
      '',
      'Nom',
      'Âge',
    ]);
    host.state.update((state) => ({ ...state, hidden: [] }));
    await stable();
    expect(element.querySelectorAll('th')).toHaveLength(4);
  });

  it('activates a row on click but not from the buttons inside it, out of the tab order', async (): Promise<void> => {
    const { element, host, stable } = await setup();
    const row: HTMLTableRowElement = element.querySelector('tbody tr') as HTMLTableRowElement;
    expect(row.hasAttribute('tabindex')).toBe(false);
    expect(row.className).toContain('has-focus-visible:bg-surface-hover');
    (row.querySelectorAll('td')[1] as HTMLElement).click();
    expect(host.activated).toEqual([1]);
    const inner: HTMLButtonElement = row.querySelector('button') as HTMLButtonElement;
    inner.click();
    expect(host.pressed).toEqual([1]);
    (row.querySelector('input') as HTMLInputElement).click();
    expect(host.activated).toEqual([1]);
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(host.activated).toEqual([1]);
    await stable();
  });

  it('uses the caller search predicate instead of the cell values', async (): Promise<void> => {
    const { names, host, stable } = await setup();
    host.predicate.set((person, query) => String(person.age) === query.trim());
    host.state.update((state) => ({ ...state, search: ' 28 ' }));
    await stable();
    expect(names()).toEqual(['adam', 'Bruno']);
  });

  it('selects rows with a tri-state header checkbox', async (): Promise<void> => {
    const { element, host, stable } = await setup();
    const all: HTMLInputElement = element.querySelector('thead input') as HTMLInputElement;
    const rows = (): HTMLInputElement[] =>
      Array.from(element.querySelectorAll<HTMLInputElement>('tbody input'));
    expect(rows()[0]?.getAttribute('aria-label')).toBe('Sélectionner Élodie');
    rows()[0]?.click();
    await stable();
    expect(host.selection().map((p) => p.id)).toEqual([1]);
    expect(element.querySelector('tbody tr')?.getAttribute('data-state')).toBe('selected');
    expect(all.indeterminate).toBe(true);
    all.click();
    await stable();
    expect(host.selection().map((p) => p.id)).toEqual([1, 2]);
    expect(all.checked).toBe(true);
    all.click();
    await stable();
    expect(host.selection()).toEqual([]);
    // The catalogue checkbox (D41 small-control ring), not a bare native box.
    expect(all.closest('ui-checkbox')).not.toBeNull();
  });

  it('keeps the selection across pages but drops the rows a filter hides', async (): Promise<void> => {
    const { element, host, stable } = await setup();
    const rows = (): HTMLInputElement[] =>
      Array.from(element.querySelectorAll<HTMLInputElement>('tbody input'));
    rows()[0]?.click();
    await stable();
    host.state.update((state) => ({ ...state, page: 1 }));
    await stable();
    rows()[0]?.click();
    await stable();
    // Élodie on page 1, Zoé on page 2.
    expect(host.selection().map((p) => p.id)).toEqual([1, 3]);
    host.state.update((state) => ({ ...state, page: 0, search: 'zo' }));
    await stable();
    expect(host.selection().map((p) => p.id)).toEqual([3]);
    host.state.update((state) => ({ ...state, search: '' }));
    await stable();
    expect(host.selection().map((p) => p.id)).toEqual([3]);
  });

  it('hands back the fresh row objects after a reload, and drops the vanished ones', async (): Promise<void> => {
    const { element, host, stable } = await setup();
    (element.querySelector('thead input') as HTMLInputElement).click();
    await stable();
    expect(host.selection().map((p) => p.id)).toEqual([1, 2]);
    const renamed: Person = { ...people[0], name: 'Élodie B.' } as Person;
    host.data.set([renamed, ...people.slice(2)]);
    await stable();
    expect(host.selection()).toEqual([renamed]);
  });
});

/**
 * Class PlainHostComponent
 * @class PlainHostComponent
 *
 * @description
 * Compact, flush table without a row label, search or facet, unpaginated, with a sticky header.
 */
@Component({
  imports: [DataTableComponent],
  template: `<ui-data-table
    density="compact"
    stickyHeader
    [framed]="false"
    [searchable]="false"
    [paginated]="false"
    [selectable]="true"
    [data]="people"
    [columns]="columns"
    [labels]="{ empty: 'Vide' }"
  />`,
})
class PlainHostComponent {
  public readonly people: Person[] = people;
  public readonly columns: DataTableColumn<Person>[] = [
    { id: 'name', header: 'Nom', cell: (p) => p.name, hideable: false },
    { id: 'actions', header: 'Actions', headerHidden: true, hideable: false },
  ];
}

describe('DataTableComponent options', (): void => {
  it('renders compact flush rows with a sticky header, numbered checkboxes and every row', async (): Promise<void> => {
    const fixture: ComponentFixture<PlainHostComponent> =
      TestBed.createComponent(PlainHostComponent);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('ui-data-table')?.getAttribute('data-density')).toBe('compact');
    expect(element.querySelector('table')?.className).toContain('text-[13px]');
    expect(element.querySelector('thead')?.className).toContain('sticky');
    expect(element.querySelector('input[type="search"]')).toBeNull();
    // Only a hideable column would bring the toolbar.
    expect(element.querySelector('[data-slot="data-table-toolbar"]')).toBeNull();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(4);
    expect(element.querySelector('tbody tr')?.hasAttribute('tabindex')).toBe(false);
    expect(element.querySelectorAll('tbody input')[2]?.getAttribute('aria-label')).toBe(
      'Sélectionner la ligne 3',
    );
    const actions: HTMLTableCellElement | undefined = element.querySelectorAll('th')[2];
    expect(actions?.querySelector('.sr-only')?.textContent).toBe('Actions');
    expect(actions?.hasAttribute('aria-sort')).toBe(false);
    expect(element.querySelector('ui-data-table-pagination')).toBeNull();
  });
});

/**
 * Class ResizableHostComponent
 * @class ResizableHostComponent
 *
 * @description
 * Selectable table with resizable columns stored under a key: a fill name column, a 120 px city
 * bounded to 80–200 px, and a 60 px age column that opts out; the rows add a long city name.
 */
@Component({
  imports: [DataTableComponent],
  template: `<ui-data-table
    resizableColumns
    selectable
    columnWidthsKey="test.people.columns"
    [searchable]="false"
    [paginated]="false"
    [stickyHeader]="sticky()"
    [data]="rows"
    [columns]="columns()"
    [rowKey]="key"
    [(state)]="state"
  />`,
})
class ResizableHostComponent {
  public readonly rows: Person[] = [
    ...people,
    { id: 5, name: 'Gaël', city: 'Châteauroux', age: 52, status: 'away' },
  ];
  public readonly columns: WritableSignal<DataTableColumn<Person>[]> = signal<
    DataTableColumn<Person>[]
  >([
    { id: 'name', header: 'Nom', cell: (p) => p.name, hideable: false },
    { id: 'city', header: 'Ville', cell: (p) => p.city, width: 120, minWidth: 80, maxWidth: 200 },
    { id: 'age', header: 'Âge', cell: (p) => p.age, width: 60, resizable: false },
  ]);
  public readonly sticky: WritableSignal<boolean> = signal<boolean>(false);
  public readonly key: (person: Person) => number = (person: Person): number => person.id;
  public readonly state: WritableSignal<DataTableState> =
    signal<DataTableState>(DATA_TABLE_INITIAL_STATE);
}

/** Handles returned by `resizable`. */
interface ResizableHarness {
  readonly fixture: ComponentFixture<ResizableHostComponent>;
  readonly element: HTMLElement;
  readonly col: (id: string) => HTMLElement | null;
  readonly handle: (header: string) => HTMLElement;
  readonly table: () => HTMLElement;
  readonly frame: () => HTMLElement;
  readonly guide: () => HTMLElement | null;
  readonly pointer: (target: HTMLElement, type: string, clientX: number, button?: number) => void;
  readonly frames: () => void;
  readonly pending: () => number;
  readonly stored: () => unknown;
}

/**
 * Function resizable
 *
 * @description
 * Renders the resizable host attached to the document with a frame of the given width (jsdom lays
 * nothing out), animation frames queued until `frames()` runs them, and exposes its parts.
 *
 * @param {number} frameWidth - `clientWidth` of the table frame.
 * @param {(host: ResizableHostComponent) => void} prepare - Changes applied before the first render.
 * @returns {Promise<ResizableHarness>} Handles of the rendered table.
 */
async function resizable(
  frameWidth: number = 1000,
  prepare?: (host: ResizableHostComponent) => void,
): Promise<ResizableHarness> {
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (
    this: Element,
  ): number {
    return this instanceof HTMLElement && this.dataset['slot'] === 'data-table-frame'
      ? frameWidth
      : 0;
  });
  const queue: Map<number, FrameRequestCallback> = new Map<number, FrameRequestCallback>();
  let lastFrame: number = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback): number => {
    queue.set(++lastFrame, callback);
    return lastFrame;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number): void => {
    queue.delete(id);
  });
  const fixture: ComponentFixture<ResizableHostComponent> =
    TestBed.createComponent(ResizableHostComponent);
  prepare?.(fixture.componentInstance);
  document.body.append(fixture.nativeElement);
  await fixture.whenStable();
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  return {
    fixture,
    element,
    col: (id: string): HTMLElement | null => element.querySelector(`col[data-column="${id}"]`),
    handle: (header: string): HTMLElement =>
      element.querySelector(
        `[role="separator"][aria-label="Redimensionner la colonne ${header}"]`,
      ) as HTMLElement,
    table: (): HTMLElement => element.querySelector('table') as HTMLElement,
    frame: (): HTMLElement =>
      element.querySelector('[data-slot="data-table-frame"]') as HTMLElement,
    guide: (): HTMLElement | null => element.querySelector('[data-slot="data-table-resize-guide"]'),
    pointer: (target: HTMLElement, type: string, clientX: number, button: number = 0): void => {
      target.dispatchEvent(
        new PointerEvent(type, { clientX, button, pointerId: 1, bubbles: true }),
      );
    },
    frames: (): void => {
      const callbacks: FrameRequestCallback[] = [...queue.values()];
      queue.clear();
      for (const callback of callbacks) callback(0);
    },
    pending: (): number => queue.size,
    stored: (): unknown => JSON.parse(localStorage.getItem('test.people.columns') ?? 'null'),
  };
}

/**
 * Function press
 *
 * @description
 * Dispatches a cancelable keydown on a handle.
 *
 * @param {HTMLElement | null} target - Handle.
 * @param {string} name - Key name.
 * @param {boolean} shiftKey - Whether Shift is held.
 */
function press(target: HTMLElement | null, name: string, shiftKey: boolean = false): void {
  target?.dispatchEvent(
    new KeyboardEvent('keydown', { key: name, shiftKey, bubbles: true, cancelable: true }),
  );
}

describe('DataTableComponent column resizing', (): void => {
  afterEach((): void => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    document.body.replaceChildren();
  });

  it('resizes the column on the left of each divider, but the one after the fill column', async (): Promise<void> => {
    const { element, col, fixture } = await resizable();
    const handles: HTMLElement[] = [...element.querySelectorAll<HTMLElement>('[role="separator"]')];
    const inHeader = (text: string): HTMLElement | undefined =>
      handles.find(
        (handle: HTMLElement): boolean =>
          handle.closest('th')?.textContent?.includes(text) ?? false,
      );
    // Ville | Âge: drawn on the start edge of Âge (not resizable), it resizes Ville, on its left.
    const divider: HTMLElement | undefined = inHeader('Âge');
    expect(divider?.getAttribute('aria-label')).toBe('Redimensionner la colonne Ville');
    expect(divider?.dataset['side']).toBe('start');
    press(divider ?? null, 'ArrowRight');
    await fixture.whenStable();
    expect(col('city')?.style.width).toBe('136px');
    // Nom | Ville: the fill column is on the left, so this divider resizes Ville from its start edge.
    const afterFill: HTMLElement | undefined = inHeader('Ville');
    expect(afterFill?.getAttribute('aria-label')).toBe('Redimensionner la colonne Ville');
    press(afterFill ?? null, 'ArrowRight');
    await fixture.whenStable();
    expect(col('city')?.style.width).toBe('120px');
  });

  it('writes the model in the colgroup: fixed columns in pixels, the fill column without width', async (): Promise<void> => {
    const { element, col, handle, table } = await resizable();
    expect(table().className).toContain('table-fixed');
    const cols: HTMLElement[] = [...element.querySelectorAll<HTMLElement>('colgroup > col')];
    // The selection column is fixed, the name column fills the room the others leave.
    expect(cols.map((c: HTMLElement): string => c.style.width)).toEqual([
      '40px',
      '',
      '120px',
      '60px',
    ]);
    expect(col('name')?.style.width).toBe('');
    // Selection, the fill column at its 200 px minimum, the fixed columns.
    expect(table().style.minWidth).toBe('420px');
    expect(table().style.width).toBe('');
    const city: HTMLElement = handle('Ville');
    expect(city.getAttribute('aria-orientation')).toBe('vertical');
    expect(city.getAttribute('tabindex')).toBe('0');
    expect(city.getAttribute('aria-valuenow')).toBe('120');
    expect(city.getAttribute('aria-valuemin')).toBe('80');
    expect(city.getAttribute('aria-valuemax')).toBe('200');
    // After the fill column, the handle sits on the start edge, the one facing it.
    expect(city.dataset['side']).toBe('start');
    expect(city.className).toContain('-start-1.5');
    expect(city.className).toContain('w-3');
    expect(city.className).toContain('group-hover/head:after:bg-border');
    expect(city.className).toContain('after:h-4');
    expect(city.className).toContain('focus-visible:after:bg-fg');
    expect(city.closest('th')?.className).toContain('relative');
    expect(city.closest('tr')?.className).toContain('group/head');
    // The fill column and the column that opts out have no handle.
    expect(handle('Nom')).toBeNull();
    expect(handle('Âge')).toBeNull();
    expect(element.querySelector('th[data-column="name"]')?.className).not.toContain('relative');
  });

  it('starts a drag from the rendered width without changing any width', async (): Promise<void> => {
    localStorage.setItem('test.people.columns', JSON.stringify({ city: 150 }));
    const { fixture, element, col, handle, pointer } = await resizable();
    const widths = (): string[] =>
      [...element.querySelectorAll<HTMLElement>('colgroup > col')].map(
        (c: HTMLElement): string => c.style.width,
      );
    expect(widths()).toEqual(['40px', '', '150px', '60px']);
    // A pointer the browser cannot capture still drags.
    const capture: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(
      Element.prototype,
      'setPointerCapture',
    );
    Object.defineProperty(Element.prototype, 'setPointerCapture', {
      configurable: true,
      value: (): void => {
        throw new DOMException('No active pointer', 'NotFoundError');
      },
    });
    try {
      pointer(handle('Ville'), 'pointerdown', 500);
    } finally {
      if (capture) Object.defineProperty(Element.prototype, 'setPointerCapture', capture);
      else delete (Element.prototype as Partial<Element>).setPointerCapture;
    }
    await fixture.whenStable();
    expect(handle('Ville').hasAttribute('data-dragging')).toBe(true);
    expect(widths()).toEqual(['40px', '', '150px', '60px']);
    pointer(handle('Ville'), 'pointerup', 500);
    await fixture.whenStable();
    expect(col('city')?.style.width).toBe('150px');
    expect(localStorage.getItem('test.people.columns')).toBe('{"city":150}');
  });

  it('moves the edge with the pointer once per frame, locks the document and stores on release', async (): Promise<void> => {
    const { fixture, element, col, handle, guide, pointer, frames, pending, stored } =
      await resizable(1000, (host: ResizableHostComponent): void => host.sticky.set(true));
    const city: HTMLElement = handle('Ville');
    city.getBoundingClientRect = (): DOMRect => new DOMRect(494, 0, 12, 32);
    // A secondary button starts nothing.
    pointer(city, 'pointerdown', 500, 2);
    pointer(city, 'pointermove', 460);
    frames();
    await fixture.whenStable();
    expect(col('city')?.style.width).toBe('120px');
    expect(document.documentElement.style.cursor).toBe('');

    pointer(city, 'pointerdown', 500);
    await fixture.whenStable();
    expect(document.documentElement.style.cursor).toBe('col-resize');
    expect(document.documentElement.style.userSelect).toBe('none');
    expect(guide()?.hasAttribute('data-active')).toBe(true);
    expect(guide()?.className).toContain('border-dashed');
    expect(guide()?.className).toContain('border-border-hover');
    expect(guide()?.style.left).toBe('500px');
    expect(element.querySelector('.fixed.cursor-col-resize')).not.toBeNull();
    // The start edge moves left with the pointer: the column widens by the same 40 px.
    pointer(city, 'pointermove', 460);
    expect(col('city')?.style.width).toBe('120px');
    frames();
    expect(col('city')?.style.width).toBe('160px');
    expect(table(element).style.minWidth).toBe('460px');
    // Several moves within a frame make one update, at the latest position.
    const before: number = pending();
    pointer(city, 'pointermove', 470);
    pointer(city, 'pointermove', 480);
    expect(pending() - before).toBe(1);
    frames();
    await fixture.whenStable();
    expect(col('city')?.style.width).toBe('140px');
    expect(handle('Ville').getAttribute('aria-valuenow')).toBe('140');
    expect(col('name')?.style.width).toBe('');
    expect(col('age')?.style.width).toBe('60px');
    expect(stored()).toBeNull();
    pointer(city, 'pointerup', 450);
    await fixture.whenStable();
    expect(col('city')?.style.width).toBe('170px');
    expect(stored()).toEqual({ city: 170 });
    expect(city.hasAttribute('data-dragging')).toBe(false);
    expect(guide()?.hasAttribute('data-active')).toBe(false);
    expect(document.documentElement.style.cursor).toBe('');
    expect(document.documentElement.style.userSelect).toBe('');
    expect(element.querySelector('.fixed.cursor-col-resize')).toBeNull();
  });

  it('stops the drag at the bounds and where the fill column would go below its minimum', async (): Promise<void> => {
    // Under a sticky heading the frame cannot scroll: 460 px of frame leave 40 px above the 420 px
    // the columns need.
    const narrow: ResizableHarness = await resizable(460, (host: ResizableHostComponent): void =>
      host.sticky.set(true),
    );
    const city: HTMLElement = narrow.handle('Ville');
    narrow.pointer(city, 'pointerdown', 500);
    narrow.pointer(city, 'pointermove', 300);
    narrow.frames();
    expect(narrow.col('city')?.style.width).toBe('160px');
    narrow.pointer(city, 'pointermove', 700);
    narrow.frames();
    expect(narrow.col('city')?.style.width).toBe('80px');
    narrow.pointer(city, 'pointercancel', 700);
    await narrow.fixture.whenStable();
    expect(narrow.stored()).toEqual({ city: 80 });
    vi.restoreAllMocks();
    document.body.replaceChildren();
    localStorage.clear();

    const wide: ResizableHarness = await resizable(2000);
    wide.pointer(wide.handle('Ville'), 'pointerdown', 500);
    wide.pointer(wide.handle('Ville'), 'pointermove', 0);
    wide.pointer(wide.handle('Ville'), 'pointerup', 0);
    await wide.fixture.whenStable();
    expect(wide.col('city')?.style.width).toBe('200px');
  });

  it('scrolls a scrolling frame by the drift of the edge once the fill column is at its minimum', async (): Promise<void> => {
    const { fixture, col, handle, frame, pointer, frames } = await resizable(300);
    let scrollLeft: number = 0;
    Object.defineProperty(frame(), 'scrollLeft', {
      configurable: true,
      get: (): number => scrollLeft,
      set: (value: number): void => {
        scrollLeft = value;
      },
    });
    // The fill column is at its minimum: the table grows to the right and the edge stays at 500.
    const city: HTMLElement = handle('Ville');
    city.getBoundingClientRect = (): DOMRect => new DOMRect(494, 0, 12, 32);
    pointer(city, 'pointerdown', 500);
    pointer(city, 'pointermove', 460);
    frames();
    expect(col('city')?.style.width).toBe('160px');
    // Scrolling by the 40 px drift brings the edge under the pointer.
    expect(scrollLeft).toBe(40);
    // Past its bound the scroll follows the width change (80 px in all), not the pointer.
    pointer(city, 'pointermove', 100);
    frames();
    expect(col('city')?.style.width).toBe('200px');
    expect(scrollLeft).toBe(120);
    // Narrowing widens the fill column: the table keeps the 420 px it started with.
    pointer(city, 'pointermove', 540);
    frames();
    expect(col('city')?.style.width).toBe('80px');
    expect(scrollLeft).toBe(80);
    expect(table(fixture.nativeElement).style.minWidth).toBe('420px');
    pointer(city, 'pointerup', 540);
    await fixture.whenStable();
    // Released, the table needs 380 px again.
    expect(table(fixture.nativeElement).style.minWidth).toBe('380px');
    expect(scrollLeft).toBe(80);
  });

  it('cancels a drag with Escape, back to the width it started from', async (): Promise<void> => {
    localStorage.setItem('test.people.columns', JSON.stringify({ city: 150 }));
    const { fixture, col, handle, pointer, frames, stored } = await resizable();
    pointer(handle('Ville'), 'pointerdown', 500);
    pointer(handle('Ville'), 'pointermove', 460);
    frames();
    expect(col('city')?.style.width).toBe('190px');
    // Other keys do nothing while dragging.
    press(handle('Ville'), 'ArrowLeft');
    press(handle('Ville'), 'Escape');
    await fixture.whenStable();
    expect(col('city')?.style.width).toBe('150px');
    expect(handle('Ville').hasAttribute('data-dragging')).toBe(false);
    expect(document.documentElement.style.cursor).toBe('');
    expect(stored()).toEqual({ city: 150 });
    // A move after the cancel changes nothing.
    pointer(handle('Ville'), 'pointermove', 300);
    frames();
    pointer(handle('Ville'), 'pointerup', 300);
    await fixture.whenStable();
    expect(col('city')?.style.width).toBe('150px');

    vi.restoreAllMocks();
    document.body.replaceChildren();
    localStorage.clear();

    // Without a stored width before the drag, Escape gives the default width back.
    const fresh: ResizableHarness = await resizable();
    fresh.pointer(fresh.handle('Ville'), 'pointerdown', 500);
    fresh.pointer(fresh.handle('Ville'), 'pointermove', 400);
    fresh.frames();
    expect(fresh.col('city')?.style.width).toBe('200px');
    press(fresh.handle('Ville'), 'Escape');
    await fresh.fixture.whenStable();
    expect(fresh.col('city')?.style.width).toBe('120px');
    expect(fresh.stored()).toBeNull();
  });

  it('ends a drag left running when the table goes away', async (): Promise<void> => {
    const { fixture, handle, pointer } = await resizable();
    pointer(handle('Ville'), 'pointerdown', 500);
    expect(document.documentElement.style.cursor).toBe('col-resize');
    fixture.destroy();
    expect(document.documentElement.style.cursor).toBe('');
    expect(document.documentElement.style.userSelect).toBe('');
  });

  it('moves the edge by 16 px with the arrows (64 with Shift), to the bounds with Home and End', async (): Promise<void> => {
    const { fixture, col, handle, stored } = await resizable();
    const city: HTMLElement = handle('Ville');
    // The handle is on the start edge: moving it left widens the column.
    press(city, 'ArrowLeft');
    await fixture.whenStable();
    expect(col('city')?.style.width).toBe('136px');
    expect(city.getAttribute('aria-valuenow')).toBe('136');
    expect(stored()).toEqual({ city: 136 });
    press(city, 'ArrowRight', true);
    await fixture.whenStable();
    expect(col('city')?.style.width).toBe('80px');
    press(city, 'ArrowLeft', true);
    await fixture.whenStable();
    expect(col('city')?.style.width).toBe('144px');
    press(city, 'ArrowRight');
    await fixture.whenStable();
    expect(col('city')?.style.width).toBe('128px');
    press(city, 'End');
    await fixture.whenStable();
    expect(col('city')?.style.width).toBe('200px');
    press(city, 'Home');
    await fixture.whenStable();
    expect(col('city')?.style.width).toBe('80px');
    // Another key changes nothing.
    press(city, 'a');
    await fixture.whenStable();
    expect(col('city')?.style.width).toBe('80px');
    // Shift+Enter restores the default width and forgets the stored one.
    press(city, 'Enter', true);
    await fixture.whenStable();
    expect(col('city')?.style.width).toBe('120px');
    expect(stored()).toBeNull();
    // Escape leaves the handle.
    city.focus();
    expect(document.activeElement).toBe(city);
    press(city, 'Escape');
    expect(document.activeElement).not.toBe(city);
  });

  it('fits a column to its widest heading or cell on double click or Enter, Shift resetting it', async (): Promise<void> => {
    // jsdom lays nothing out: each text measures 10 px per character from the cell's start.
    const native: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(
      Range.prototype,
      'getBoundingClientRect',
    );
    Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: function (this: Range): DOMRect {
        return new DOMRect(0, 0, (this.startContainer.textContent ?? '').trim().length * 10, 20);
      },
    });
    try {
      const { fixture, element, col, handle, stored } = await resizable();
      const city: HTMLElement = handle('Ville');
      city.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      await fixture.whenStable();
      // « Châteauroux », the widest of « Ville » and the cities, plus jsdom's 1 px cell padding.
      expect(col('city')?.style.width).toBe('111px');
      expect(stored()).toEqual({ city: 111 });
      // The cells are measured unwrapped, then given back their wrapping.
      expect(
        [...element.querySelectorAll<HTMLElement>('td[data-column="city"]')].every(
          (cell: HTMLElement): boolean => cell.style.whiteSpace === '',
        ),
      ).toBe(true);
      city.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, shiftKey: true }));
      await fixture.whenStable();
      expect(col('city')?.style.width).toBe('120px');
      expect(stored()).toBeNull();
      press(city, 'Enter');
      await fixture.whenStable();
      expect(col('city')?.style.width).toBe('111px');
    } finally {
      if (native) Object.defineProperty(Range.prototype, 'getBoundingClientRect', native);
      else delete (Range.prototype as Partial<Range>).getBoundingClientRect;
    }
  });

  it('keeps only the stored widths of existing fixed columns, within their bounds', async (): Promise<void> => {
    localStorage.setItem(
      'test.people.columns',
      JSON.stringify({ city: 999, name: 300, age: 300, gone: 50, bad: 'wide' }),
    );
    const { fixture, col, handle, stored } = await resizable();
    expect(col('city')?.style.width).toBe('200px');
    // The fill column and the column that opts out ignore theirs.
    expect(col('name')?.style.width).toBe('');
    expect(col('age')?.style.width).toBe('60px');
    press(handle('Ville'), 'ArrowRight');
    await fixture.whenStable();
    // Storage keeps the applying widths only.
    expect(stored()).toEqual({ city: 184 });
    vi.restoreAllMocks();
    document.body.replaceChildren();

    localStorage.setItem('test.people.columns', '{oops');
    const again: ResizableHarness = await resizable();
    expect(again.col('city')?.style.width).toBe('120px');
  });

  it('scrolls the frame once the columns need more room than it has, the heading sticking to it', async (): Promise<void> => {
    const narrow: ResizableHarness = await resizable(300);
    expect(narrow.table().style.minWidth).toBe('420px');
    expect(narrow.frame().className).toContain('overflow-x-auto');
    narrow.fixture.componentInstance.sticky.set(true);
    await narrow.fixture.whenStable();
    expect(narrow.frame().className).toContain('overflow-y-auto');
    expect(narrow.frame().className).toContain(
      'max-h-[calc(100dvh-var(--data-table-sticky-top,0px))]',
    );
    expect(narrow.element.querySelector('thead')?.className).toContain('top-0');
    vi.restoreAllMocks();
    document.body.replaceChildren();

    const wide: ResizableHarness = await resizable(1000, (host: ResizableHostComponent): void =>
      host.sticky.set(true),
    );
    expect(wide.frame().className).toContain('overflow-x-clip');
    expect(wide.frame().className).not.toContain('overflow-y-auto');
    expect(wide.element.querySelector('thead')?.className).toContain(
      'top-[var(--data-table-sticky-top,0px)]',
    );
  });

  it('leaves the columns a responsive class hides out of the room needed', async (): Promise<void> => {
    const computed: typeof window.getComputedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      (target: Element, pseudo?: string | null): CSSStyleDeclaration => {
        const style: CSSStyleDeclaration = computed(target, pseudo);
        if (!(target instanceof HTMLTableColElement) || target.dataset['column'] !== 'city') {
          return style;
        }
        return new Proxy(style, {
          get: (base: CSSStyleDeclaration, key: string | symbol): unknown =>
            key === 'display' ? 'none' : Reflect.get(base, key),
        });
      },
    );
    const { table } = await resizable(1000);
    expect(table().style.minWidth).toBe('300px');
  });

  it('sizes a table without fill column to its columns, each handle on its end edge', async (): Promise<void> => {
    const { fixture, col, handle, table } = await resizable(
      1000,
      (host: ResizableHostComponent): void =>
        host.columns.update((columns) =>
          columns.map((column) => (column.id === 'name' ? { ...column, width: 160 } : column)),
        ),
    );
    expect(table().style.width).toBe('380px');
    expect(table().style.minWidth).toBe('');
    expect(col('name')?.style.width).toBe('160px');
    expect(handle('Nom').dataset['side']).toBe('end');
    expect(handle('Ville').dataset['side']).toBe('end');
    // On the end edge, moving right widens the column.
    press(handle('Ville'), 'ArrowRight');
    await fixture.whenStable();
    expect(col('city')?.style.width).toBe('136px');
    expect(table().style.width).toBe('396px');
  });

  it('drops the col of a hidden column with it', async (): Promise<void> => {
    const { fixture, element, col } = await resizable();
    fixture.componentInstance.state.update((state) => ({ ...state, hidden: ['city'] }));
    await fixture.whenStable();
    expect(col('city')).toBeNull();
    expect(element.querySelectorAll('col')).toHaveLength(3);
  });
});

/**
 * Function table
 *
 * @description
 * Table element of a rendered host.
 *
 * @param {HTMLElement} element - Host element.
 * @returns {HTMLElement} The table.
 */
function table(element: HTMLElement): HTMLElement {
  return element.querySelector('table') as HTMLElement;
}
