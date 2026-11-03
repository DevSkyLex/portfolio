import { CdkConnectedOverlay } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  forwardRef,
  input,
  linkedSignal,
  model,
  signal,
  type InputSignal,
  type ModelSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { NgIcon } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';
import { InputDirective } from '@internal/ui/lib/input/input.directive';
import { normalizeText } from '@internal/ui/lib/menu-panel/utils/menu-panel/menu-panel.utils';
import { ComboboxBase } from '@internal/ui/lib/combobox/directives/combobox-base/combobox-base';
import { ComboboxOptionComponent } from '@internal/ui/lib/combobox/components/combobox-option/combobox-option.component';
import { COMBOBOX_HOST } from '@internal/ui/lib/combobox/tokens/combobox/combobox.token';
import type { ComboboxHost } from '@internal/ui/lib/combobox/models/combobox/combobox-host.interface';
import type { ComboboxItem } from '@internal/ui/lib/combobox/models/combobox/combobox-item.interface';

/**
 * Class ComboboxComponent
 *
 * @description
 * Filters combobox options by label and keywords, ignoring case and accents, and exposes the chosen option value as a form control.
 *
 * @template T - Value type represented by each option.
 */
@Component({
  selector: 'ui-combobox',
  imports: [NgIcon, CdkConnectedOverlay, InputDirective],
  templateUrl: './combobox.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: COMBOBOX_HOST, useExisting: forwardRef(() => ComboboxComponent) }],
  host: { class: 'relative block', 'data-slot': 'combobox' },
})
export class ComboboxComponent<T = unknown>
  extends ComboboxBase<ComboboxOptionComponent>
  implements FormValueControl<T | null>, ComboboxHost
{
  // #region Properties
  /**
   * Property value
   *
   * @description
   * Holds the selected option value and participates in Angular Signal Forms.
   */
  public readonly value: ModelSignal<T | null> = model<T | null>(null);

  /**
   * Property emptyText
   *
   * @description
   * Supplies the accessible empty-result message.
   */
  public readonly emptyText: InputSignal<string> = input<string>(
    $localize`:@@ui.combobox.empty:Aucun résultat`,
  );

  /**
   * Property compareWith
   *
   * @description
   * Compares option and model values when resolving selection state.
   */
  public readonly compareWith: InputSignal<(a: unknown, b: unknown) => boolean> = input<
    (a: unknown, b: unknown) => boolean
  >(Object.is);

  /**
   * Property icons
   *
   * @description
   * Supplies the chevron icon rendered by the control.
   */
  protected readonly icons: { readonly chevron: typeof lucideChevronDown } = {
    chevron: lucideChevronDown,
  } as const;

  /**
   * Property options
   *
   * @description
   * Collects descendant option components projected into the control.
   */
  private readonly options: Signal<readonly ComboboxOptionComponent<unknown>[]> = contentChildren<
    ComboboxOptionComponent<unknown>
  >(ComboboxOptionComponent, { descendants: true });

  /**
   * Property query
   *
   * @description
   * Tracks typed text separately from the selected value and display label.
   */
  private readonly query: WritableSignal<string> = signal<string>('');

  /**
   * Property selectedOption
   *
   * @description
   * Resolves the option matching the current model value.
   */
  private readonly selectedOption: Signal<ComboboxOptionComponent<unknown> | null> =
    computed<ComboboxOptionComponent<unknown> | null>(
      () => this.options().find((option) => this.isSelected(option.value())) ?? null,
    );

  /**
   * Property text
   *
   * @description
   * Tracks the field text and follows the selected option label when selection changes.
   */
  protected readonly text: WritableSignal<string> = linkedSignal<string>(
    () => this.selectedOption()?.text() ?? '',
  );

  /**
   * Property items
   *
   * @description
   * Provides the visible options in their projected order.
   */
  protected readonly items: Signal<ComboboxOptionComponent<unknown>[]> = computed<
    ComboboxOptionComponent<unknown>[]
  >(() => this.options().filter((option) => this.isVisible(option)));
  // #endregion

  // #region Methods
  /**
   * Method isVisible
   *
   * @description
   * Matches an option label or keyword against the normalized query.
   *
   * @param {ComboboxItem} item - Option to test.
   * @returns {boolean} Whether the option should be displayed.
   */
  public isVisible(item: ComboboxItem): boolean {
    const query: string = normalizeText(this.query());
    if (!query) return true;
    const option: ComboboxOptionComponent<unknown> = item as ComboboxOptionComponent;
    return [option.text(), ...option.keywords()].some((word) =>
      normalizeText(word).includes(query),
    );
  }

  /**
   * Method isSelected
   *
   * @description
   * Compares an option value with the current non-null model value.
   *
   * @param {unknown} value - Candidate option value.
   * @returns {boolean} Whether the candidate is selected.
   */
  public isSelected(value: unknown): boolean {
    const current: T | null = this.value();
    return current !== null && current !== undefined && this.compareWith()(value, current);
  }

  /**
   * Method write
   * @method write
   *
   * @description
   * Updates both the component text signal and native field value because the form binding may not
   * yet reflect text entered by the user.
   *
   * @param {string} text - Text to display in the field.
   *
   * @returns {void}
   */
  private write(text: string): void {
    this.text.set(text);
    this.field().nativeElement.value = text;
  }

  /**
   * Method onInput
   *
   * @description
   * Updates displayed text and the filter query, then opens the matching option list.
   *
   * @param {string} text - Current native field text.
   * @returns {void}
   */
  protected onInput(text: string): void {
    this.text.set(text);
    this.query.set(text);
    this.onTyped();
  }

  /**
   * Method commit
   *
   * @description
   * Stores the selected option, restores its label, and clears the filter query.
   *
   * @param {ComboboxOptionComponent} option - Selected option.
   * @returns {void}
   */
  protected commit(option: ComboboxOptionComponent): void {
    this.value.set(option.value() as T);
    this.write(option.text());
    this.query.set('');
  }

  /**
   * Method revert
   *
   * @description
   * Restores the selected label after editing, or clears selection when the field is empty.
   *
   * @returns {void}
   */
  protected revert(): void {
    this.query.set('');
    if (this.text().trim()) this.write(this.selectedOption()?.text() ?? '');
    else this.value.set(null);
  }

  /**
   * Method clear
   *
   * @description
   * Clears the field text, filter query, and selected value.
   *
   * @returns {void}
   */
  protected clear(): void {
    this.write('');
    this.query.set('');
    this.value.set(null);
  }
  // #endregion
}
