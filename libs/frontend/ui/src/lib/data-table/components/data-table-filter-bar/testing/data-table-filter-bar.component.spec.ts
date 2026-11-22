import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import {
  DataTableFilterBarComponent,
  type DataTableFacetChange,
} from '@internal/ui/lib/data-table/components/data-table-filter-bar/data-table-filter-bar.component';
import type { DataTableFacetView } from '@internal/ui/lib/data-table/models/data-table/data-table-facet-view.interface';
import type { DataTableState } from '@internal/ui/lib/data-table/models/data-table/data-table-state.interface';

@Component({
  imports: [DataTableFilterBarComponent],
  template: `
    <ui-data-table-filter-bar
      controls="articles"
      [size]="size()"
      [state]="state()"
      [facetViews]="facets"
      (searchChanged)="searches.push($event)"
      (facetChanged)="changes.push($event)"
      (resetRequested)="resets = resets + 1"
    >
      <button type="button">Action</button>
    </ui-data-table-filter-bar>
  `,
})
class FilterHostComponent {
  public readonly size: WritableSignal<'sm' | 'lg'> = signal<'sm' | 'lg'>('sm');
  public readonly state: WritableSignal<Pick<DataTableState, 'search' | 'facets'>> = signal<
    Pick<DataTableState, 'search' | 'facets'>
  >({ search: '', facets: { category: ['engineering', 'design'] } });
  public readonly facets: readonly DataTableFacetView[] = [
    {
      id: 'category',
      label: 'Catégorie',
      options: [
        { value: 'engineering', label: 'Ingénierie', count: 3, selected: true },
        { value: 'design', label: 'Design', count: 2, selected: true },
      ],
    },
  ];
  public readonly searches: string[] = [];
  public readonly changes: DataTableFacetChange[] = [];
  public resets: number = 0;
}

describe('DataTableFilterBarComponent', (): void => {
  it('forwards searches and chip removal without changing the caller state', async (): Promise<void> => {
    const fixture: ComponentFixture<FilterHostComponent> =
      TestBed.createComponent(FilterHostComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const search: HTMLInputElement | null = root.querySelector('input[type="search"]');
    if (!search) throw new Error('The search input is missing.');
    expect(search.getAttribute('aria-controls')).toBe('articles');
    search.value = 'Architecture';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    const remove: HTMLButtonElement | null = root.querySelector(
      'button[aria-label="Retirer le filtre Catégorie : Ingénierie"]',
    );
    if (!remove) throw new Error('The active category chip is missing.');
    remove.click();
    expect(fixture.componentInstance.searches).toEqual(['Architecture']);
    expect(fixture.componentInstance.changes).toEqual([{ id: 'category', values: ['design'] }]);
    expect(fixture.componentInstance.state().facets).toEqual({
      category: ['engineering', 'design'],
    });
    fixture.destroy();
  });

  it('offers reset and keeps projected actions inside the toolbar', async (): Promise<void> => {
    const fixture: ComponentFixture<FilterHostComponent> =
      TestBed.createComponent(FilterHostComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const toolbar: HTMLElement | null = root.querySelector('[data-slot="data-table-toolbar"]');
    expect(toolbar?.textContent).toContain('Action');
    const reset: HTMLButtonElement | null = root.querySelector('[data-slot="data-table-reset"]');
    if (!reset) throw new Error('The reset control is missing.');
    reset.click();
    expect(fixture.componentInstance.resets).toBe(1);
    fixture.componentInstance.state.set({ search: '', facets: {} });
    await fixture.whenStable();
    expect(root.querySelector<HTMLElement>('[data-slot="data-table-filters"]')?.inert).toBe(true);
    expect(root.querySelector('[data-slot="data-table-reset"]')).toBeNull();
    fixture.destroy();
  });

  it('grows its search, filter buttons and chips for a public page', async (): Promise<void> => {
    const fixture: ComponentFixture<FilterHostComponent> =
      TestBed.createComponent(FilterHostComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const classes = (selector: string): string => root.querySelector(selector)?.className ?? '';
    expect(classes('[data-slot="input-group"]')).toContain('h-8');
    expect(classes('[data-slot="data-table-facet-filter"] button')).toContain('h-8');
    fixture.componentInstance.size.set('lg');
    await fixture.whenStable();
    expect(classes('[data-slot="input-group"]')).toContain('h-11');
    expect(classes('[data-slot="data-table-facet-filter"] button')).toContain('h-11');
    expect(classes('[data-slot="data-table-filter-chip"]')).toContain('h-8');
  });

  it('scrolls a long facet instead of growing its popover', async (): Promise<void> => {
    const fixture: ComponentFixture<FilterHostComponent> =
      TestBed.createComponent(FilterHostComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    root.querySelector<HTMLButtonElement>('[data-slot="data-table-facet-filter"] button')?.click();
    await fixture.whenStable();
    const options: HTMLElement | null = document.querySelector(
      '[data-slot="data-table-facet-options"]',
    );
    expect(options?.className).toContain('max-h-[min(18rem,50dvh)]');
    expect(options?.className).toContain('overflow-y-auto');
  });
});
