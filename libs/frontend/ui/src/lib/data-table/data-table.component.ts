import type { CellValue } from '@internal/ui/lib/data-table/models/data-table/cell-value.type';
import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  LOCALE_ID,
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  computed,
  contentChild,
  contentChildren,
  effect,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
  viewChild,
  viewChildren,
  type InputSignal,
  type InputSignalWithTransform,
  type ModelSignal,
  type OutputEmitterRef,
  type Signal,
  type TemplateRef,
  type WritableSignal,
  untracked,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import {
  lucideArrowDown,
  lucideArrowUp,
  lucideArrowUpDown,
  lucideSearch,
  lucideX,
} from '@ng-icons/lucide';
import { ButtonDirective } from '@internal/ui/lib/button/button.directive';
import { CheckboxComponent } from '@internal/ui/lib/checkbox/checkbox.component';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import {
  InputGroupAddonDirective,
  InputGroupDirective,
  InputGroupInputDirective,
} from '@internal/ui/lib/input-group/input-group.directives';
import { SkeletonDirective } from '@internal/ui/lib/skeleton/skeleton.directive';
import { EMPTY_IMPORTS } from '@internal/ui/lib/empty/constants/empty.imports';
import {
  matchesSearch,
  nextSorts,
  pageCount,
  pageRows,
  sortRowsBy,
} from '@internal/ui/lib/data-table/utils/data-table/data-table.utils';
import {
  facetOptions,
  facetValues,
  matchesFacets,
} from '@internal/ui/lib/data-table/utils/data-table-facets/data-table-facets.utils';
import {
  hasActiveFilters,
  withFacet,
  withoutFilters,
} from '@internal/ui/lib/data-table/utils/data-table-state/data-table-state.utils';
import type { DataTableColumn } from '@internal/ui/lib/data-table/models/data-table/data-table-column.interface';
import type { DataTableSort } from '@internal/ui/lib/data-table/models/data-table/data-table-sort.interface';
import type { DataTableCellContext } from '@internal/ui/lib/data-table/models/data-table/data-table-cell-context.interface';
import type { DataTableState } from '@internal/ui/lib/data-table/models/data-table/data-table-state.interface';
import type { DataTableFacet } from '@internal/ui/lib/data-table/models/data-table/data-table-facet.interface';
import type { DataTableFacetView } from '@internal/ui/lib/data-table/models/data-table/data-table-facet-view.interface';
import type { DataTableActiveFilter } from '@internal/ui/lib/data-table/models/data-table/data-table-active-filter.interface';
import type { DataTableColumnToggle } from '@internal/ui/lib/data-table/models/data-table/data-table-column-toggle.interface';
import type { DataTableDensity } from '@internal/ui/lib/data-table/models/data-table/data-table-density.type';
import type { DataTableEmptyContext } from '@internal/ui/lib/data-table/models/data-table/data-table-empty-context.interface';
import type { DataTableEmptyLayout } from '@internal/ui/lib/data-table/models/data-table/data-table-empty-layout.type';
import type { DataTableLabels } from '@internal/ui/lib/data-table/models/data-table/data-table-labels.interface';
import type { DataTableSearchPredicate } from '@internal/ui/lib/data-table/models/data-table/data-table-search-predicate.type';
import { alignClasses } from '@internal/ui/lib/data-table/constants/data-table.constants';
import { dataTableDensityClasses } from '@internal/ui/lib/data-table/constants/data-table-density.constants';
import { DATA_TABLE_INITIAL_STATE } from '@internal/ui/lib/data-table/constants/data-table-initial-state.constants';
import { DATA_TABLE_LABELS } from '@internal/ui/lib/data-table/constants/data-table-labels.constants';
import { dataTableInteractiveSelector } from '@internal/ui/lib/data-table/constants/data-table-interactive.constants';
import { dataTableSkeletonWidths } from '@internal/ui/lib/data-table/constants/data-table-skeleton-widths.constants';
import { DataTableCellDirective } from '@internal/ui/lib/data-table/directives/data-table-cell/data-table-cell.directive';
import { DataTableEmptyDirective } from '@internal/ui/lib/data-table/directives/data-table-empty/data-table-empty.directive';
import { DataTableColumnMenuComponent } from '@internal/ui/lib/data-table/components/data-table-column-menu/data-table-column-menu.component';
import { DataTableFacetFilterComponent } from '@internal/ui/lib/data-table/components/data-table-facet-filter/data-table-facet-filter.component';
import { DataTableEmptyCellComponent } from '@internal/ui/lib/data-table/components/data-table-empty-cell/data-table-empty-cell.component';
import { DataTablePaginationComponent } from '@internal/ui/lib/data-table/components/data-table-pagination/data-table-pagination.component';
import { DataTableColumnWidthsService } from '@internal/ui/lib/data-table/services/data-table-column-widths/data-table-column-widths.service';
import {
  clampWidth,
  contentWidth,
  keptColumnWidths,
  resizeDirection,
} from '@internal/ui/lib/data-table/utils/data-table-column-widths/data-table-column-widths.utils';
import { dataTableColumnWidths } from '@internal/ui/lib/data-table/constants/data-table-column-widths.constants';
import type { DataTableColumnDrag } from '@internal/ui/lib/data-table/models/data-table/data-table-column-drag.interface';

/**
 * Interface DataTableResizeHandle
 *
 * @description
 * A column divider's handle: the header edge drawing it, the column it resizes and that column's edge
 * the handle stands for (which sets the drag direction).
 *
 * @template T - Row type.
 */
interface DataTableResizeHandle<T> {
  readonly side: 'start' | 'end';
  readonly target: DataTableColumn<T>;
  readonly targetSide: 'start' | 'end';
}

/**
 * Component DataTableComponent
 * @class DataTableComponent
 *
 * @description
 * Client-side data table: a toolbar (global search, faceted filters with counts and removable chips,
 * column visibility, projected `[uiDataTableToolbar]` actions), sortable headers (`aria-sort`,
 * Shift+click adds a key), pagination, selection, optional row activation, skeleton loading rows and
 * distinct empty and no-result states, rendered below the heading row as `uiEmpty` blocks whose height
 * follows `emptyLayout` (`fill` makes the table grow into the rest of its flex column). Search, facets, sort, page and hidden columns live in one
 * serialisable `state` model that a page can mirror in its URL; changing the search, a facet or the page
 * size goes back to the first page. The `selection` model survives sorting and paging (the header
 * checkbox adds or removes the visible page) but only ever holds rows the search and facets keep, in
 * their latest `data` instance: a filter drops the rows it hides, so that a bulk action never reaches a
 * row the user cannot see in the list, and a reload hands back the fresh objects (their new version).
 * With `resizableColumns` the table takes the fixed layout with a `colgroup` from the first render
 * that holds the model, never a measure (D36): the selection column and every column with a `width`
 * are fixed in pixels (the stored width, else the `width`), and the first column without one fills the
 * room left, down to its minimum, below which the table scrolls sideways. Each fixed resizable column
 * gets a separator on the edge facing the fill column, so that the dragged edge follows the pointer
 * while the fill column absorbs the change: drag (Escape cancels), arrows by 16 px (64 with Shift),
 * Home and End for the bounds, double click or Enter to fit the content, Shift with either for the
 * default width; widths are kept per viewer under `columnWidthsKey`, stored when a drag ends.
 *
 * @template T - Row type consumed by the columns and custom cell templates.
 */
@Component({
  selector: 'ui-data-table',
  imports: [
    ButtonDirective,
    CheckboxComponent,
    DataTableColumnMenuComponent,
    DataTableEmptyCellComponent,
    DataTableFacetFilterComponent,
    DataTablePaginationComponent,
    EMPTY_IMPORTS,
    InputGroupAddonDirective,
    InputGroupDirective,
    InputGroupInputDirective,
    NgIcon,
    NgTemplateOutlet,
    SkeletonDirective,
  ],
  templateUrl: './data-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.data-density]': 'density()',
    'data-slot': 'data-table',
  },
})
export class DataTableComponent<T> {
  // #region Properties
  /**
   * Property data
   * @readonly
   *
   * @description
   * Rows in their default order, kept when no column is sorted.
   *
   * @type {InputSignal<readonly T[]>}
   */
  public readonly data: InputSignal<readonly T[]> = input.required<readonly T[]>();

  /**
   * Property columns
   * @readonly
   *
   * @description
   * Column definitions: labels, alignment, cell, search and sort values, visibility.
   *
   * @type {InputSignal<readonly DataTableColumn<T>[]>}
   */
  public readonly columns: InputSignal<readonly DataTableColumn<T>[]> =
    input.required<readonly DataTableColumn<T>[]>();

  /**
   * Property facets
   * @readonly
   *
   * @description
   * Faceted filters offered in the toolbar, in display order.
   *
   * @type {InputSignal<readonly DataTableFacet<T>[]>}
   */
  public readonly facets: InputSignal<readonly DataTableFacet<T>[]> = input<
    readonly DataTableFacet<T>[]
  >([]);

  /**
   * Property searchPredicate
   * @readonly
   *
   * @description
   * Replaces the default search over the searchable cell values.
   *
   * @type {InputSignal<DataTableSearchPredicate<T> | undefined>}
   */
  public readonly searchPredicate: InputSignal<DataTableSearchPredicate<T> | undefined> =
    input<DataTableSearchPredicate<T>>();

  /**
   * Property rowKey
   * @readonly
   *
   * @description
   * Resolves the unique, stable identity used by row tracking and selection; the row object itself is
   * the default key.
   *
   * @type {InputSignal<(row: T) => unknown>}
   */
  public readonly rowKey: InputSignal<(row: T) => unknown> = input<(row: T) => unknown>(
    (row) => row,
  );

  /**
   * Property rowLabel
   * @readonly
   *
   * @description
   * Optional accessible name used in the selection checkbox label instead of a row number.
   *
   * @type {InputSignal<((row: T) => string) | undefined>}
   */
  public readonly rowLabel: InputSignal<((row: T) => string) | undefined> =
    input<(row: T) => string>();

  /**
   * Property caption
   * @readonly
   *
   * @description
   * Accessible caption of the table (visually hidden).
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly caption: InputSignal<string | undefined> = input<string>();

  /**
   * Property selectable
   * @readonly
   *
   * @description
   * Whether selection checkboxes and their header control are rendered.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly selectable: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property emptyLayout
   * @readonly
   *
   * @description
   * Height rule of the empty and no-result states (D36 empty state revision): `fill` when the table
   * is the last thing in its page column (the table then takes the remaining height of a flex
   * column), `inline` (the default) when something follows it.
   *
   * @type {InputSignal<DataTableEmptyLayout>}
   */
  public readonly emptyLayout: InputSignal<DataTableEmptyLayout> =
    input<DataTableEmptyLayout>('inline');

  /**
   * Property searchable
   * @readonly
   *
   * @description
   * Whether the toolbar shows the global search field.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly searchable: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    true,
    { transform: booleanAttribute },
  );

  /**
   * Property columnMenu
   * @readonly
   *
   * @description
   * Whether the toolbar shows the "Colonnes" menu when a column is hideable.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly columnMenu: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    true,
    { transform: booleanAttribute },
  );

  /**
   * Property paginated
   * @readonly
   *
   * @description
   * Whether the table limits visible rows to the current page.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly paginated: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    true,
    { transform: booleanAttribute },
  );

  /**
   * Property pageSizeOptions
   * @readonly
   *
   * @description
   * Page sizes offered by the page-size selector.
   *
   * @type {InputSignal<readonly number[]>}
   */
  public readonly pageSizeOptions: InputSignal<readonly number[]> = input<readonly number[]>([
    10, 20, 50,
  ]);

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Marks the table busy; without rows yet, skeleton rows matching the visible columns stand in.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly loading: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property skeletonRows
   * @readonly
   *
   * @description
   * Number of skeleton rows rendered while loading.
   *
   * @type {InputSignal<number>}
   */
  public readonly skeletonRows: InputSignal<number> = input<number>(5);

  /**
   * Property density
   * @readonly
   *
   * @description
   * Row height and text size.
   *
   * @type {InputSignal<DataTableDensity>}
   */
  public readonly density: InputSignal<DataTableDensity> = input<DataTableDensity>('comfortable');

  /**
   * Property framed
   * @readonly
   *
   * @description
   * Draws the table in a rounded bordered frame; `false` gives full-bleed hairline rows whose toolbar,
   * first and last cells and footer take the page gutter (D36 admin lists).
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly framed: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    true,
    { transform: booleanAttribute },
  );

  /**
   * Property stickyHeader
   * @readonly
   *
   * @description
   * Keeps the column headings at the top of the page while it scrolls, below
   * `--data-table-sticky-top` (a sticky title bar). The frame then clips instead of scrolling
   * sideways, so the columns should fit: hide the secondary ones with responsive classes. Resizable
   * columns that need more room than the frame has make it scroll on both axes within the viewport,
   * the headings sticking to its top.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly stickyHeader: InputSignalWithTransform<boolean, unknown> = input<
    boolean,
    unknown
  >(false, { transform: booleanAttribute });

  /**
   * Property activatable
   * @readonly
   *
   * @description
   * Emits `rowActivated` on a click anywhere in a row, except from the links, buttons, inputs and
   * menus inside it. Rows stay out of the tab order: keyboard users reach the row's link (Enter
   * follows it) and its actions, one stop each, so an activatable row should hold a link or button
   * doing the same thing.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly activatable: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property resizableColumns
   * @readonly
   *
   * @description
   * Lets the user resize the columns that have a `width` in pixels and do not opt out
   * (`resizable: false`); the table then uses the fixed layout, and its first column without `width`
   * (give exactly one) takes the room the others leave.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly resizableColumns: InputSignalWithTransform<boolean, unknown> = input<
    boolean,
    unknown
  >(false, { transform: booleanAttribute });

  /**
   * Property columnWidthsKey
   * @readonly
   *
   * @description
   * Storage key under which resized widths are kept for this viewer; without one they last for the
   * page only.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly columnWidthsKey: InputSignal<string | undefined> = input<string>();

  /**
   * Property labels
   * @readonly
   *
   * @description
   * Texts replacing the French catalogue defaults (`DATA_TABLE_LABELS`).
   *
   * @type {InputSignal<Partial<DataTableLabels>>}
   */
  public readonly labels: InputSignal<Partial<DataTableLabels>> = input<Partial<DataTableLabels>>(
    {},
  );

  /**
   * Property class
   * @readonly
   *
   * @description
   * Optional caller classes merged with the component's flex-column layout classes.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property state
   * @readonly
   *
   * @description
   * Controlled, serialisable search, facet, sort, page and column state.
   *
   * @type {ModelSignal<DataTableState>}
   */
  public readonly state: ModelSignal<DataTableState> =
    model<DataTableState>(DATA_TABLE_INITIAL_STATE);

  /**
   * Property selection
   * @readonly
   *
   * @description
   * Controlled selected rows; row identity comparisons use `rowKey`. Pruned to the rows kept by the
   * search and facets, and refreshed to the current `data` objects of the same key.
   *
   * @type {ModelSignal<readonly T[]>}
   */
  public readonly selection: ModelSignal<readonly T[]> = model<readonly T[]>([]);

  /**
   * Property rowActivated
   * @readonly
   *
   * @description
   * Emits the row clicked when `activatable` is set; Enter on the row's link follows that link.
   *
   * @type {OutputEmitterRef<T>}
   */
  public readonly rowActivated: OutputEmitterRef<T> = output<T>();

  /**
   * Property text
   * @readonly
   *
   * @description
   * Catalogue texts with the caller's overrides.
   *
   * @type {Signal<DataTableLabels>}
   */
  protected readonly text: Signal<DataTableLabels> = computed<DataTableLabels>(() => ({
    ...DATA_TABLE_LABELS,
    ...this.labels(),
  }));

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide glyphs of the sort states, the search field and the chip remove buttons.
   */
  protected readonly icons: {
    readonly asc: typeof lucideArrowUp;
    readonly desc: typeof lucideArrowDown;
    readonly unsorted: typeof lucideArrowUpDown;
    readonly search: typeof lucideSearch;
    readonly remove: typeof lucideX;
  } = {
    asc: lucideArrowUp,
    desc: lucideArrowDown,
    unsorted: lucideArrowUpDown,
    search: lucideSearch,
    remove: lucideX,
  } as const;

  /**
   * Property tableId
   * @readonly
   *
   * @description
   * Per-instance table id referenced by the toolbar and pagination controls through `aria-controls`.
   *
   * @type {string}
   */
  protected readonly tableId: string =
    inject<RenderIdService>(RenderIdService).next('ui-data-table-');

  /**
   * Property emptyTemplate
   * @readonly
   *
   * @description
   * Projected content replacing the no-data message.
   *
   * @type {Signal<DataTableEmptyDirective | undefined>}
   */
  protected readonly emptyTemplate: Signal<DataTableEmptyDirective | undefined> =
    contentChild<DataTableEmptyDirective>(DataTableEmptyDirective);

  /**
   * Property cellTemplates
   * @readonly
   *
   * @description
   * Live query of custom cell template directives projected into the table.
   *
   * @type {Signal<readonly DataTableCellDirective<T>[]>}
   */
  private readonly cellTemplates: Signal<readonly DataTableCellDirective<T>[]> =
    contentChildren<DataTableCellDirective<T>>(DataTableCellDirective);

  /**
   * Property templates
   * @readonly
   *
   * @description
   * Map from projected column ids to their typed row templates.
   *
   * @type {Signal<Map<string, TemplateRef<DataTableCellContext<T>>>>}
   */
  protected readonly templates: Signal<Map<string, TemplateRef<DataTableCellContext<T>>>> =
    computed<Map<string, TemplateRef<DataTableCellContext<T>>>>(
      () => new Map(this.cellTemplates().map((cell) => [cell.uiDataTableCell(), cell.template])),
    );

  /**
   * Property document
   * @readonly
   *
   * @description
   * Document read for a text selection before activating a row.
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property collator
   * @readonly
   *
   * @description
   * Locale-aware collator (French in the source build) with numeric ordering and accent-insensitive
   * comparison, used by sorting and derived facet options.
   *
   * @type {Intl.Collator}
   */
  private readonly collator: Intl.Collator = new Intl.Collator(inject<string>(LOCALE_ID), {
    numeric: true,
    sensitivity: 'base',
  });

  /**
   * Property visibleColumns
   * @readonly
   *
   * @description
   * Columns rendered: every column but the hideable ones listed in `state.hidden`.
   *
   * @type {Signal<readonly DataTableColumn<T>[]>}
   */
  protected readonly visibleColumns: Signal<readonly DataTableColumn<T>[]> = computed<
    readonly DataTableColumn<T>[]
  >(() => {
    const hidden: readonly string[] = this.state().hidden;
    return this.columns().filter(
      (column) => column.hideable === false || !hidden.includes(column.id),
    );
  });

  /**
   * Property columnToggles
   * @readonly
   *
   * @description
   * Hideable columns listed in the "Colonnes" menu.
   *
   * @type {Signal<DataTableColumnToggle[]>}
   */
  protected readonly columnToggles: Signal<DataTableColumnToggle[]> = computed<
    DataTableColumnToggle[]
  >(() => {
    const hidden: readonly string[] = this.state().hidden;
    return this.columns()
      .filter((column) => column.hideable !== false)
      .map((column) => ({
        id: column.id,
        header: column.header,
        visible: !hidden.includes(column.id),
      }));
  });

  /**
   * Property searched
   * @readonly
   *
   * @description
   * Rows matching the search, through the caller's predicate or every word in the searchable values.
   *
   * @type {Signal<readonly T[]>}
   */
  private readonly searched: Signal<readonly T[]> = computed<readonly T[]>(() => {
    const query: string = this.state().search;
    if (!query.trim()) return this.data();
    const predicate: DataTableSearchPredicate<T> | undefined = this.searchPredicate();
    if (predicate) return this.data().filter((row) => predicate(row, query));
    const columns: DataTableColumn<T>[] = this.columns().filter(
      (column) => column.searchable !== false && (column.searchValue ?? column.cell),
    );
    return this.data().filter((row) =>
      matchesSearch(
        columns.flatMap((column): CellValue | readonly CellValue[] =>
          (column.searchValue ?? column.cell)?.(row),
        ),
        query,
      ),
    );
  });

  /**
   * Property filtered
   * @readonly
   *
   * @description
   * Searched rows that pass every facet.
   *
   * @type {Signal<readonly T[]>}
   */
  private readonly filtered: Signal<readonly T[]> = computed<readonly T[]>(() => {
    const selected: Readonly<Record<string, readonly string[]>> = this.state().facets;
    return this.searched().filter((row) => matchesFacets(row, this.facets(), selected));
  });

  /**
   * Property facetViews
   * @readonly
   *
   * @description
   * Facets with their options counted within the search and the other facets.
   *
   * @type {Signal<DataTableFacetView[]>}
   */
  protected readonly facetViews: Signal<DataTableFacetView[]> = computed<DataTableFacetView[]>(
    () => {
      const facets: readonly DataTableFacet<T>[] = this.facets();
      const selected: Readonly<Record<string, readonly string[]>> = this.state().facets;
      return facets.map((facet) => {
        const pool: readonly T[] = this.searched().filter((row) =>
          matchesFacets(row, facets, selected, facet.id),
        );
        const checked: readonly string[] = selected[facet.id] ?? [];
        return {
          id: facet.id,
          label: facet.label,
          ...(facet.icon ? { icon: facet.icon } : {}),
          options: facetOptions(facet, this.data(), this.collator).map((option) => ({
            ...option,
            count: pool.filter((row) => facetValues(facet, row).includes(option.value)).length,
            selected: checked.includes(option.value),
          })),
        };
      });
    },
  );

  /**
   * Property activeFilters
   * @readonly
   *
   * @description
   * Checked facet values, in facet then state order, shown as removable chips.
   *
   * @type {Signal<DataTableActiveFilter[]>}
   */
  protected readonly activeFilters: Signal<DataTableActiveFilter[]> = computed<
    DataTableActiveFilter[]
  >(() =>
    this.facetViews().flatMap((facet) =>
      (this.state().facets[facet.id] ?? []).map((value) => ({
        facet: facet.id,
        facetLabel: facet.label,
        value,
        label: facet.options.find((option) => option.value === value)?.label ?? value,
      })),
    ),
  );

  /**
   * Property filtersActive
   * @readonly
   *
   * @description
   * Whether the search or a facet narrows the rows.
   *
   * @type {Signal<boolean>}
   */
  protected readonly filtersActive: Signal<boolean> = computed<boolean>(() =>
    hasActiveFilters(this.state()),
  );

  /**
   * Property sorted
   * @readonly
   *
   * @description
   * Filtered rows ordered by the sort keys of known sortable columns, stable on ties.
   *
   * @type {Signal<T[]>}
   */
  protected readonly sorted: Signal<T[]> = computed<T[]>(() => {
    const keys: { value: (row: T) => CellValue; direction: DataTableSort['direction'] }[] =
      this.state().sort.flatMap((sort) => {
        const column: DataTableColumn<T> | undefined = this.columns().find(
          (candidate) => candidate.id === sort.column && candidate.sortable,
        );
        const value: ((row: T) => CellValue) | undefined = column?.sortValue ?? column?.cell;
        return value ? [{ value, direction: sort.direction }] : [];
      });
    return sortRowsBy(this.filtered(), keys, this.collator);
  });

  /**
   * Property pageSize
   * @readonly
   *
   * @description
   * Rows per page, at least one.
   *
   * @type {Signal<number>}
   */
  protected readonly pageSize: Signal<number> = computed<number>(() =>
    Math.max(1, this.state().pageSize),
  );

  /**
   * Property pageTotal
   * @readonly
   *
   * @description
   * Number of pages for sorted rows, or one when pagination is disabled.
   *
   * @type {Signal<number>}
   */
  protected readonly pageTotal: Signal<number> = computed<number>(() =>
    this.paginated() ? pageCount(this.sorted().length, this.pageSize()) : 1,
  );

  /**
   * Property currentPage
   * @readonly
   *
   * @description
   * Requested page clamped to the available range (a URL may ask for a page that no longer exists).
   *
   * @type {Signal<number>}
   */
  protected readonly currentPage: Signal<number> = computed<number>(() =>
    Math.min(Math.max(0, Math.trunc(this.state().page) || 0), this.pageTotal() - 1),
  );

  /**
   * Property rows
   * @readonly
   *
   * @description
   * Visible rows after search, facets, sort and page slicing.
   *
   * @type {Signal<T[]>}
   */
  protected readonly rows: Signal<T[]> = computed<T[]>(() =>
    this.paginated() ? pageRows(this.sorted(), this.currentPage(), this.pageSize()) : this.sorted(),
  );

  /**
   * Property placeholders
   * @readonly
   *
   * @description
   * Skeleton row indexes while loading without rows; empty otherwise.
   *
   * @type {Signal<number[]>}
   */
  protected readonly placeholders: Signal<number[]> = computed<number[]>(() =>
    this.loading() && this.data().length === 0
      ? Array.from({ length: Math.max(1, this.skeletonRows()) }, (_, index) => index)
      : [],
  );

  /**
   * Property emptyShown
   * @readonly
   *
   * @description
   * Whether the empty or no-result state replaces the rows (no row to render, not loading).
   *
   * @type {Signal<boolean>}
   */
  protected readonly emptyShown: Signal<boolean> = computed<boolean>(
    (): boolean => this.placeholders().length === 0 && this.rows().length === 0,
  );

  /**
   * Property status
   * @readonly
   *
   * @description
   * Polite announcement: the loading text, or the no-result title once the search and facets leave
   * no row.
   *
   * @type {Signal<string>}
   */
  protected readonly status: Signal<string> = computed<string>((): string => {
    if (this.loading()) return this.text().loading;
    return this.emptyShown() && this.data().length > 0 ? this.text().noResults : '';
  });

  /**
   * Property emptyContext
   * @readonly
   *
   * @description
   * Context of a projected `uiDataTableEmpty` template.
   *
   * @type {Signal<DataTableEmptyContext>}
   */
  protected readonly emptyContext: Signal<DataTableEmptyContext> = computed<DataTableEmptyContext>(
    (): DataTableEmptyContext => ({ $implicit: this.emptyLayout() }),
  );

  /**
   * Property emptyClasses
   * @readonly
   *
   * @description
   * Gutters of the default empty and no-result states, the same as the first cell's: the page gutters
   * of a flush table (the `fill` layout carries them already), the cell inset of a framed one. They
   * stick to the start edge, so that a frame scrolled sideways (stored widths wider than the frame)
   * keeps the centred content in view.
   *
   * @type {Signal<string>}
   */
  protected readonly emptyClasses: Signal<string> = computed<string>((): string => {
    if (this.framed()) return 'sticky start-0 px-3';
    return this.emptyLayout() === 'inline'
      ? 'sticky start-0 px-6 @max-[640px]:px-4'
      : 'sticky start-0';
  });

  /**
   * Property fillsEmpty
   * @readonly
   *
   * @description
   * Whether the table grows into the rest of its column for a `fill` empty state.
   *
   * @type {Signal<boolean>}
   */
  private readonly fillsEmpty: Signal<boolean> = computed<boolean>(
    (): boolean => this.emptyShown() && this.emptyLayout() === 'fill',
  );

  /**
   * Property toolbar
   * @readonly
   *
   * @description
   * Whether the toolbar has a control to show.
   *
   * @type {Signal<boolean>}
   */
  protected readonly toolbar: Signal<boolean> = computed<boolean>(
    () =>
      this.searchable() ||
      this.facets().length > 0 ||
      (this.columnMenu() && this.columnToggles().length > 0),
  );

  /**
   * Property selectedKeys
   * @readonly
   *
   * @description
   * Set of selected row identities used for checkbox state lookups.
   *
   * @type {Signal<Set<unknown>>}
   */
  private readonly selectedKeys: Signal<Set<unknown>> = computed<Set<unknown>>(
    () => new Set(this.selection().map((row) => this.rowKey()(row))),
  );

  /**
   * Property allSelected
   * @readonly
   *
   * @description
   * Whether the current page contains rows and every visible row is selected.
   *
   * @type {Signal<boolean>}
   */
  protected readonly allSelected: Signal<boolean> = computed<boolean>(
    () => this.rows().length > 0 && this.rows().every((row) => this.isSelected(row)),
  );

  /**
   * Property someSelected
   * @readonly
   *
   * @description
   * Whether at least one but not all visible page rows are selected.
   *
   * @type {Signal<boolean>}
   */
  protected readonly someSelected: Signal<boolean> = computed<boolean>(
    () => !this.allSelected() && this.rows().some((row) => this.isSelected(row)),
  );

  /**
   * Property colspan
   * @readonly
   *
   * @description
   * Number of rendered columns, including the selection column when enabled.
   *
   * @type {Signal<number>}
   */
  protected readonly colspan: Signal<number> = computed<number>(
    () => this.visibleColumns().length + (this.selectable() ? 1 : 0),
  );

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Host layout: spaced blocks in a frame, flush blocks otherwise.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      'flex min-w-0 flex-col',
      this.framed() ? 'gap-4' : 'gap-0',
      this.fillsEmpty() && 'flex-1',
      this.class(),
    ),
  );

  /**
   * Property filterBarFrameClasses
   * @readonly
   *
   * @description
   * Animated frame of the filter bar. On a flush table it carries the one hairline under the toolbar:
   * closed, the frame is that 1 px line; open, the line rides the moving bottom edge, in both
   * directions, and the bar content draws the line between the toolbar and the chips.
   *
   * @type {Signal<string>}
   */
  protected readonly filterBarFrameClasses: Signal<string> = computed<string>(() =>
    cn(
      'grid grid-rows-[0fr] transition-[grid-template-rows] duration-(--dur-roll) ease-orbit data-open:grid-rows-[1fr] motion-reduce:transition-none',
      !this.framed() && 'border-b border-border',
    ),
  );

  /**
   * Property filterBarClasses
   * @readonly
   *
   * @description
   * Row of the active filter chips and the reset button, under the toolbar; flush tables give it the
   * page gutter and a hairline, like the toolbar.
   *
   * @type {Signal<string>}
   */
  protected readonly filterBarClasses: Signal<string> = computed<string>(() =>
    cn(
      'flex flex-wrap items-center gap-2',
      this.framed() ? 'pt-2' : 'min-h-11 border-t border-border px-6 py-1.5 @max-[640px]:px-4',
    ),
  );

  /**
   * Property toolbarClasses
   * @readonly
   *
   * @description
   * Toolbar row; flush tables give it the page gutter and a hairline.
   *
   * @type {Signal<string>}
   */
  protected readonly toolbarClasses: Signal<string> = computed<string>(() =>
    cn(
      'flex flex-wrap items-center gap-2',
      // The flush toolbar's bottom hairline is drawn by the filter bar's frame, right under it.
      !this.framed() && 'min-h-11 px-6 py-1.5 @max-[640px]:px-4',
    ),
  );

  /**
   * Property frameClasses
   * @readonly
   *
   * @description
   * Table wrapper. A sticky heading needs the page to scroll, so the frame clips sideways while the
   * columns fit; once resizable columns need more room than the frame has, the frame scrolls on both
   * axes within the viewport height below `--data-table-sticky-top`, and the heading sticks to its top.
   * Without a sticky heading the frame scrolls sideways.
   *
   * @type {Signal<string>}
   */
  protected readonly frameClasses: Signal<string> = computed<string>(() =>
    cn(
      'relative w-full',
      this.stickyHeader() && !this.scrolls()
        ? 'overflow-x-clip'
        : '[scrollbar-width:thin] [scrollbar-color:color-mix(in_srgb,var(--fg)_24%,transparent)_transparent] overflow-x-auto',
      this.stickyHeader() &&
        this.scrolls() &&
        'max-h-[calc(100dvh-var(--data-table-sticky-top,0px))] overflow-y-auto overscroll-x-contain',
      this.framed() && 'rounded-xl border border-border',
      this.fillsEmpty() && 'flex flex-1 flex-col',
    ),
  );

  /**
   * Property tableClasses
   * @readonly
   *
   * @description
   * Table text size of the density; separate borders so that a sticky heading keeps its hairline.
   *
   * @type {Signal<string>}
   */
  protected readonly tableClasses: Signal<string> = computed<string>(() =>
    cn(
      'w-full caption-bottom border-separate border-spacing-0',
      dataTableDensityClasses[this.density()].table,
      (this.resizableColumns() || (this.rows().length === 0 && this.frozen())) && 'table-fixed',
    ),
  );

  /**
   * Property colgroup
   * @readonly
   *
   * @description
   * Whether the table writes its column widths in a `colgroup`: always with resizable columns, else
   * while it shows no row after a measure.
   *
   * @type {Signal<boolean>}
   */
  protected readonly colgroup: Signal<boolean> = computed<boolean>(
    (): boolean => this.resizableColumns() || (this.rows().length === 0 && this.frozen()),
  );

  /**
   * Property headerCells
   * @readonly
   *
   * @description
   * Heading cells of the visible columns, measured while a table without resizable columns has rows.
   *
   * @type {Signal<readonly ElementRef<HTMLTableCellElement>[]>}
   */
  private readonly headerCells: Signal<readonly ElementRef<HTMLTableCellElement>[]> = viewChildren<
    string,
    ElementRef<HTMLTableCellElement>
  >('headerCell', { read: ElementRef });

  /**
   * Property frame
   * @readonly
   *
   * @description
   * Table wrapper, observed for its width and holding the resize guide.
   *
   * @type {Signal<ElementRef<HTMLDivElement> | undefined>}
   */
  private readonly frame: Signal<ElementRef<HTMLDivElement> | undefined> = viewChild<
    string,
    ElementRef<HTMLDivElement>
  >('frame', { read: ElementRef });

  /**
   * Property tableElement
   * @readonly
   *
   * @description
   * Table element, measured by the guide line and searched by the auto-fit.
   *
   * @type {Signal<ElementRef<HTMLTableElement> | undefined>}
   */
  private readonly tableElement: Signal<ElementRef<HTMLTableElement> | undefined> = viewChild<
    string,
    ElementRef<HTMLTableElement>
  >('table', { read: ElementRef });

  /**
   * Property guide
   * @readonly
   *
   * @description
   * Dashed `border-strong` line following the dragged edge over the table height, placed
   * imperatively on each animation frame.
   *
   * @type {Signal<ElementRef<HTMLDivElement> | undefined>}
   */
  private readonly guide: Signal<ElementRef<HTMLDivElement> | undefined> = viewChild<
    string,
    ElementRef<HTMLDivElement>
  >('guide', { read: ElementRef });

  /**
   * Property cols
   * @readonly
   *
   * @description
   * `col` of each visible column: a drag writes the dragged width on it in the same frame, and a
   * responsive `hidden` it carries tells which columns take no room.
   *
   * @type {Signal<readonly ElementRef<HTMLTableColElement>[]>}
   */
  private readonly cols: Signal<readonly ElementRef<HTMLTableColElement>[]> = viewChildren<
    string,
    ElementRef<HTMLTableColElement>
  >('col', { read: ElementRef });

  /**
   * Property columnWidths
   * @readonly
   *
   * @description
   * Width of each column, in pixels, the last time a table without resizable columns showed rows: a
   * search without result keeps them (fixed layout) instead of letting the columns jump around the
   * "no result" line. Resizable columns never read it: their widths are the model's.
   *
   * @type {WritableSignal<ReadonlyMap<string, number>>}
   */
  private readonly columnWidths: WritableSignal<ReadonlyMap<string, number>> = signal<
    ReadonlyMap<string, number>
  >(new Map<string, number>());

  /**
   * Property widthStore
   * @readonly
   *
   * @description
   * Per-viewer storage of the resized widths.
   *
   * @type {DataTableColumnWidthsService}
   */
  private readonly widthStore: DataTableColumnWidthsService = inject<DataTableColumnWidthsService>(
    DataTableColumnWidthsService,
  );

  /**
   * Property resizedWidths
   * @readonly
   *
   * @description
   * Widths the user gave the columns, read again from storage when the key changes; `keptWidths`
   * filters and bounds them.
   *
   * @type {WritableSignal<ReadonlyMap<string, number>>}
   */
  private readonly resizedWidths: WritableSignal<ReadonlyMap<string, number>> = linkedSignal<
    ReadonlyMap<string, number>
  >((): ReadonlyMap<string, number> => {
    const key: string | undefined = this.columnWidthsKey();
    return key ? this.widthStore.read(key) : new Map<string, number>();
  });

  /**
   * Property keptWidths
   * @readonly
   *
   * @description
   * Resized widths that apply: only for existing resizable columns with a `width`, within their bounds
   * (`keptColumnWidths`); this is what is stored back.
   *
   * @type {Signal<ReadonlyMap<string, number>>}
   */
  private readonly keptWidths: Signal<ReadonlyMap<string, number>> = computed<
    ReadonlyMap<string, number>
  >(() =>
    keptColumnWidths(
      this.resizedWidths(),
      this.columns(),
      (column: DataTableColumn<T>): { readonly min: number; readonly max: number } => ({
        min: this.minWidth(column),
        max: this.maxWidth(column),
      }),
    ),
  );

  /**
   * Property fillColumn
   * @readonly
   *
   * @description
   * Id of the column that takes the room the fixed columns leave: the first visible one without
   * `width`, under resizable columns only. It has no handle; without one, the table is exactly as wide
   * as its columns.
   *
   * @type {Signal<string | null>}
   */
  protected readonly fillColumn: Signal<string | null> = computed<string | null>(() =>
    this.resizableColumns()
      ? (this.visibleColumns().find(
          (column: DataTableColumn<T>): boolean => column.width === undefined,
        )?.id ?? null)
      : null,
  );

  /**
   * Property resizeHandles
   * @readonly
   *
   * @description
   * Resize handle of each divider between two visible columns, keyed by the header that draws it,
   * with the column it resizes (owner review: a divider works as in a spreadsheet). A divider resizes
   * the column on its left, dragging right widens it, the fill column absorbing the change; only the
   * divider right after the fill column resizes the column on its right, from that column's start
   * edge. Dividers before the fill column sit on the end edge of the left header, the others on the
   * start edge of the right one, so the dragged edge stays under the pointer either way. Without a
   * fill column every resizable column keeps its end edge, the last one included.
   *
   * @type {Signal<ReadonlyMap<string, DataTableResizeHandle<T>>>}
   */
  protected readonly resizeHandles: Signal<ReadonlyMap<string, DataTableResizeHandle<T>>> =
    computed<ReadonlyMap<string, DataTableResizeHandle<T>>>(() => {
      const handles: Map<string, DataTableResizeHandle<T>> = new Map<
        string,
        DataTableResizeHandle<T>
      >();
      const fill: string | null = this.fillColumn();
      const columns: readonly DataTableColumn<T>[] = this.visibleColumns();
      const fillIndex: number = columns.findIndex(
        (column: DataTableColumn<T>): boolean => column.id === fill,
      );
      for (let index: number = 0; index < columns.length; index++) {
        const left: DataTableColumn<T> | undefined = columns[index];
        const right: DataTableColumn<T> | undefined = columns[index + 1];
        if (!left) continue;
        if (!right) {
          // The table's end edge: a handle only when no fill column absorbs the change.
          if (fill === null && this.canResize(left))
            handles.set(left.id, { side: 'end', target: left, targetSide: 'end' });
          continue;
        }
        let handle: DataTableResizeHandle<T> | null = null;
        if (left.id !== fill && this.canResize(left)) {
          handle = { side: 'end', target: left, targetSide: 'end' };
        } else if (left.id === fill && this.canResize(right)) {
          handle = { side: 'start', target: right, targetSide: 'start' };
        }
        if (!handle) continue;
        if (fillIndex === -1 || index < fillIndex) handles.set(left.id, handle);
        else handles.set(right.id, { ...handle, side: 'start' });
      }
      return handles;
    });

  /**
   * Property layout
   * @readonly
   *
   * @description
   * Frame width in pixels and the columns a responsive class hides, measured in the browser after a
   * render and whenever the frame resizes; `0` until measured.
   *
   * @type {WritableSignal<{ readonly width: number; readonly hidden: ReadonlySet<string> }>}
   */
  private readonly layout: WritableSignal<{
    readonly width: number;
    readonly hidden: ReadonlySet<string>;
  }> = signal<{ readonly width: number; readonly hidden: ReadonlySet<string> }>({
    width: 0,
    hidden: new Set<string>(),
  });

  /**
   * Property selectionWidth
   * @readonly
   *
   * @description
   * Width of the selection column under resizable columns (`dataTableColumnWidths`).
   *
   * @type {Signal<number>}
   */
  protected readonly selectionWidth: Signal<number> = computed<number>(() =>
    this.framed() ? dataTableColumnWidths.selection : dataTableColumnWidths.flushSelection,
  );

  /**
   * Property requiredWidth
   * @readonly
   *
   * @description
   * Room the shown columns need under resizable columns: the selection column, every fixed column at
   * its width and the fill column at its minimum; `0` otherwise.
   *
   * @type {Signal<number>}
   */
  protected readonly requiredWidth: Signal<number> = computed<number>(() => {
    if (!this.resizableColumns()) return 0;
    const hidden: ReadonlySet<string> = this.layout().hidden;
    let width: number = this.selectable() ? this.selectionWidth() : 0;
    for (const column of this.visibleColumns()) {
      if (hidden.has(column.id)) continue;
      width += column.width === undefined ? this.minWidth(column) : this.fixedWidth(column);
    }
    return width;
  });

  /**
   * Property scrolls
   * @readonly
   *
   * @description
   * Whether the resizable columns need more room than the frame has, so that the frame scrolls. A
   * drag keeps the value it started with, so that the frame never switches mode under the pointer.
   *
   * @type {Signal<boolean>}
   */
  protected readonly scrolls: Signal<boolean> = computed<boolean>(() => {
    const frozen: boolean | null = this.frozenScrolls();
    if (frozen !== null) return frozen;
    const width: number = this.layout().width;
    return this.resizableColumns() && width > 0 && this.requiredWidth() > width;
  });

  /**
   * Property frozenScrolls
   * @readonly
   *
   * @description
   * `scrolls` when the running drag started, `null` without a drag.
   *
   * @type {WritableSignal<boolean | null>}
   */
  private readonly frozenScrolls: WritableSignal<boolean | null> = signal<boolean | null>(null);

  /**
   * Property dragFloor
   * @readonly
   *
   * @description
   * Width in pixels below which a drag in a scrolling frame does not let the table shrink, `0`
   * otherwise: narrowing a column then widens the fill column instead of pulling the table's end
   * towards the edge, so that the edge stays under the pointer until the drag ends.
   *
   * @type {WritableSignal<number>}
   */
  private readonly dragFloor: WritableSignal<number> = signal<number>(0);

  /**
   * Property tableMinWidth
   * @readonly
   *
   * @description
   * Minimum width of a table with a fill column: the room its columns need, or more during a drag
   * (`dragFloor`).
   *
   * @type {Signal<number>}
   */
  protected readonly tableMinWidth: Signal<number> = computed<number>(() =>
    Math.max(this.requiredWidth(), this.dragFloor()),
  );

  /**
   * Property resizing
   * @readonly
   *
   * @description
   * Id of the column whose handle is being dragged.
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly resizing: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property drag
   *
   * @description
   * Pointer drag in progress.
   *
   * @type {DataTableColumnDrag | null}
   */
  private drag: DataTableColumnDrag | null = null;

  /**
   * Property lockedRoot
   *
   * @description
   * Root `cursor` and `user-select` values replaced while a drag runs, put back when it ends.
   *
   * @type {{ readonly cursor: string; readonly userSelect: string } | null}
   */
  private lockedRoot: { readonly cursor: string; readonly userSelect: string } | null = null;

  /**
   * Property resizeHandleClasses
   * @readonly
   *
   * @description
   * Resize handle on a heading's start or end edge, in the language of `ui-resizable-handle` (D41): a
   * full-height 12 px pointer target centred on the edge, its bar 16 px tall and centred: a `border`
   * hairline while the heading row is hovered, 2 px `border-strong` under the pointer and 2 px `fg`
   * while dragged or focused.
   *
   * @type {Readonly<Record<'start' | 'end', string>>}
   */
  protected readonly resizeHandleClasses: Readonly<Record<'start' | 'end', string>> = {
    start:
      "absolute inset-y-0 -start-1.5 z-10 w-3 cursor-col-resize touch-none outline-none select-none after:pointer-events-none after:absolute after:inset-x-0 after:top-1/2 after:mx-auto after:h-4 after:-translate-y-1/2 after:w-px after:rounded-full after:bg-transparent after:transition-[background-color,width] after:duration-(--dur-pop) after:content-[''] group-hover/head:after:bg-border hover:after:w-0.5 hover:after:bg-border-strong focus-visible:after:w-0.5 focus-visible:after:bg-fg data-dragging:after:w-0.5 data-dragging:after:bg-fg motion-reduce:after:transition-none",
    end: "absolute inset-y-0 -end-1.5 z-10 w-3 cursor-col-resize touch-none outline-none select-none after:pointer-events-none after:absolute after:inset-x-0 after:top-1/2 after:mx-auto after:h-4 after:-translate-y-1/2 after:w-px after:rounded-full after:bg-transparent after:transition-[background-color,width] after:duration-(--dur-pop) after:content-[''] group-hover/head:after:bg-border hover:after:w-0.5 hover:after:bg-border-strong focus-visible:after:w-0.5 focus-visible:after:bg-fg data-dragging:after:w-0.5 data-dragging:after:bg-fg motion-reduce:after:transition-none",
  };

  /**
   * Property frozen
   * @readonly
   *
   * @description
   * Whether column widths were measured, so that a table without rows renders them in a `colgroup`
   * under the fixed layout.
   *
   * @type {Signal<boolean>}
   */
  protected readonly frozen: Signal<boolean> = computed<boolean>(
    (): boolean => this.columnWidths().size > 0,
  );

  /**
   * Property headClasses
   * @readonly
   *
   * @description
   * Heading row group, sticky below `--data-table-sticky-top` when asked, or at the top of the frame
   * while the frame scrolls.
   *
   * @type {Signal<string>}
   */
  protected readonly headClasses: Signal<string> = computed<string>(() =>
    this.stickyHeader()
      ? this.scrolls()
        ? 'sticky top-0 z-1 bg-surface'
        : 'sticky top-[var(--data-table-sticky-top,0px)] z-1 bg-surface'
      : '',
  );

  /**
   * Property rowClasses
   * @readonly
   *
   * @description
   * Body row states: hover and selection tints, focus ring and pointer when rows activate.
   *
   * @type {Signal<string>}
   */
  protected readonly rowClasses: Signal<string> = computed<string>(() =>
    cn(
      'group/row transition-colors duration-(--dur-pop) ease-orbit hover:bg-surface-hover data-[state=selected]:bg-surface-selected data-[state=selected]:hover:bg-surface-selected motion-reduce:transition-none',
      this.activatable() && 'cursor-pointer has-focus-visible:bg-surface-hover',
    ),
  );

  /**
   * Property edgeClasses
   * @readonly
   *
   * @description
   * Cell borders and gutters shared by headings and body cells.
   *
   * @type {Signal<string>}
   */
  private readonly edgeClasses: Signal<string> = computed<string>(() =>
    cn(
      'border-b border-border align-middle',
      this.framed()
        ? 'group-last/row:border-b-0'
        : 'first:ps-6 last:pe-6 @max-[640px]:first:ps-4 @max-[640px]:last:pe-4',
    ),
  );

  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Keeps the selection within the filtered rows. In the browser only: without resizable columns,
   * measures the column widths after each render that shows rows; with them, measures the frame and
   * the hidden columns after each render and whenever the frame resizes, and ends a drag left running
   * when the table goes away.
   */
  public constructor() {
    effect((): void => {
      const kept: Map<unknown, T> = new Map(
        this.filtered().map((row: T): [unknown, T] => [this.rowKey()(row), row]),
      );
      const current: readonly T[] = untracked(this.selection);
      const next: T[] = current.flatMap((row: T): T[] => {
        const fresh: T | undefined = kept.get(this.rowKey()(row));
        return fresh === undefined ? [] : [fresh];
      });
      const same: boolean =
        next.length === current.length &&
        next.every((row: T, i: number): boolean => row === current[i]);
      if (!same) this.selection.set(next);
    });
    afterRenderEffect({
      read: (): void => {
        if (this.resizableColumns()) {
          this.cols();
          this.measureLayout();
          return;
        }
        if (this.rows().length === 0 || this.placeholders().length > 0) return;
        const widths: Map<string, number> = new Map<string, number>();
        for (const cell of this.headerCells()) {
          const id: string | undefined = cell.nativeElement.dataset['column'];
          const width: number = cell.nativeElement.getBoundingClientRect().width;
          if (id && width > 0) widths.set(id, width);
        }
        const previous: ReadonlyMap<string, number> = untracked(this.columnWidths);
        const same: boolean =
          previous.size === widths.size &&
          [...widths].every(([id, width]: [string, number]): boolean => previous.get(id) === width);
        if (!same) this.columnWidths.set(widths);
      },
    });
    const destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);
    afterNextRender((): void => {
      const frame: HTMLDivElement | undefined = this.frame()?.nativeElement;
      if (!frame || typeof ResizeObserver === 'undefined') return;
      const observer: ResizeObserver = new ResizeObserver((): void => this.measureLayout());
      observer.observe(frame);
      destroyRef.onDestroy((): void => observer.disconnect());
    });
    destroyRef.onDestroy((): void => this.finishDrag(false));
  }
  // #endregion

  // #region Methods
  /**
   * Method frozenWidth
   * @method frozenWidth
   *
   * @description
   * Width kept for a column while a table without resizable columns shows no row.
   *
   * @param {string} id - Column id.
   * @returns {number | null} Width in pixels, or `null` for a column never measured.
   */
  protected frozenWidth(id: string): number | null {
    return this.columnWidths().get(id) ?? null;
  }

  /**
   * Method colWidth
   * @method colWidth
   *
   * @description
   * Width written on a column's `col`. With resizable columns: a fixed column's `fixedWidth`, none for
   * a column without `width` (it takes the room left), never a measured width, so that the browser
   * renders exactly the model. Otherwise the last measured width, while the table shows no row.
   *
   * @param {DataTableColumn<T>} column - Visible column.
   * @returns {number | null} Width in pixels, or `null` for none.
   */
  protected colWidth(column: DataTableColumn<T>): number | null {
    if (!this.resizableColumns()) return this.frozenWidth(column.id);
    return column.width === undefined ? null : this.fixedWidth(column);
  }

  /**
   * Method fixedWidth
   * @method fixedWidth
   *
   * @description
   * Width of a column with a `width`: the one the user gave it (within its bounds), else its `width`.
   *
   * @param {DataTableColumn<T>} column - Column.
   * @returns {number} Pixels; `0` for a column without `width`.
   */
  protected fixedWidth(column: DataTableColumn<T>): number {
    return this.keptWidths().get(column.id) ?? column.width ?? 0;
  }

  /**
   * Method canResize
   * @method canResize
   *
   * @description
   * Whether a column is resizable: the table's columns are, the column has a `width` and does not opt
   * out. The fill column (no `width`) only takes the room left.
   *
   * @param {DataTableColumn<T>} column - Visible column.
   * @returns {boolean} Whether the column can be resized.
   */
  protected canResize(column: DataTableColumn<T>): boolean {
    return this.resizableColumns() && column.resizable !== false && column.width !== undefined;
  }

  /**
   * Method minWidth
   * @method minWidth
   *
   * @description
   * Narrowest width of a column: its `minWidth`, else 64 px, or 200 px for a column without `width`.
   *
   * @param {DataTableColumn<T>} column - Column.
   * @returns {number} Pixels.
   */
  protected minWidth(column: DataTableColumn<T>): number {
    return (
      column.minWidth ??
      (column.width === undefined ? dataTableColumnWidths.fillMin : dataTableColumnWidths.min)
    );
  }

  /**
   * Method maxWidth
   * @method maxWidth
   *
   * @description
   * Widest width of a resize: its `maxWidth`, else 640 px, never below the minimum.
   *
   * @param {DataTableColumn<T>} column - Column.
   * @returns {number} Pixels.
   */
  protected maxWidth(column: DataTableColumn<T>): number {
    return Math.max(this.minWidth(column), column.maxWidth ?? dataTableColumnWidths.max);
  }

  /**
   * Method onResizeStart
   * @method onResizeStart
   *
   * @description
   * Starts dragging a column's edge with the primary button, capturing the pointer. No width changes
   * here: the drag starts from the column's width, which its `col` already renders. In a frame that
   * cannot scroll (a sticky heading over columns that fit), the drag stops where the fill column would
   * narrow below its minimum, so that the edge never leaves the pointer; a scrolling frame keeps the
   * edge under the pointer by scrolling instead (`applyDrag`), and keeps its mode until the drag ends.
   *
   * @param {PointerEvent} event - Pointer pressed on the handle.
   * @param {DataTableColumn<T>} column - Column resized.
   */
  protected onResizeStart(
    event: PointerEvent,
    column: DataTableColumn<T>,
    side: 'start' | 'end',
  ): void {
    if (event.button !== 0 || this.drag) return;
    const handle: HTMLElement = event.currentTarget as HTMLElement;
    event.preventDefault();
    handle.focus();
    try {
      handle.setPointerCapture?.(event.pointerId);
    } catch {
      // A pointer the browser no longer tracks (released, synthetic): the drag runs uncaptured.
    }
    const start: number = this.fixedWidth(column);
    const scrolls: boolean = !this.stickyHeader() || this.scrolls();
    this.frozenScrolls.set(this.scrolls());
    this.dragFloor.set(scrolls && this.fillColumn() !== null ? this.requiredWidth() : 0);
    const frameWidth: number = this.frame()?.nativeElement.clientWidth ?? 0;
    const slack: number =
      scrolls || this.fillColumn() === null || frameWidth === 0
        ? Number.POSITIVE_INFINITY
        : Math.max(0, frameWidth - this.requiredWidth());
    const bounds: DOMRect = handle.getBoundingClientRect();
    this.drag = {
      edge: bounds.left + bounds.width / 2,
      scrolls,
      column: column.id,
      pointer: event.pointerId,
      handle,
      x: event.clientX,
      start,
      direction: resizeDirection(side, getComputedStyle(handle).direction === 'rtl'),
      max: Math.max(start, Math.min(this.maxWidth(column), start + slack)),
      previous: this.resizedWidths().get(column.id),
      latestX: event.clientX,
      frame: null,
    };
    this.resizing.set(column.id);
    this.lockRoot(true);
    this.placeGuide();
  }

  /**
   * Method onResizeMove
   * @method onResizeMove
   *
   * @description
   * Records the dragging pointer's position and applies it on the next animation frame, once per frame.
   *
   * @param {PointerEvent} event - Pointer moved.
   */
  protected onResizeMove(event: PointerEvent): void {
    const drag: DataTableColumnDrag | null = this.drag;
    if (!drag || drag.pointer !== event.pointerId) return;
    drag.latestX = event.clientX;
    if (drag.frame !== null) return;
    const view: (Window & typeof globalThis) | null = this.document.defaultView;
    if (!view?.requestAnimationFrame) {
      this.applyDrag();
      return;
    }
    drag.frame = view.requestAnimationFrame((): void => {
      drag.frame = null;
      if (this.drag === drag) this.applyDrag();
    });
  }

  /**
   * Method onResizeEnd
   * @method onResizeEnd
   *
   * @description
   * Ends a drag at the pointer's last position and stores the width when it changed.
   *
   * @param {PointerEvent} event - Pointer released, cancelled or no longer captured.
   */
  protected onResizeEnd(event: PointerEvent): void {
    const drag: DataTableColumnDrag | null = this.drag;
    if (!drag || drag.pointer !== event.pointerId) return;
    if (event.type === 'pointerup') drag.latestX = event.clientX;
    this.applyDrag();
    this.finishDrag(true);
  }

  /**
   * Method onResizeKey
   * @method onResizeKey
   *
   * @description
   * During a drag, Escape puts the column back at its width and ends the drag. Otherwise the arrows
   * move the edge by 16 px (64 px with Shift), Home and End go to the bounds, Enter fits the content
   * and Shift+Enter restores the default width, each change stored; Escape leaves the handle.
   *
   * @param {KeyboardEvent} event - Key pressed on the handle.
   * @param {DataTableColumn<T>} column - Column resized.
   */
  protected onResizeKey(
    event: KeyboardEvent,
    column: DataTableColumn<T>,
    side: 'start' | 'end',
  ): void {
    if (this.drag) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      this.finishDrag(false);
      return;
    }
    const handle: HTMLElement = event.currentTarget as HTMLElement;
    if (event.key === 'Escape') {
      handle.blur();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) this.resetWidth(column);
      else this.fitWidth(column);
      return;
    }
    const step: number = event.shiftKey
      ? dataTableColumnWidths.largeStep
      : dataTableColumnWidths.step;
    const direction: 1 | -1 = resizeDirection(side, getComputedStyle(handle).direction === 'rtl');
    const current: number = this.fixedWidth(column);
    const next: number | null =
      event.key === 'ArrowRight'
        ? current + direction * step
        : event.key === 'ArrowLeft'
          ? current - direction * step
          : event.key === 'Home'
            ? this.minWidth(column)
            : event.key === 'End'
              ? this.maxWidth(column)
              : null;
    if (next === null) return;
    event.preventDefault();
    this.setWidth(column, next);
    this.persistWidths();
  }

  /**
   * Method onResizeDoubleClick
   * @method onResizeDoubleClick
   *
   * @description
   * Double click fits the column to its content; Shift+double click restores its default width.
   *
   * @param {MouseEvent} event - Double click on the handle.
   * @param {DataTableColumn<T>} column - Column resized.
   */
  protected onResizeDoubleClick(event: MouseEvent, column: DataTableColumn<T>): void {
    if (event.shiftKey) this.resetWidth(column);
    else this.fitWidth(column);
  }

  /**
   * Method resetWidth
   * @method resetWidth
   *
   * @description
   * Gives a column back its default `width` and forgets the stored one.
   *
   * @param {DataTableColumn<T>} column - Column reset.
   */
  private resetWidth(column: DataTableColumn<T>): void {
    if (!this.resizedWidths().has(column.id)) return;
    this.resizedWidths.update(
      (widths: ReadonlyMap<string, number>): ReadonlyMap<string, number> => {
        const next: Map<string, number> = new Map<string, number>(widths);
        next.delete(column.id);
        return next;
      },
    );
    this.persistWidths();
  }

  /**
   * Method fitWidth
   * @method fitWidth
   *
   * @description
   * Fits a column to the widest of its heading and visible cells (`contentWidth`), within its bounds.
   * The cells are measured unwrapped, with the column at its maximum so that shrinking items take
   * their size, then put back, all before the next paint.
   *
   * @param {DataTableColumn<T>} column - Column fitted.
   */
  private fitWidth(column: DataTableColumn<T>): void {
    const table: HTMLTableElement | undefined = this.tableElement()?.nativeElement;
    const col: HTMLTableColElement | undefined = this.colElement(column.id);
    if (!table || !col) return;
    const cells: HTMLElement[] = Array.from(
      table.querySelectorAll<HTMLElement>('th[data-column], td[data-column]'),
    ).filter((cell: HTMLElement): boolean => cell.dataset['column'] === column.id);
    const width: string = col.style.width;
    const wraps: string[] = cells.map((cell: HTMLElement): string => cell.style.whiteSpace);
    col.style.width = `${this.maxWidth(column)}px`;
    for (const cell of cells) cell.style.whiteSpace = 'nowrap';
    const rtl: boolean = getComputedStyle(table).direction === 'rtl';
    const natural: number = Math.max(
      0,
      ...cells.map((cell: HTMLElement): number =>
        contentWidth(cell, rtl, '[data-slot="data-table-resize-handle"], .sr-only'),
      ),
    );
    cells.forEach((cell: HTMLElement, index: number): void => {
      cell.style.whiteSpace = wraps[index] ?? '';
    });
    col.style.width = width;
    this.setWidth(column, natural);
    this.persistWidths();
  }

  /**
   * Method applyDrag
   *
   * @description
   * Applies the latest pointer position of the drag: the width changes by the pointer's move, within
   * the drag's bounds, and is written on the `col` and the table at once, so that the edge and the
   * guide line follow the pointer in the same frame. When the fill column is already at its minimum
   * it no longer absorbs the change and the table's width changes instead; a scrolling frame then
   * scrolls by the edge's drift from where the width change puts it.
   */
  private applyDrag(): void {
    const drag: DataTableColumnDrag | null = this.drag;
    const column: DataTableColumn<T> | undefined = this.columns().find(
      (candidate: DataTableColumn<T>): boolean => candidate.id === drag?.column,
    );
    if (!drag || !column) return;
    if (drag.frame !== null) {
      this.document.defaultView?.cancelAnimationFrame(drag.frame);
      drag.frame = null;
    }
    const width: number = clampWidth(
      drag.start + drag.direction * (drag.latestX - drag.x),
      this.minWidth(column),
      drag.max,
    );
    if (width === this.fixedWidth(column)) return;
    this.setWidth(column, width);
    this.writeWidths(column);
    const frame: HTMLDivElement | undefined = this.frame()?.nativeElement;
    if (drag.scrolls && frame) {
      const bounds: DOMRect = drag.handle.getBoundingClientRect();
      const drift: number =
        bounds.left + bounds.width / 2 - (drag.edge + drag.direction * (width - drag.start));
      if (Math.abs(drift) >= 0.5) frame.scrollLeft += drift;
    }
    this.placeGuide();
  }

  /**
   * Method finishDrag
   *
   * @description
   * Ends the drag: releases the pointer and the root, then stores the width when `commit` and it
   * changed, or puts the column back at its width before the drag. Does nothing without a drag.
   *
   * @param {boolean} commit - Whether to keep the dragged width.
   */
  private finishDrag(commit: boolean): void {
    const drag: DataTableColumnDrag | null = this.drag;
    if (!drag) return;
    if (drag.frame !== null) this.document.defaultView?.cancelAnimationFrame(drag.frame);
    this.drag = null;
    if (drag.handle.hasPointerCapture?.(drag.pointer)) {
      drag.handle.releasePointerCapture(drag.pointer);
    }
    this.lockRoot(false);
    this.resizing.set(null);
    this.frozenScrolls.set(null);
    this.dragFloor.set(0);
    const column: DataTableColumn<T> | undefined = this.columns().find(
      (candidate: DataTableColumn<T>): boolean => candidate.id === drag.column,
    );
    if (!column) return;
    if (commit) {
      if (this.resizedWidths().get(column.id) !== drag.previous) this.persistWidths();
      return;
    }
    this.resizedWidths.update(
      (widths: ReadonlyMap<string, number>): ReadonlyMap<string, number> => {
        const next: Map<string, number> = new Map<string, number>(widths);
        if (drag.previous === undefined) next.delete(column.id);
        else next.set(column.id, drag.previous);
        return next;
      },
    );
    this.writeWidths(column);
  }

  /**
   * Method writeWidths
   *
   * @description
   * Writes a column's current width on its `col` and the table's required width on the table, ahead
   * of the next change detection, which binds the same values.
   *
   * @param {DataTableColumn<T>} column - Column resized.
   */
  private writeWidths(column: DataTableColumn<T>): void {
    const col: HTMLTableColElement | undefined = this.colElement(column.id);
    if (col) col.style.width = `${this.fixedWidth(column)}px`;
    const table: HTMLTableElement | undefined = this.tableElement()?.nativeElement;
    if (!table) return;
    if (this.fillColumn() === null) table.style.width = `${this.requiredWidth()}px`;
    else table.style.minWidth = `${this.tableMinWidth()}px`;
  }

  /**
   * Method placeGuide
   *
   * @description
   * Places the guide line on the dragged edge (the centre of the handle), over the whole table height.
   */
  private placeGuide(): void {
    const drag: DataTableColumnDrag | null = this.drag;
    const guide: HTMLDivElement | undefined = this.guide()?.nativeElement;
    const frame: HTMLDivElement | undefined = this.frame()?.nativeElement;
    const table: HTMLTableElement | undefined = this.tableElement()?.nativeElement;
    if (!drag || !guide || !frame || !table) return;
    const origin: DOMRect = frame.getBoundingClientRect();
    const handle: DOMRect = drag.handle.getBoundingClientRect();
    const bounds: DOMRect = table.getBoundingClientRect();
    const left: number = origin.left + frame.clientLeft - frame.scrollLeft;
    const top: number = origin.top + frame.clientTop - frame.scrollTop;
    guide.style.left = `${Math.floor(handle.left + handle.width / 2 - left)}px`;
    guide.style.top = `${bounds.top - top}px`;
    guide.style.height = `${bounds.height}px`;
  }

  /**
   * Method lockRoot
   *
   * @description
   * Gives the document root the resize cursor and no text selection while a drag runs, then puts its
   * own values back.
   *
   * @param {boolean} locked - Whether a drag runs.
   */
  private lockRoot(locked: boolean): void {
    const root: HTMLElement = this.document.documentElement;
    if (locked && !this.lockedRoot) {
      this.lockedRoot = { cursor: root.style.cursor, userSelect: root.style.userSelect };
      root.style.cursor = 'col-resize';
      root.style.userSelect = 'none';
    } else if (!locked && this.lockedRoot) {
      root.style.cursor = this.lockedRoot.cursor;
      root.style.userSelect = this.lockedRoot.userSelect;
      this.lockedRoot = null;
    }
  }

  /**
   * Method measureLayout
   *
   * @description
   * Reads the frame width and the columns whose `col` a responsive class hides, and keeps them when
   * they changed. Browser only (after a render or a resize).
   */
  private measureLayout(): void {
    const frame: HTMLDivElement | undefined = this.frame()?.nativeElement;
    if (!frame || !untracked(this.resizableColumns)) return;
    const hidden: Set<string> = new Set<string>();
    for (const col of untracked(this.cols)) {
      const id: string | undefined = col.nativeElement.dataset['column'];
      if (id && getComputedStyle(col.nativeElement).display === 'none') hidden.add(id);
    }
    const width: number = frame.clientWidth;
    const previous: { readonly width: number; readonly hidden: ReadonlySet<string> } = untracked(
      this.layout,
    );
    const same: boolean =
      previous.width === width &&
      previous.hidden.size === hidden.size &&
      [...hidden].every((id: string): boolean => previous.hidden.has(id));
    if (!same) this.layout.set({ width, hidden });
  }

  /**
   * Method colElement
   *
   * @description
   * `col` element of a visible column.
   *
   * @param {string} id - Column id.
   * @returns {HTMLTableColElement | undefined} The element, if rendered.
   */
  private colElement(id: string): HTMLTableColElement | undefined {
    return this.cols()
      .map((col: ElementRef<HTMLTableColElement>): HTMLTableColElement => col.nativeElement)
      .find((col: HTMLTableColElement): boolean => col.dataset['column'] === id);
  }

  /**
   * Method setWidth
   *
   * @description
   * Gives a column a width within its bounds.
   *
   * @param {DataTableColumn<T>} column - Column resized.
   * @param {number} width - Wanted width in pixels.
   */
  private setWidth(column: DataTableColumn<T>, width: number): void {
    const next: number = clampWidth(width, this.minWidth(column), this.maxWidth(column));
    if (this.resizedWidths().get(column.id) === next) return;
    this.resizedWidths.update((widths: ReadonlyMap<string, number>): ReadonlyMap<string, number> =>
      new Map<string, number>(widths).set(column.id, next),
    );
  }

  /**
   * Method persistWidths
   *
   * @description
   * Stores the kept widths under `columnWidthsKey`, when the table has one; entries that no longer
   * apply are dropped from storage on the way.
   */
  private persistWidths(): void {
    const key: string | undefined = this.columnWidthsKey();
    if (key) this.widthStore.write(key, this.keptWidths());
  }

  /**
   * Method skeletonWidth
   * @method skeletonWidth
   *
   * @description
   * Width of a loading row's text line, cycled so that the placeholder reads as uneven text.
   *
   * @param {number} row - Skeleton row index.
   * @param {number} column - Visible column index.
   * @returns {string} Width utility.
   */
  protected skeletonWidth(row: number, column: number): string {
    return dataTableSkeletonWidths[(row + column) % dataTableSkeletonWidths.length] ?? 'w-1/2';
  }

  /**
   * Method trackKey
   * @method trackKey
   *
   * @description
   * Returns the row identity used by the template's tracking expression.
   *
   * @param {T} row - Row being rendered.
   * @returns {unknown} Identity produced by the configured `rowKey` function.
   */
  protected trackKey(row: T): unknown {
    return this.rowKey()(row);
  }

  /**
   * Method isSelected
   * @method isSelected
   *
   * @description
   * Checks whether the selection model contains a row with the same configured key.
   *
   * @param {T} row - Row whose selection state is requested.
   * @returns {boolean} Whether a matching row key is selected.
   */
  protected isSelected(row: T): boolean {
    return this.selectedKeys().has(this.rowKey()(row));
  }

  /**
   * Method rowCheckboxLabel
   * @method rowCheckboxLabel
   *
   * @description
   * Accessible label of a row checkbox, preferring the caller's row name over its position among the
   * filtered rows.
   *
   * @param {T} row - Row described by the checkbox.
   * @param {number} index - Zero-based position within the rendered page.
   * @returns {string} Localized checkbox label.
   */
  protected rowCheckboxLabel(row: T, index: number): string {
    const name: string | undefined = this.rowLabel()?.(row);
    return this.text().selectRow(name || this.currentPage() * this.pageSize() + index + 1);
  }

  /**
   * Method sortOf
   * @method sortOf
   *
   * @description
   * Active sort key of a sortable column.
   *
   * @param {DataTableColumn<T>} column - Column read.
   * @returns {DataTableSort | undefined} Its key, if sorted.
   */
  protected sortOf(column: DataTableColumn<T>): DataTableSort | undefined {
    return column.sortable
      ? this.state().sort.find((sort) => sort.column === column.id)
      : undefined;
  }

  /**
   * Method sortPriority
   * @method sortPriority
   *
   * @description
   * One-based rank of a column among several sort keys, or `null` when it is the only one or unsorted.
   *
   * @param {DataTableColumn<T>} column - Column read.
   * @returns {number | null} Its rank.
   */
  protected sortPriority(column: DataTableColumn<T>): number | null {
    const keys: readonly DataTableSort[] = this.state().sort;
    const index: number = keys.findIndex((sort) => sort.column === column.id);
    return keys.length > 1 && index >= 0 ? index + 1 : null;
  }

  /**
   * Method ariaSort
   * @method ariaSort
   *
   * @description
   * ARIA sort state of a heading: `none` for an unsorted sortable column, no attribute for a column
   * that cannot be sorted.
   *
   * @param {DataTableColumn<T>} column - Column whose header state is rendered.
   * @returns {'ascending' | 'descending' | 'none' | null} Accessible sort state.
   */
  protected ariaSort(column: DataTableColumn<T>): 'ascending' | 'descending' | 'none' | null {
    if (!column.sortable) return null;
    const sort: DataTableSort | undefined = this.sortOf(column);
    if (!sort) return 'none';
    return sort.direction === 'asc' ? 'ascending' : 'descending';
  }

  /**
   * Method sortIcon
   * @method sortIcon
   *
   * @description
   * Direction glyph of a sorted column, the neutral up-down glyph otherwise.
   *
   * @param {DataTableColumn<T>} column - Column whose sort glyph is rendered.
   * @returns {string} Icon SVG.
   */
  protected sortIcon(column: DataTableColumn<T>): string {
    const sort: DataTableSort | undefined = this.sortOf(column);
    return sort ? this.icons[sort.direction] : this.icons.unsorted;
  }

  /**
   * Method headerClasses
   * @method headerClasses
   *
   * @description
   * Heading cell classes: density, borders and gutters, alignment and the column's classes.
   *
   * @param {DataTableColumn<T>} column - Column whose header classes are resolved.
   * @returns {string} Merged header class list.
   */
  protected headerClasses(column: DataTableColumn<T>): string {
    return cn(
      dataTableDensityClasses[this.density()].header,
      this.edgeClasses(),
      'whitespace-nowrap',
      alignClasses[column.align ?? 'start'],
      column.class,
      this.resizeHandles().has(column.id) && 'relative',
    );
  }

  /**
   * Method sortButtonClasses
   * @method sortButtonClasses
   *
   * @description
   * Heading sort button, in the heading's case and full ink once sorted.
   *
   * @param {DataTableColumn<T>} column - Column of the button.
   * @returns {string} Button class list.
   */
  protected sortButtonClasses(column: DataTableColumn<T>): string {
    return cn(
      '-mx-1.5 inline-flex h-6 cursor-pointer items-center gap-1 rounded-sm px-1.5 outline-2 outline-transparent transition-colors duration-(--dur-pop) ease-orbit hover:bg-surface-hover hover:text-fg focus-visible:outline-accent/55 motion-reduce:transition-none',
      this.density() === 'comfortable' && 'uppercase',
      this.sortOf(column) && 'text-fg',
      this.resizableColumns() && 'max-w-[calc(100%+0.75rem)]',
    );
  }

  /**
   * Method cellClasses
   * @method cellClasses
   *
   * @description
   * Body cell classes: density, borders and gutters, alignment and the column's classes.
   *
   * @param {DataTableColumn<T>} column - Column whose cell classes are resolved.
   * @returns {string} Merged body-cell class list.
   */
  protected cellClasses(column: DataTableColumn<T>): string {
    return cn(
      dataTableDensityClasses[this.density()].cell,
      this.edgeClasses(),
      'text-fg',
      alignClasses[column.align ?? 'start'],
      column.class,
      this.resizableColumns() && 'overflow-hidden text-ellipsis',
    );
  }

  /**
   * Method plainCellClasses
   * @method plainCellClasses
   *
   * @description
   * Classes of the selection and full-width cells.
   *
   * @param {string} extra - Cell-specific classes.
   * @returns {string} Merged class list.
   */
  protected plainCellClasses(extra: string): string {
    return cn(dataTableDensityClasses[this.density()].cell, this.edgeClasses(), extra);
  }

  /**
   * Method toggleSort
   * @method toggleSort
   *
   * @description
   * Advances the sort of a column; Shift keeps the other keys.
   *
   * @param {DataTableColumn<T>} column - Column whose sort cycle is advanced.
   * @param {MouseEvent} event - Click on the heading button.
   */
  protected toggleSort(column: DataTableColumn<T>, event: MouseEvent): void {
    this.state.update((state) => ({
      ...state,
      sort: nextSorts(state.sort, column.id, event.shiftKey),
    }));
  }

  /**
   * Method onSearch
   * @method onSearch
   *
   * @description
   * Copies the search field into the state, back on the first page.
   *
   * @param {Event} event - Input event of the search field.
   */
  protected onSearch(event: Event): void {
    const search: string = (event.target as HTMLInputElement).value;
    this.state.update((state) => ({ ...state, search, page: 0 }));
  }

  /**
   * Method setFacet
   * @method setFacet
   *
   * @description
   * Replaces the checked values of a facet, back on the first page.
   *
   * @param {string} id - Facet id.
   * @param {readonly string[]} values - Checked values.
   */
  protected setFacet(id: string, values: readonly string[]): void {
    this.state.update((state) => withFacet(state, id, values));
  }

  /**
   * Method removeFilter
   * @method removeFilter
   *
   * @description
   * Unchecks the value of a chip.
   *
   * @param {DataTableActiveFilter} filter - Chip removed.
   */
  protected removeFilter(filter: DataTableActiveFilter): void {
    const values: readonly string[] = this.state().facets[filter.facet] ?? [];
    this.setFacet(
      filter.facet,
      values.filter((value) => value !== filter.value),
    );
  }

  /**
   * Method resetFilters
   * @method resetFilters
   *
   * @description
   * Clears the search and every facet, back on the first page.
   */
  protected resetFilters(): void {
    this.state.update(withoutFilters);
  }

  /**
   * Method toggleColumn
   * @method toggleColumn
   *
   * @description
   * Shows or hides a hideable column.
   *
   * @param {string} id - Column id.
   */
  protected toggleColumn(id: string): void {
    this.state.update((state) => ({
      ...state,
      hidden: state.hidden.includes(id)
        ? state.hidden.filter((column) => column !== id)
        : [...state.hidden, id],
    }));
  }

  /**
   * Method goTo
   * @method goTo
   *
   * @description
   * Requests a page, clamped to the available range.
   *
   * @param {number} page - Zero-based page.
   */
  protected goTo(page: number): void {
    const next: number = Math.min(Math.max(0, page), this.pageTotal() - 1);
    this.state.update((state) => ({ ...state, page: next }));
  }

  /**
   * Method setPageSize
   * @method setPageSize
   *
   * @description
   * Changes the page size, back on the first page.
   *
   * @param {number} pageSize - Rows per page.
   */
  protected setPageSize(pageSize: number): void {
    this.state.update((state) => ({ ...state, pageSize, page: 0 }));
  }

  /**
   * Method onRowClick
   * @method onRowClick
   *
   * @description
   * Activates a row unless the click comes from an interactive element inside it or ends a text
   * selection.
   *
   * @param {MouseEvent} event - Click on the row.
   * @param {T} row - Row clicked.
   */
  protected onRowClick(event: MouseEvent, row: T): void {
    if (!this.activatable()) return;
    const target: EventTarget | null = event.target;
    const owner: Element | null =
      target instanceof Element ? target.closest(dataTableInteractiveSelector) : null;
    if (owner && event.currentTarget instanceof Element && event.currentTarget.contains(owner)) {
      return;
    }
    if (this.document.getSelection?.()?.toString()) return;
    this.rowActivated.emit(row);
  }

  /**
   * Method toggleRow
   * @method toggleRow
   *
   * @description
   * Removes a selected row by key or appends it to the selection model when it is not selected.
   *
   * @param {T} row - Row whose selection state is toggled.
   */
  protected toggleRow(row: T): void {
    const key: unknown = this.rowKey()(row);
    this.selection.update((rows) =>
      this.isSelected(row)
        ? rows.filter((selected) => this.rowKey()(selected) !== key)
        : [...rows, row],
    );
  }

  /**
   * Method toggleAll
   * @method toggleAll
   *
   * @description
   * Clears the visible page from selection when all its rows are selected, or adds only unselected
   * visible rows otherwise; selections on other pages are retained.
   */
  protected toggleAll(): void {
    const page: T[] = this.rows();
    if (this.allSelected()) {
      const keys: Set<unknown> = new Set(page.map((row) => this.rowKey()(row)));
      this.selection.update((rows) => rows.filter((row) => !keys.has(this.rowKey()(row))));
    } else {
      this.selection.update((rows) => [...rows, ...page.filter((row) => !this.isSelected(row))]);
    }
  }
  // #endregion
}
