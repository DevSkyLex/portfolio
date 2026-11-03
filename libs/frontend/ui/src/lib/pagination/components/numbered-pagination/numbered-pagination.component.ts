import type { PaginationRangeItem } from '@internal/ui/lib/pagination/components/numbered-pagination/models/pagination-range-item.type';

import {
  type InputSignal,
  type ModelSignal,
  type Signal,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  model,
} from '@angular/core';
import { PAGINATION_IMPORTS } from '@internal/ui/lib/pagination/constants/pagination.imports';
import { paginationRange } from '@internal/ui/lib/pagination/components/numbered-pagination/utils/numbered-pagination/numbered-pagination.utils';

/**
 * Component NumberedPaginationComponent
 * @class NumberedPaginationComponent
 *
 * @description
 * Renders page buttons with a two-way current-page model and a stable range of page links.
 * Use the `uiPagination*` parts when page navigation must be represented by URL links.
 */
@Component({
  selector: 'ui-numbered-pagination',
  imports: [PAGINATION_IMPORTS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-slot': 'numbered-pagination' },
  template: `<nav uiPagination [ariaLabel]="ariaLabel()">
    <ul uiPaginationContent>
      <li uiPaginationItem>
        <button uiPaginationPrevious type="button" [disabled]="current() <= 1" (click)="step(-1)">
          {{ previousLabel() }}
        </button>
      </li>
      @for (item of items(); track item) {
        <li uiPaginationItem>
          @if (typeof item === 'number') {
            <button
              uiPaginationLink
              type="button"
              [isActive]="item === current()"
              [attr.aria-label]="pageLabel()(item)"
              (click)="go(item)"
            >
              {{ item }}
            </button>
          } @else {
            <ui-pagination-ellipsis [label]="moreLabel()" />
          }
        </li>
      }
      <li uiPaginationItem>
        <button
          uiPaginationNext
          type="button"
          [disabled]="current() >= pageCount()"
          (click)="step(1)"
        >
          {{ nextLabel() }}
        </button>
      </li>
    </ul>
  </nav>`,
})
export class NumberedPaginationComponent {
  // #region Properties
  /**
   * Property host
   * @readonly
   *
   * @description
   * Host element used to restore focus to the current page after an end button becomes disabled.
   *
   * @type {ElementRef<HTMLElement>}
   */
  private readonly host: ElementRef<HTMLElement> = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Injector passed to the deferred render callback that restores page-button focus.
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject<Injector>(Injector);

  /**
   * Property page
   * @readonly
   *
   * @description
   * Two-way current page model; page numbers start at one and are clamped for rendering.
   *
   * @type {ModelSignal<number>}
   */
  public readonly page: ModelSignal<number> = model<number>(1);

  /**
   * Property totalPages
   * @readonly
   *
   * @description
   * Requested number of pages; non-positive and fractional values are normalized for display.
   *
   * @type {InputSignal<number>}
   */
  public readonly totalPages: InputSignal<number> = input.required<number>();

  /**
   * Property siblings
   * @readonly
   *
   * @description
   * Number of neighboring page buttons shown on either side of the current page.
   *
   * @type {InputSignal<number>}
   */
  public readonly siblings: InputSignal<number> = input<number>(1);

  /**
   * Property ariaLabel
   * @readonly
   *
   * @description
   * Accessible name passed to the pagination navigation landmark.
   *
   * @type {InputSignal<string>}
   */
  public readonly ariaLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.pagination.label:Pagination`,
  );

  /**
   * Property previousLabel
   * @readonly
   *
   * @description
   * Text rendered in the previous-page button.
   *
   * @type {InputSignal<string>}
   */
  public readonly previousLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.pagination.previous:Précédent`,
  );

  /**
   * Property nextLabel
   * @readonly
   *
   * @description
   * Text rendered in the next-page button.
   *
   * @type {InputSignal<string>}
   */
  public readonly nextLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.pagination.next:Suivant`,
  );

  /**
   * Property moreLabel
   * @readonly
   *
   * @description
   * Accessible text rendered when the visible range contains an ellipsis.
   *
   * @type {InputSignal<string>}
   */
  public readonly moreLabel: InputSignal<string> = input<string>(
    $localize`:@@ui.pagination.more:Autres pages`,
  );

  /**
   * Property pageLabel
   * @readonly
   *
   * @description
   * Formats the accessible name for each numbered page button.
   *
   * @type {InputSignal<(page: number) => string>}
   */
  public readonly pageLabel: InputSignal<(page: number) => string> = input<
    (page: number) => string
  >((page: number): string => $localize`:@@ui.pagination.page:Page ${page}:page:`);

  /**
   * Property pageCount
   * @readonly
   *
   * @description
   * Integer page count used by the component, with one page retained for empty ranges.
   *
   * @type {Signal<number>}
   */
  protected readonly pageCount: Signal<number> = computed<number>((): number =>
    Math.max(1, Math.floor(this.totalPages())),
  );

  /**
   * Property current
   * @readonly
   *
   * @description
   * Displayed page clamped between the first page and the normalized page count.
   *
   * @type {Signal<number>}
   */
  protected readonly current: Signal<number> = computed<number>((): number =>
    Math.min(Math.max(1, Math.floor(this.page())), this.pageCount()),
  );

  /**
   * Property items
   * @readonly
   *
   * @description
   * Numbered pages and ellipsis markers rendered by the pagination template.
   *
   * @type {Signal<PaginationRangeItem[]>}
   */
  protected readonly items: Signal<PaginationRangeItem[]> = computed<PaginationRangeItem[]>(
    (): PaginationRangeItem[] => paginationRange(this.current(), this.pageCount(), this.siblings()),
  );
  // #endregion

  // #region Methods
  /**
   * Method go
   * @method go
   *
   * @description
   * Updates the page model after clamping the requested page to the available range.
   *
   * @param {number} page - Requested destination page.
   * @returns {void} Updates the page model.
   */
  protected go(page: number): void {
    this.page.set(Math.min(Math.max(1, page), this.pageCount()));
  }

  /**
   * Method step
   * @method step
   *
   * @description
   * Moves by one page and restores focus to the current page link when a boundary disables
   * the button that received the click.
   *
   * @param {-1 | 1} delta - Direction and distance of the page change.
   * @returns {void} Updates the page model and may schedule focus restoration.
   */
  protected step(delta: -1 | 1): void {
    this.go(this.current() + delta);

    // Reaching an end disables the pressed button: focus moves to the current page, not to the body.
    if (this.current() === 1 || this.current() === this.pageCount()) {
      afterNextRender(
        (): void | undefined =>
          this.host.nativeElement.querySelector<HTMLElement>('[aria-current="page"]')?.focus(),
        { injector: this.injector },
      );
    }
  }
  // #endregion
}
