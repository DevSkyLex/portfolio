import { Directive, TemplateRef, inject } from '@angular/core';
import type { DataTableEmptyContext } from '@internal/ui/lib/data-table/models/data-table/data-table-empty-context.interface';

/**
 * Class DataTableEmptyDirective
 * @class DataTableEmptyDirective
 *
 * @description
 * Replaces the default state shown when the table has no row at all, typically with a `uiEmpty`
 * block bound to the context's layout (`<ng-template uiDataTableEmpty let-layout>` then
 * `<div uiEmpty [layout]="layout">`). The no-result state of the search and facets keeps its own
 * message and reset action.
 */
@Directive({ selector: 'ng-template[uiDataTableEmpty]' })
export class DataTableEmptyDirective {
  // #region Properties
  /**
   * Property template
   * @readonly
   *
   * @description
   * Content rendered below the heading row, with the table's empty layout as context.
   *
   * @type {TemplateRef<DataTableEmptyContext>}
   */
  public readonly template: TemplateRef<DataTableEmptyContext> =
    inject<TemplateRef<DataTableEmptyContext>>(TemplateRef);
  // #endregion

  // #region Methods
  /**
   * Method ngTemplateContextGuard
   * @method ngTemplateContextGuard
   *
   * @description
   * Informs Angular's template checker that this template renders with `DataTableEmptyContext`.
   *
   * @param {DataTableEmptyDirective} directive - Directive attached to the template.
   * @param {unknown} context - Context value to narrow for template checking.
   * @returns {context is DataTableEmptyContext} Type predicate used by Angular's template checker.
   */
  public static ngTemplateContextGuard(
    directive: DataTableEmptyDirective,
    context: unknown,
  ): context is DataTableEmptyContext {
    // Type-only guard: the table always renders the template with this context.
    return !!directive && typeof context === 'object';
  }
  // #endregion
}
