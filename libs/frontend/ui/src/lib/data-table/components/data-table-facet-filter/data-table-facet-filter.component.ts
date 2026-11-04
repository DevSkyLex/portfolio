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
import { lucideListFilter } from '@ng-icons/lucide';
import { ButtonDirective } from '@internal/ui/lib/button/button.directive';
import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import { CheckboxComponent } from '@internal/ui/lib/checkbox/checkbox.component';
import {
  PopoverContentDirective,
  PopoverTriggerDirective,
} from '@internal/ui/lib/popover/popover.directive';
import type { DataTableFacetView } from '@internal/ui/lib/data-table/models/data-table/data-table-facet-view.interface';
import type { DataTableLabels } from '@internal/ui/lib/data-table/models/data-table/data-table-labels.interface';
import { toggleValue } from '@internal/ui/lib/data-table/utils/data-table-facets/data-table-facets.utils';

/**
 * Component DataTableFacetFilterComponent
 * @class DataTableFacetFilterComponent
 *
 * @description
 * Toolbar button of one facet opening a popover of checkboxes, each with the number of rows it would
 * match. The popover stays open while options are checked (a menu would close on each click); Escape or
 * an outside click closes it and focus returns to the button. The checked values show once, as the
 * table toolbar's removable chips, so the button carries no count (`data-active` marks it).
 */
@Component({
  selector: 'ui-data-table-facet-filter',
  imports: [
    ButtonDirective,
    CheckboxComponent,
    NgIcon,
    PopoverContentDirective,
    PopoverTriggerDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents', 'data-slot': 'data-table-facet-filter' },
  template: `
    <button
      uiBtn
      variant="secondary"
      size="sm"
      type="button"
      class="h-8 gap-1.5 rounded-sm border-dashed px-2.5 text-[13px] font-medium"
      align="start"
      [uiPopoverTrigger]="panel"
      [attr.data-active]="selectedCount() > 0 ? '' : null"
    >
      <ng-icon [svg]="facet().icon ?? icons.filter" size="14" aria-hidden="true" />
      {{ facet().label }}
    </button>
    <ng-template
      #panel="uiPopoverContent"
      uiPopoverContent
      [class]="'w-60 gap-0 p-[3px] text-[13px]'"
      [ariaLabel]="labels().facetPanel(facet().label)"
    >
      <fieldset class="flex min-w-0 flex-col">
        <legend class="sr-only">{{ facet().label }}</legend>
        @for (option of facet().options; track option.value) {
          <!-- Rows enter in cascade, like menu options (menuOptionVariants cascade). -->
          <div
            class="flex min-h-8 animate-menu-in items-center gap-2.5 rounded-sm ps-2 text-fg-muted transition-colors duration-(--dur-pop) ease-orbit [animation-delay:calc(90ms+min(var(--i,0),8)*45ms)] hover:bg-surface-hover hover:text-fg has-checked:text-fg motion-reduce:animate-none motion-reduce:transition-none"
            [style.--i]="$index"
          >
            <ui-checkbox
              size="sm"
              [controlId]="baseId + '-' + $index"
              [checked]="option.selected"
              (checkedChange)="toggle(option.value)"
            />
            <label
              class="flex min-h-8 min-w-0 flex-1 cursor-pointer items-center gap-2.5 pe-2"
              [for]="baseId + '-' + $index"
            >
              <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
              <span class="font-mono text-[12px] text-fg-faint tabular-nums">{{
                option.count
              }}</span>
            </label>
          </div>
        }
      </fieldset>
      @if (selectedCount() > 0) {
        <div class="-mx-[3px] my-1 h-px shrink-0 bg-border" aria-hidden="true"></div>
        <button
          uiBtn
          variant="ghost"
          size="sm"
          type="button"
          class="h-8 animate-menu-in justify-start rounded-sm px-2 text-[13px] [animation-delay:calc(90ms+min(var(--i,0),8)*45ms)] motion-reduce:animate-none"
          [style.--i]="facet().options.length"
          (click)="valuesChanged.emit([])"
        >
          {{ labels().facetClear }}
        </button>
      }
    </ng-template>
  `,
})
export class DataTableFacetFilterComponent {
  // #region Properties
  /**
   * Property facet
   * @readonly
   *
   * @description
   * Facet label and counted options.
   *
   * @type {InputSignal<DataTableFacetView>}
   */
  public readonly facet: InputSignal<DataTableFacetView> = input.required<DataTableFacetView>();

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
   * Property valuesChanged
   * @readonly
   *
   * @description
   * Emits the checked values after a toggle or a clear.
   *
   * @type {OutputEmitterRef<readonly string[]>}
   */
  public readonly valuesChanged: OutputEmitterRef<readonly string[]> = output<readonly string[]>();

  /**
   * Property selectedCount
   * @readonly
   *
   * @description
   * Number of checked options.
   *
   * @type {Signal<number>}
   */
  protected readonly selectedCount: Signal<number> = computed<number>(
    () => this.facet().options.filter((option) => option.selected).length,
  );

  /**
   * Property baseId
   * @readonly
   *
   * @description
   * Prefix of the option checkbox ids, unique per facet button.
   *
   * @type {string}
   */
  protected readonly baseId: string =
    inject<RenderIdService>(RenderIdService).next('ui-data-table-facet-');

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide glyph of the facet button.
   *
   * @type {{ readonly filter: typeof lucideListFilter }}
   */
  protected readonly icons: { readonly filter: typeof lucideListFilter } = {
    filter: lucideListFilter,
  } as const;
  // #endregion

  // #region Methods
  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Emits the checked values with one option flipped.
   *
   * @param {string} value - Option value toggled.
   */
  protected toggle(value: string): void {
    const checked: string[] = this.facet()
      .options.filter((option) => option.selected)
      .map((option) => option.value);
    this.valuesChanged.emit(toggleValue(checked, value));
  }
  // #endregion
}
