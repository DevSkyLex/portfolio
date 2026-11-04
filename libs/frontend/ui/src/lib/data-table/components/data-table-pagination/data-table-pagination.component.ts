import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import {
  lucideChevronLeft,
  lucideChevronRight,
  lucideChevronsLeft,
  lucideChevronsRight,
} from '@ng-icons/lucide';
import { ButtonDirective } from '@internal/ui/lib/button/button.directive';
import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import { SelectOptionComponent } from '@internal/ui/lib/select/components/select-option/select-option.component';
import { SelectComponent } from '@internal/ui/lib/select/select.component';
import type { DataTableLabels } from '@internal/ui/lib/data-table/models/data-table/data-table-labels.interface';

/**
 * Component DataTablePaginationComponent
 * @class DataTablePaginationComponent
 *
 * @description
 * Footer of a paginated table: the rendered range ("1–10 sur 42", announced politely), the page size
 * `ui-select` (an h-8 `rounded-sm` trigger, D43), and first, previous, next and last page buttons around the current page among the pages.
 */
@Component({
  selector: 'ui-data-table-pagination',
  imports: [ButtonDirective, NgIcon, SelectComponent, SelectOptionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-fg-muted',
    'data-slot': 'data-table-pagination',
  },
  template: `
    <p class="me-auto tabular-nums" aria-live="polite">{{ range() }}</p>
    <div class="flex items-center gap-2">
      <span [id]="labelId">{{ labels().rowsPerPage }}</span>
      <ui-select
        size="sm"
        class="h-8 w-20 rounded-sm ps-2.5 pe-2 text-[13px]"
        data-slot="data-table-page-size"
        [ariaLabelledby]="labelId"
        [value]="pageSize()"
        (valueChange)="onPageSize($event)"
      >
        @for (option of pageSizeOptions(); track option) {
          <ui-select-option [value]="option">{{ option }}</ui-select-option>
        }
      </ui-select>
    </div>
    <div class="flex items-center gap-1">
      <button
        uiBtn
        type="button"
        variant="ghost"
        size="icon-sm"
        [attr.aria-label]="labels().firstPage"
        [attr.aria-controls]="controls() || null"
        [disabled]="page() === 0"
        (click)="pageChanged.emit(0)"
      >
        <ng-icon class="rtl:-scale-x-100" [svg]="icons.first" size="16" aria-hidden="true" />
      </button>
      <button
        uiBtn
        type="button"
        variant="ghost"
        size="icon-sm"
        [attr.aria-label]="labels().previousPage"
        [attr.aria-controls]="controls() || null"
        [disabled]="page() === 0"
        (click)="pageChanged.emit(page() - 1)"
      >
        <ng-icon class="rtl:-scale-x-100" [svg]="icons.previous" size="16" aria-hidden="true" />
      </button>
      <span class="px-2 whitespace-nowrap text-fg tabular-nums" data-slot="data-table-page">{{
        labels().pageStatus(page() + 1, pageCount())
      }}</span>
      <button
        uiBtn
        type="button"
        variant="ghost"
        size="icon-sm"
        [attr.aria-label]="labels().nextPage"
        [attr.aria-controls]="controls() || null"
        [disabled]="page() >= pageCount() - 1"
        (click)="pageChanged.emit(page() + 1)"
      >
        <ng-icon class="rtl:-scale-x-100" [svg]="icons.next" size="16" aria-hidden="true" />
      </button>
      <button
        uiBtn
        type="button"
        variant="ghost"
        size="icon-sm"
        [attr.aria-label]="labels().lastPage"
        [attr.aria-controls]="controls() || null"
        [disabled]="page() >= pageCount() - 1"
        (click)="pageChanged.emit(pageCount() - 1)"
      >
        <ng-icon class="rtl:-scale-x-100" [svg]="icons.last" size="16" aria-hidden="true" />
      </button>
    </div>
  `,
})
export class DataTablePaginationComponent {
  // #region Properties
  /**
   * Property page
   * @readonly
   *
   * @description
   * Zero-based rendered page, already clamped by the table.
   *
   * @type {InputSignal<number>}
   */
  public readonly page: InputSignal<number> = input.required<number>();

  /**
   * Property pageCount
   * @readonly
   *
   * @description
   * Number of pages, at least one.
   *
   * @type {InputSignal<number>}
   */
  public readonly pageCount: InputSignal<number> = input.required<number>();

  /**
   * Property pageSize
   * @readonly
   *
   * @description
   * Rows per page.
   *
   * @type {InputSignal<number>}
   */
  public readonly pageSize: InputSignal<number> = input.required<number>();

  /**
   * Property pageSizeOptions
   * @readonly
   *
   * @description
   * Sizes offered by the select.
   *
   * @type {InputSignal<readonly number[]>}
   */
  public readonly pageSizeOptions: InputSignal<readonly number[]> =
    input.required<readonly number[]>();

  /**
   * Property total
   * @readonly
   *
   * @description
   * Rows left by the search and facets, across every page.
   *
   * @type {InputSignal<number>}
   */
  public readonly total: InputSignal<number> = input.required<number>();

  /**
   * Property labels
   * @readonly
   *
   * @description
   * Resolved texts of the owning table.
   *
   * @type {InputSignal<DataTableLabels>}
   */
  public readonly labels: InputSignal<DataTableLabels> = input.required<DataTableLabels>();

  /**
   * Property controls
   * @readonly
   *
   * @description
   * Id of the table the controls drive, for `aria-controls`.
   *
   * @type {InputSignal<string>}
   */
  public readonly controls: InputSignal<string> = input<string>('');

  /**
   * Property pageChanged
   * @readonly
   *
   * @description
   * Emits the zero-based page requested by a page button.
   *
   * @type {OutputEmitterRef<number>}
   */
  public readonly pageChanged: OutputEmitterRef<number> = output<number>();

  /**
   * Property pageSizeChanged
   * @readonly
   *
   * @description
   * Emits the page size chosen in the select.
   *
   * @type {OutputEmitterRef<number>}
   */
  public readonly pageSizeChanged: OutputEmitterRef<number> = output<number>();

  /**
   * Property range
   * @readonly
   *
   * @description
   * Rendered range text, starting from 0 when no row is left.
   *
   * @type {Signal<string>}
   */
  protected readonly range: Signal<string> = computed<string>(() => {
    const total: number = this.total();
    const from: number = total ? this.page() * this.pageSize() + 1 : 0;
    const to: number = Math.min(total, (this.page() + 1) * this.pageSize());
    return this.labels().range(from, to, total);
  });

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide glyphs of the page buttons, mirrored in right-to-left text.
   */
  protected readonly icons: {
    readonly first: typeof lucideChevronsLeft;
    readonly previous: typeof lucideChevronLeft;
    readonly next: typeof lucideChevronRight;
    readonly last: typeof lucideChevronsRight;
  } = {
    first: lucideChevronsLeft,
    previous: lucideChevronLeft,
    next: lucideChevronRight,
    last: lucideChevronsRight,
  } as const;

  /**
   * Property labelId
   * @readonly
   *
   * @description
   * Id of the "Lignes par page" text, which names the page-size select and its list.
   *
   * @type {string}
   */
  protected readonly labelId: string = inject<RenderIdService>(RenderIdService).next(
    'ui-data-table-page-size-',
  );
  // #endregion

  // #region Methods
  /**
   * Method onPageSize
   * @method onPageSize
   *
   * @description
   * Emits the page size chosen in the select; the select never clears, so `null` is ignored.
   *
   * @param {number | null} size - Chosen size.
   */
  protected onPageSize(size: number | null): void {
    if (size !== null && size !== this.pageSize()) this.pageSizeChanged.emit(size);
  }
  // #endregion
}
