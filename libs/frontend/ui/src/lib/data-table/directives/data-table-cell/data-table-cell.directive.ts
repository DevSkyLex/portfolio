import { Directive, TemplateRef, inject, input, type InputSignal } from '@angular/core';
import type { DataTableCellContext } from '@internal/ui/lib/data-table/models/data-table/data-table-cell-context.interface';

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
   * Informs Angular's template checker that this template renders with `DataTableCellContext<T>`; the
   * runtime check accepts `null` because JavaScript reports `typeof null` as `object`.
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
