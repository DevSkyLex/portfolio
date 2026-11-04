import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Component DataTableEmptyCellComponent
 * @component DataTableEmptyCellComponent
 *
 * @description
 * Placeholder of a table cell without a value: a faint dash for the eye, so an empty cell never reads
 * as a layout glitch, and « Non renseigné » for assistive technology. The table renders it for a
 * `cell()` value that is null, undefined or empty; a `uiDataTableCell` template places it itself.
 */
@Component({
  selector: 'ui-data-table-empty-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-slot': 'data-table-empty-cell', class: 'text-fg-faint' },
  template: `<span aria-hidden="true">—</span><span class="sr-only">{{ label }}</span>`,
})
export class DataTableEmptyCellComponent {
  // #region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Spoken text of the empty cell.
   *
   * @type {string}
   */
  protected readonly label: string = $localize`:@@ui.data-table.empty-cell:Non renseigné`;
  // #endregion
}
