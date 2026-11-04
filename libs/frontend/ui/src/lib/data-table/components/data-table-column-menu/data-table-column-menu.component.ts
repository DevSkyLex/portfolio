import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideColumns3 } from '@ng-icons/lucide';
import { ButtonDirective } from '@internal/ui/lib/button/button.directive';
import { DropdownMenuContentDirective } from '@internal/ui/lib/dropdown-menu/directives/dropdown-menu-content/dropdown-menu-content.directive';
import { DropdownMenuItemIndicatorComponent } from '@internal/ui/lib/dropdown-menu/components/dropdown-menu-indicator/dropdown-menu-indicator.component';
import { DropdownMenuLabelDirective } from '@internal/ui/lib/dropdown-menu/directives/dropdown-menu-parts/dropdown-menu-parts.directive';
import { DropdownMenuCheckboxItemDirective } from '@internal/ui/lib/dropdown-menu/directives/dropdown-menu-selectable/dropdown-menu-selectable.directive';
import { DropdownMenuTriggerDirective } from '@internal/ui/lib/dropdown-menu/directives/dropdown-menu-trigger/dropdown-menu-trigger.directive';
import type { DataTableColumnToggle } from '@internal/ui/lib/data-table/models/data-table/data-table-column-toggle.interface';
import type { DataTableLabels } from '@internal/ui/lib/data-table/models/data-table/data-table-labels.interface';

/**
 * Component DataTableColumnMenuComponent
 * @class DataTableColumnMenuComponent
 *
 * @description
 * "Colonnes" button of the toolbar: a menu of checkbox items showing or hiding the hideable columns.
 */
@Component({
  selector: 'ui-data-table-column-menu',
  imports: [
    ButtonDirective,
    DropdownMenuCheckboxItemDirective,
    DropdownMenuContentDirective,
    DropdownMenuItemIndicatorComponent,
    DropdownMenuLabelDirective,
    DropdownMenuTriggerDirective,
    NgIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents', 'data-slot': 'data-table-column-menu' },
  template: `
    <button
      uiBtn
      variant="ghost"
      size="sm"
      type="button"
      class="h-8 gap-1.5 rounded-sm px-2.5 text-[13px] font-medium @max-[640px]:hidden"
      align="end"
      [uiDropdownMenuTrigger]="menu"
    >
      <ng-icon [svg]="icons.columns" size="14" aria-hidden="true" />
      {{ labels().columns }}
    </button>
    <ng-template #menu>
      <div uiDropdownMenuContent class="min-w-48">
        <div uiDropdownMenuLabel>{{ labels().columnsMenu }}</div>
        @for (column of columns(); track column.id) {
          <button
            uiDropdownMenuCheckboxItem
            type="button"
            [checked]="column.visible"
            (triggered)="toggled.emit(column.id)"
          >
            <ui-dropdown-menu-item-indicator />
            {{ column.header }}
          </button>
        }
      </div>
    </ng-template>
  `,
})
export class DataTableColumnMenuComponent {
  // #region Properties
  /**
   * Property columns
   * @readonly
   *
   * @description
   * Hideable columns with their visibility.
   *
   * @type {InputSignal<readonly DataTableColumnToggle[]>}
   */
  public readonly columns: InputSignal<readonly DataTableColumnToggle[]> =
    input.required<readonly DataTableColumnToggle[]>();

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
   * Property toggled
   * @readonly
   *
   * @description
   * Emits the id of the column whose visibility was flipped.
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly toggled: OutputEmitterRef<string> = output<string>();

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide glyph of the menu button.
   *
   * @type {{ readonly columns: typeof lucideColumns3 }}
   */
  protected readonly icons: { readonly columns: typeof lucideColumns3 } = {
    columns: lucideColumns3,
  } as const;
  // #endregion
}
