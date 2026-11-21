import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  output,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideSearch, lucideX } from '@ng-icons/lucide';
import { ButtonDirective } from '@internal/ui/lib/button/button.directive';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import {
  InputGroupAddonDirective,
  InputGroupDirective,
  InputGroupInputDirective,
} from '@internal/ui/lib/input-group/input-group.directives';
import { DATA_TABLE_LABELS } from '@internal/ui/lib/data-table/constants/data-table-labels.constants';
import { DataTableFacetFilterComponent } from '@internal/ui/lib/data-table/components/data-table-facet-filter/data-table-facet-filter.component';
import type { DataTableActiveFilter } from '@internal/ui/lib/data-table/models/data-table/data-table-active-filter.interface';
import type { DataTableFacetView } from '@internal/ui/lib/data-table/models/data-table/data-table-facet-view.interface';
import type { DataTableLabels } from '@internal/ui/lib/data-table/models/data-table/data-table-labels.interface';
import type { DataTableState } from '@internal/ui/lib/data-table/models/data-table/data-table-state.interface';
import { hasActiveFilters } from '@internal/ui/lib/data-table/utils/data-table-state/data-table-state.utils';

/** Controlled facet update emitted by a filter menu or an active chip. */
export interface DataTableFacetChange {
  readonly id: string;
  readonly values: readonly string[];
}

/** Search, multi-value facets and removable chips shared by tables and card collections. */
@Component({
  selector: 'ui-data-table-filter-bar',
  imports: [
    ButtonDirective,
    DataTableFacetFilterComponent,
    InputGroupAddonDirective,
    InputGroupDirective,
    InputGroupInputDirective,
    NgIcon,
  ],
  templateUrl: './data-table-filter-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents', 'data-slot': 'data-table-filter-bar' },
})
export class DataTableFilterBarComponent {
  public readonly state: InputSignal<Pick<DataTableState, 'search' | 'facets'>> =
    input.required<Pick<DataTableState, 'search' | 'facets'>>();
  public readonly facetViews: InputSignal<readonly DataTableFacetView[]> = input<
    readonly DataTableFacetView[]
  >([]);
  public readonly labels: InputSignal<DataTableLabels> = input<DataTableLabels>(DATA_TABLE_LABELS);
  public readonly searchable: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    true,
    { transform: booleanAttribute },
  );
  public readonly framed: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    true,
    { transform: booleanAttribute },
  );
  public readonly controls: InputSignal<string | undefined> = input<string>();

  /**
   * Size of the controls: `sm` (32 px search and filters, 24 px chips) for the admin tables, `lg`
   * (44 px search and filters, 32 px chips) for a public collection page.
   */
  public readonly size: InputSignal<'sm' | 'lg'> = input<'sm' | 'lg'>('sm');

  public readonly searchChanged: OutputEmitterRef<string> = output<string>();
  public readonly facetChanged: OutputEmitterRef<DataTableFacetChange> =
    output<DataTableFacetChange>();
  public readonly resetRequested: OutputEmitterRef<void> = output<void>();

  protected readonly activeFilters: Signal<readonly DataTableActiveFilter[]> = computed(() =>
    this.facetViews().flatMap((facet) =>
      (this.state().facets[facet.id] ?? []).map((value) => ({
        facet: facet.id,
        facetLabel: facet.label,
        value,
        label: facet.options.find((option) => option.value === value)?.label ?? value,
      })),
    ),
  );
  protected readonly searchClasses: Signal<string> = computed<string>((): string =>
    this.size() === 'lg'
      ? 'h-11 w-80 rounded-md @max-[640px]:w-full'
      : 'h-8 w-56 rounded-sm @max-[640px]:w-full',
  );
  protected readonly chipClasses: Signal<string> = computed<string>((): string =>
    cn(
      'inline-flex items-center gap-1 border border-border bg-surface-raised text-fg',
      this.size() === 'lg'
        ? 'h-8 rounded-sm ps-3 pe-1 text-[14px]'
        : 'h-6 rounded-xs ps-2 pe-0.5 text-[12px]',
    ),
  );
  protected readonly filtersActive: Signal<boolean> = computed(() =>
    hasActiveFilters(this.state()),
  );
  protected readonly filterBarFrameClasses: Signal<string> = computed(() =>
    cn(
      'grid grid-rows-[0fr] transition-[grid-template-rows] duration-(--dur-roll) ease-orbit data-open:grid-rows-[1fr] motion-reduce:transition-none',
      !this.framed() && 'border-b border-border',
    ),
  );
  protected readonly filterBarClasses: Signal<string> = computed(() =>
    cn(
      'flex flex-wrap items-center gap-2',
      !this.framed() && 'min-h-11 border-t border-border px-6 py-1.5 @max-[640px]:px-4',
    ),
  );
  protected readonly toolbarClasses: Signal<string> = computed(() =>
    cn(
      'flex flex-wrap items-center gap-2',
      !this.framed() && 'min-h-11 px-6 py-1.5 @max-[640px]:px-4',
    ),
  );
  protected readonly icons: {
    readonly search: typeof lucideSearch;
    readonly remove: typeof lucideX;
  } = {
    search: lucideSearch,
    remove: lucideX,
  };

  /** Forwards the complete query while the owner decides how to store and apply it. */
  protected onSearch(event: Event): void {
    this.searchChanged.emit((event.target as HTMLInputElement).value);
  }

  /** Removes one value while preserving the other selections of the same facet. */
  protected removeFilter(filter: DataTableActiveFilter): void {
    this.facetChanged.emit({
      id: filter.facet,
      values: (this.state().facets[filter.facet] ?? []).filter((value) => value !== filter.value),
    });
  }
}
