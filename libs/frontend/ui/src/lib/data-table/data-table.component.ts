import type { CellValue } from '@internal/ui/lib/data-table/models/data-table/cell-value.type';
import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  LOCALE_ID,
  TemplateRef,
  computed,
  contentChildren,
  inject,
  input,
  model,
  type InputSignal,
  type ModelSignal,
  type Signal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import {
  lucideArrowDown,
  lucideArrowUp,
  lucideChevronLeft,
  lucideChevronRight,
  lucideChevronsUpDown,
} from '@ng-icons/lucide';
import { ButtonDirective } from '@internal/ui/lib/button/button.directive';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { InputDirective } from '@internal/ui/lib/input/input.directive';
import {
  filterRows,
  nextSort,
  pageCount,
  pageRows,
  sortRows,
} from '@internal/ui/lib/data-table/utils/data-table/data-table.utils';
import type { DataTableColumn } from '@internal/ui/lib/data-table/models/data-table/data-table-column.interface';
import type { DataTableSort } from '@internal/ui/lib/data-table/models/data-table/data-table-sort.interface';
import type { DataTableCellContext } from '@internal/ui/lib/data-table/models/data-table/data-table-cell-context.interface';
import { alignClasses } from '@internal/ui/lib/data-table/constants/data-table.constants';

/**
 * Class DataTableCellDirective
 * @class DataTableCellDirective
 *
 * @description
 * Associates an `ng-template` with a column id and exposes its row context to the table renderer.
 * The rows input provides the template's generic row type to Angular's template checker.
 *
 * @template T - Row type supplied to this cell template.
 */
@Directive({ selector: 'ng-template[uiDataTableCell]' })
export class DataTableCellDirective<T> {
  // #region Properties
  /**
   * Property uiDataTableCell
   * @readonly
   *
   * @description
   * Column id whose rendered cell content is replaced by this template.
   *
   * @type {InputSignal<string>}
   */
  public readonly uiDataTableCell: InputSignal<string> = input.required<string>();

  /**
   * Property uiDataTableCellRows
   * @readonly
   *
   * @description
   * Rows represented by the template, used to infer `T` during template checking.
   *
   * @type {InputSignal<readonly T[]>}
   */
  public readonly uiDataTableCellRows: InputSignal<readonly T[]> = input<readonly T[]>([]);

  /**
   * Property template
   * @readonly
   *
   * @description
   * Template reference carrying the row and page-relative index context.
   *
   * @type {TemplateRef<DataTableCellContext<T>>}
   */
  public readonly template: TemplateRef<DataTableCellContext<T>> =
    inject<TemplateRef<DataTableCellContext<T>>>(TemplateRef);
  // #endregion

  // #region Methods
  /**
   * Method ngTemplateContextGuard
   * @method ngTemplateContextGuard
   *
   * @description
   * Informs Angular's template checker that this template renders with `DataTableCellContext<T>`; the runtime check accepts `null` because JavaScript reports `typeof null` as `object`.
   *
   * @template T - Row type inferred from the directive instance.
   * @param {DataTableCellDirective<T>} directive - Directive attached to the template.
   * @param {unknown} context - Context value to narrow for template checking.
   * @returns {context is DataTableCellContext<T>} Type predicate used by Angular's template checker.
   */
  public static ngTemplateContextGuard<T>(
    directive: DataTableCellDirective<T>,
    context: unknown,
  ): context is DataTableCellContext<T> {
    // Type-only guard: the table always renders the template with this context.
    return !!directive && typeof context === 'object';
  }
  // #endregion
}

/**
 * Component DataTableComponent
 * @class DataTableComponent
 *
 * @description
 * Renders typed column data with optional filtering, sorting, pagination, and selection. Filtering and sorting run on the supplied rows in memory; selection is controlled through the model input.
 *
 * @template T - Row type consumed by the columns and custom cell templates.
 */
@Component({
  selector: 'ui-data-table',
  imports: [ButtonDirective, InputDirective, NgIcon, NgTemplateOutlet],
  templateUrl: './data-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()', 'data-slot': 'data-table' },
})
export class DataTableComponent<T> {
  // #region Properties
  /**
   * Property data
   * @readonly
   *
   * @description
   * Required input rows processed by the active filter, sort, and pagination settings.
   *
   * @type {InputSignal<readonly T[]>}
   */
  public readonly data: InputSignal<readonly T[]> = input.required<readonly T[]>();

  /**
   * Property columns
   * @readonly
   *
   * @description
   * Required column definitions that provide labels, alignment, cell values, and optional sorting values.
   *
   * @type {InputSignal<readonly DataTableColumn<T>[]>}
   */
  public readonly columns: InputSignal<readonly DataTableColumn<T>[]> =
    input.required<readonly DataTableColumn<T>[]>();

  /**
   * Property rowKey
   * @readonly
   *
   * @description
   * Resolves the unique, stable identity used by row tracking and selection; the row object itself is the default key.
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
   * Optional accessible name used in the selection checkbox label instead of a page-relative row number.
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
   * Optional caption rendered for the data table.
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
   * @type {InputSignal<boolean>}
   */
  public readonly selectable: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property filterable
   * @readonly
   *
   * @description
   * Whether the text filter control is available for the supplied rows.
   *
   * @type {InputSignal<boolean>}
   */
  public readonly filterable: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property paginated
   * @readonly
   *
   * @description
   * Whether the table limits visible rows to the current page.
   *
   * @type {InputSignal<boolean>}
   */
  public readonly paginated: InputSignal<boolean> = input<boolean>(true);

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
   * Property sort
   * @readonly
   *
   * @description
   * Controlled sort descriptor; `null` means that no column is sorted.
   *
   * @type {ModelSignal<DataTableSort | null>}
   */
  public readonly sort: ModelSignal<DataTableSort | null> = model<DataTableSort | null>(null);

  /**
   * Property filter
   * @readonly
   *
   * @description
   * Controlled text used to filter values produced by columns with a cell accessor.
   *
   * @type {ModelSignal<string>}
   */
  public readonly filter: ModelSignal<string> = model<string>('');

  /**
   * Property page
   * @readonly
   *
   * @description
   * Zero-based requested page index; the rendered current page is clamped to the available range.
   *
   * @type {ModelSignal<number>}
   */
  public readonly page: ModelSignal<number> = model<number>(0);

  /**
   * Property pageSize
   * @readonly
   *
   * @description
   * Number of rows requested for each page.
   *
   * @type {ModelSignal<number>}
   */
  public readonly pageSize: ModelSignal<number> = model<number>(10);

  /**
   * Property selection
   * @readonly
   *
   * @description
   * Controlled selected rows; row identity comparisons use `rowKey`.
   *
   * @type {ModelSignal<readonly T[]>}
   */
  public readonly selection: ModelSignal<readonly T[]> = model<readonly T[]>([]);

  /**
   * Property filterLabel
   * @readonly
   *
   * @description
   * Localized accessible label for the table filter control.
   *
   * @type {InputSignal<string>}
   */
  public readonly filterLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.dataTable.filter:Filtrer les lignes`,
  );

  /**
   * Property filterPlaceholder
   * @readonly
   *
   * @description
   * Localized placeholder shown before text is entered in the filter control.
   *
   * @type {InputSignal<string>}
   */
  public readonly filterPlaceholder: InputSignal<string> = input<string>(
    $localize`:@@ui.dataTable.filterPlaceholder:Filtrer…`,
  );

  /**
   * Property emptyText
   * @readonly
   *
   * @description
   * Localized message rendered when the supplied rows and active filter leave no rows to display.
   *
   * @type {InputSignal<string>}
   */
  public readonly emptyText: InputSignal<string> = input<string>(
    $localize`:@@ui.dataTable.empty:Aucun résultat.`,
  );

  /**
   * Property rowsPerPageLabel
   * @readonly
   *
   * @description
   * Localized accessible label for the page-size selector.
   *
   * @type {InputSignal<string>}
   */
  public readonly rowsPerPageLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.dataTable.rowsPerPage:Lignes par page`,
  );

  /**
   * Property previousPageLabel
   * @readonly
   *
   * @description
   * Localized accessible label for the previous-page control.
   *
   * @type {InputSignal<string>}
   */
  public readonly previousPageLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.dataTable.previousPage:Page précédente`,
  );

  /**
   * Property nextPageLabel
   * @readonly
   *
   * @description
   * Localized accessible label for the next-page control.
   *
   * @type {InputSignal<string>}
   */
  public readonly nextPageLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.dataTable.nextPage:Page suivante`,
  );

  /**
   * Property selectAllLabel
   * @readonly
   *
   * @description
   * Localized accessible label for selecting or clearing the visible page rows.
   *
   * @type {InputSignal<string>}
   */
  public readonly selectAllLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.dataTable.selectAll:Sélectionner toutes les lignes de la page`,
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
   * Property icons
   * @readonly
   *
   * @description
   * Lucide glyphs used for sort direction and page navigation controls.
   *
   * @type {Readonly<{ asc: typeof lucideArrowUp; desc: typeof lucideArrowDown; unsorted: typeof lucideChevronsUpDown; previous: typeof lucideChevronLeft; next: typeof lucideChevronRight }>}
   */
  protected readonly icons: {
    readonly asc: typeof lucideArrowUp;
    readonly desc: typeof lucideArrowDown;
    readonly unsorted: typeof lucideChevronsUpDown;
    readonly previous: typeof lucideChevronLeft;
    readonly next: typeof lucideChevronRight;
  } = {
    asc: lucideArrowUp,
    desc: lucideArrowDown,
    unsorted: lucideChevronsUpDown,
    previous: lucideChevronLeft,
    next: lucideChevronRight,
  } as const;

  /**
   * Property tableId
   * @readonly
   *
   * @description
   * Per-instance table id referenced by the filter and pagination controls through `aria-controls`.
   *
   * @type {string}
   */
  protected readonly tableId: string =
    inject<RenderIdService>(RenderIdService).next('ui-data-table-');

  /**
   * Property cellTemplates
   * @readonly
   *
   * @description
   * Live query of custom cell template directives projected into the table.
   *
   * @type {Signal<readonly DataTableCellDirective<unknown>[]>}
   */
  private readonly cellTemplates: Signal<readonly DataTableCellDirective<T>[]> =
    contentChildren<DataTableCellDirective<T>>(DataTableCellDirective);

  /**
   * Property templates
   * @readonly
   *
   * @description
   * Map from projected column ids to their typed row templates, recomputed when the content query changes.
   *
   * @type {Signal<Map<string, TemplateRef<DataTableCellContext<T>>>>}
   */
  protected readonly templates: Signal<Map<string, TemplateRef<DataTableCellContext<T>>>> =
    computed<Map<string, TemplateRef<DataTableCellContext<T>>>>(
      () => new Map(this.cellTemplates().map((cell) => [cell.uiDataTableCell(), cell.template])),
    );

  /**
   * Property collator
   * @readonly
   *
   * @description
   * Locale-aware collator used for string sorting with numeric ordering and accent-insensitive comparison.
   *
   * @type {Intl.Collator}
   */
  private readonly collator: Intl.Collator = new Intl.Collator(inject<string>(LOCALE_ID), {
    numeric: true,
    sensitivity: 'base',
  });

  /**
   * Property filtered
   * @readonly
   *
   * @description
   * Rows matching the current filter across the cell values of columns that provide a cell accessor.
   *
   * @type {Signal<T[]>}
   */
  private readonly filtered: Signal<T[]> = computed<T[]>(() => {
    const columns: DataTableColumn<T>[] = this.columns().filter((column) => column.cell);
    return filterRows(this.data(), this.filter(), (row) =>
      columns.map((column) => column.cell?.(row)),
    );
  });

  /**
   * Property sorted
   * @readonly
   *
   * @description
   * Filtered rows sorted by the active column's explicit sort value or, when absent, its cell accessor.
   *
   * @type {Signal<T[]>}
   */
  private readonly sorted: Signal<T[]> = computed<T[]>(() => {
    const sort: DataTableSort | null = this.sort();
    const column: DataTableColumn<T> | undefined = this.columns().find(
      (candidate) => candidate.id === sort?.column,
    );
    const value: ((row: T) => CellValue) | undefined = column?.sortValue ?? column?.cell;
    if (!sort || !value) return this.filtered();
    return sortRows(this.filtered(), value, sort.direction, this.collator);
  });

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
   * Requested page index clamped to the range from zero to the final available page.
   *
   * @type {Signal<number>}
   */
  protected readonly currentPage: Signal<number> = computed<number>(() =>
    Math.min(Math.max(0, this.page()), this.pageTotal() - 1),
  );

  /**
   * Property rows
   * @readonly
   *
   * @description
   * Visible rows after filter, sort, and optional page slicing.
   *
   * @type {Signal<T[]>}
   */
  protected readonly rows: Signal<T[]> = computed<T[]>(() =>
    this.paginated() ? pageRows(this.sorted(), this.currentPage(), this.pageSize()) : this.sorted(),
  );

  /**
   * Property pageStatus
   * @readonly
   *
   * @description
   * Localized current and total page count announced by the pagination status element.
   *
   * @type {Signal<string>}
   */
  protected readonly pageStatus: Signal<string> = computed<string>(() => {
    const page: number = this.currentPage() + 1;
    const total: number = this.pageTotal();
    return $localize`:@@ui.dataTable.pageStatus:Page ${page}:PAGE: sur ${total}:TOTAL:`;
  });

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
    () => this.columns().length + (this.selectable() ? 1 : 0),
  );

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merged wrapper classes combining the table layout with caller-provided classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn('flex flex-col gap-4', this.class()),
  );

  /**
   * Property checkboxClass
   * @readonly
   *
   * @description
   * Shared checkbox utilities for alignment, visible focus, and disabled presentation.
   *
   * @type {string}
   */
  protected readonly checkboxClass: string =
    'size-4 cursor-pointer rounded-sm accent-star align-middle outline-4 outline-offset-2 outline-transparent focus-visible:outline-star/40 disabled:cursor-not-allowed disabled:opacity-50';
  // #endregion

  // #region Methods
  /**
   * Method trackKey
   * @method trackKey
   *
   * @description
   * Returns the row identity used by the template's tracking expression.
   *
   * @param {T} row - Row being rendered.
   *
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
   *
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
   * Builds the localized accessible label for a row checkbox, preferring the caller's row name over its position in the complete page sequence.
   *
   * @param {T} row - Row described by the checkbox.
   * @param {number} index - Zero-based position within the currently rendered page.
   *
   * @returns {string} Localized checkbox label.
   */
  protected rowCheckboxLabel(row: T, index: number): string {
    const name: string | undefined = this.rowLabel()?.(row);
    if (name) return $localize`:@@ui.dataTable.selectNamedRow:Sélectionner ${name}:NAME:`;
    const position: number = this.currentPage() * this.pageSize() + index + 1;
    return $localize`:@@ui.dataTable.selectRow:Sélectionner la ligne ${position}:INDEX:`;
  }

  /**
   * Method ariaSort
   * @method ariaSort
   *
   * @description
   * Returns the ARIA sort state only for the active sortable column; unsorted and non-sortable columns return `null`.
   *
   * @param {DataTableColumn<T>} column - Column whose header state is rendered.
   *
   * @returns {'ascending' | 'descending' | null} Accessible sort state for the column.
   */
  protected ariaSort(column: DataTableColumn<T>): 'ascending' | 'descending' | null {
    const sort: DataTableSort | null = this.sort();
    if (!column.sortable || sort?.column !== column.id) return null;
    return sort.direction === 'asc' ? 'ascending' : 'descending';
  }

  /**
   * Method sortIcon
   * @method sortIcon
   *
   * @description
   * Selects the active direction glyph for the sorted column or the unsorted glyph otherwise.
   *
   * @param {DataTableColumn<T>} column - Column whose sort glyph is rendered.
   *
   * @returns {string} Icon registry key for the current sort state.
   */
  protected sortIcon(column: DataTableColumn<T>): string {
    const sort: DataTableSort | null = this.sort();
    return sort?.column === column.id ? this.icons[sort.direction] : this.icons.unsorted;
  }

  /**
   * Method headerClasses
   * @method headerClasses
   *
   * @description
   * Combines shared header utilities with the column's alignment and caller-supplied classes.
   *
   * @param {DataTableColumn<T>} column - Column whose header classes are resolved.
   *
   * @returns {string} Merged header class list.
   */
  protected headerClasses(column: DataTableColumn<T>): string {
    return cn(
      'h-11 px-3 align-middle font-mono text-label font-normal whitespace-nowrap text-star-faint uppercase',
      alignClasses[column.align ?? 'start'],
      column.class,
    );
  }

  /**
   * Method cellClasses
   * @method cellClasses
   *
   * @description
   * Combines shared body-cell utilities with the column's alignment and caller-supplied classes.
   *
   * @param {DataTableColumn<T>} column - Column whose cell classes are resolved.
   *
   * @returns {string} Merged body-cell class list.
   */
  protected cellClasses(column: DataTableColumn<T>): string {
    return cn(
      'px-3 py-3 align-middle text-star',
      alignClasses[column.align ?? 'start'],
      column.class,
    );
  }

  /**
   * Method toggleSort
   * @method toggleSort
   *
   * @description
   * Advances the controlled sort model for the selected column using the shared table sort cycle.
   *
   * @param {DataTableColumn<T>} column - Column whose sort cycle is advanced.
   *
   * @returns {void} Updates the sort model.
   */
  protected toggleSort(column: DataTableColumn<T>): void {
    this.sort.set(nextSort(this.sort(), column.id));
  }

  /**
   * Method onFilter
   * @method onFilter
   *
   * @description
   * Copies the filter input value into the filter model and resets pagination to the first page.
   *
   * @param {Event} event - Input event from the filter control.
   *
   * @returns {void} Updates the filter and page models.
   */
  protected onFilter(event: Event): void {
    this.filter.set((event.target as HTMLInputElement).value);
    this.page.set(0);
  }

  /**
   * Method onPageSize
   * @method onPageSize
   *
   * @description
   * Parses the selected page size and resets pagination to the first page.
   *
   * @param {Event} event - Change event from the page-size selector.
   *
   * @returns {void} Updates the page-size and page models.
   */
  protected onPageSize(event: Event): void {
    this.pageSize.set(Number((event.target as HTMLSelectElement).value));
    this.page.set(0);
  }

  /**
   * Method goTo
   * @method goTo
   *
   * @description
   * Sets the requested zero-based page after clamping it to the currently available page range.
   *
   * @param {number} page - Requested zero-based page index.
   *
   * @returns {void} Updates the controlled page model.
   */
  protected goTo(page: number): void {
    this.page.set(Math.min(Math.max(0, page), this.pageTotal() - 1));
  }

  /**
   * Method toggleRow
   * @method toggleRow
   *
   * @description
   * Removes a selected row by key or appends it to the selection model when it is not selected.
   *
   * @param {T} row - Row whose selection state is toggled.
   *
   * @returns {void} Updates the controlled selection model.
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
   * Clears the visible page from selection when all its rows are selected, or adds only unselected visible rows otherwise; selections on other pages are retained.
   *
   * @returns {void} Updates the controlled selection model for rows on the current page.
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
