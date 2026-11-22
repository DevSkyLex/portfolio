import { Directive, inject, input, type InputSignal } from '@angular/core';
import type { ComboboxChoice } from '@internal/ui/lib/combobox/models/combobox/combobox-choice.interface';
import type { ComboboxHost } from '@internal/ui/lib/combobox/models/combobox/combobox-host.interface';
import { COMBOBOX_HOST } from '@internal/ui/lib/combobox/tokens/combobox/combobox.token';

/**
 * Directive ComboboxRowDirective
 * @class ComboboxRowDirective
 *
 * @description
 * Pointer behaviour of a virtualized combobox row, like the host listeners of
 * `ui-combobox-option`: the pointer activates the row and a click chooses it. The focus stays in the
 * field (active descendant), so the row is not focusable and has no key handler of its own.
 */
@Directive({
  selector: '[uiComboboxRow]',
  host: {
    '(click)': 'combobox.choose(uiComboboxRow())',
    '(pointermove)': 'combobox.activate(uiComboboxRow())',
  },
})
export class ComboboxRowDirective {
  // #region Properties
  /** Row this element draws. */
  public readonly uiComboboxRow: InputSignal<ComboboxChoice> = input.required<ComboboxChoice>();

  protected readonly combobox: ComboboxHost = inject<ComboboxHost>(COMBOBOX_HOST);
  // #endregion
}
