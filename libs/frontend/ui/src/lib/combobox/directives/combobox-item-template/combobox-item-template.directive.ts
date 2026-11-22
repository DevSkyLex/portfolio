import { Directive, TemplateRef, inject, input, type InputSignal } from '@angular/core';
import type { ComboboxEntry } from '@internal/ui/lib/combobox/models/combobox/combobox-entry.interface';

/**
 * Directive ComboboxItemTemplateDirective
 * @class ComboboxItemTemplateDirective
 *
 * @description
 * Content of each virtualized row of a combobox given `[entries]`
 * (`<ng-template uiComboboxItem let-entry>…</ng-template>`); without it a row shows the entry label.
 */
@Directive({ selector: 'ng-template[uiComboboxItem]' })
export class ComboboxItemTemplateDirective<T = unknown> {
  // #region Properties
  /**
   * The entries the rows draw, for typing only (`[uiComboboxItemOf]="entries"`): it types
   * `let-entry` with their value, like `cdkVirtualFor`; the combobox reads its own `[entries]`.
   */
  public readonly uiComboboxItemOf: InputSignal<readonly ComboboxEntry<T>[] | null | undefined> =
    input<readonly ComboboxEntry<T>[] | null | undefined>(undefined);

  /** Template rendered with the entry as its implicit context. */
  public readonly template: TemplateRef<{ $implicit: ComboboxEntry<T> }> =
    inject<TemplateRef<{ $implicit: ComboboxEntry<T> }>>(TemplateRef);
  // #endregion

  // #region Methods
  /** Types `let-entry` in the consumer's template. */
  public static ngTemplateContextGuard<T>(
    directive: ComboboxItemTemplateDirective<T>,
    context: unknown,
  ): context is { $implicit: ComboboxEntry<T> } {
    // Type narrowing only: Angular never calls the guard at runtime.
    return directive !== null && context !== null;
  }
  // #endregion
}
