import { CdkConnectedOverlay } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  type InputSignal,
  type ModelSignal,
  type Signal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { ComboboxBase } from '@internal/ui/lib/combobox/directives/combobox-base/combobox-base';
import { InputDirective } from '@internal/ui/lib/input/input.directive';
import { INPUT_GROUP_HOST } from '@internal/ui/lib/input/tokens/input-group-host.token';
import { normalizeText } from '@internal/ui/lib/menu-panel/utils/menu-panel/menu-panel.utils';
import { menuOptionVariants } from '@internal/ui/lib/menu-panel/constants/menu-option.variants';
import type { Suggestion } from '@internal/ui/lib/autocomplete/models/autocomplete/suggestion.interface';

/**
 * Component AutocompleteComponent
 * @class AutocompleteComponent
 * @extends ComboboxBase<Suggestion>
 *
 * @description
 * Editable text control that filters suggestions without committing them until the user navigates to an option and chooses it. Matching ignores case and accents; the typed text remains the form value when no option is selected.
 */
@Component({
  selector: 'ui-autocomplete',
  imports: [CdkConnectedOverlay, InputDirective],
  templateUrl: './autocomplete.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'group ? "relative flex min-w-0 flex-1 self-stretch" : "relative block"',
    'data-slot': 'autocomplete',
  },
})
export class AutocompleteComponent
  extends ComboboxBase<Suggestion>
  implements FormValueControl<string>
{
  // #region Properties
  /**
   * Property group
   * @readonly
   *
   * @description
   * Enclosing input group: the host fills its row and the inner `uiInput` becomes the group control,
   * so addons (a language switch, a button) sit in the same frame.
   *
   * @type {boolean}
   */
  protected readonly group: boolean = inject<true>(INPUT_GROUP_HOST, { optional: true }) ?? false;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Current editable text, exposed as the Signal Forms value and updated by typing or option selection.
   *
   * @type {ModelSignal<string>}
   */
  public readonly value: ModelSignal<string> = model<string>('');

  /**
   * Property options
   * @readonly
   *
   * @description
   * Candidate strings shown when they contain the normalized query; defaults to an empty collection.
   *
   * @type {InputSignal<readonly string[]>}
   */
  public readonly options: InputSignal<readonly string[]> = input<readonly string[]>([]);

  /**
   * Property emptyText
   * @readonly
   *
   * @description
   * Optional empty-state message; an empty value leaves the popup closed when there are no matches.
   *
   * @type {InputSignal<string>}
   */
  public readonly emptyText: InputSignal<string> = input<string>('');

  /**
   * Property items
   * @readonly
   *
   * @description
   * Filtered option records with stable listbox ids and text values derived from the provided strings.
   *
   * @type {Signal<readonly Suggestion[]>}
   */
  protected readonly items: Signal<readonly Suggestion[]> = computed<readonly Suggestion[]>(() => {
    const query: string = normalizeText(this.value());
    return this.options()
      .filter((option) => !query || normalizeText(option).includes(query))
      .map((option, index) => ({
        id: `${this.listboxId()}-${index}`,
        value: option,
        text: (): string => option,
        isDisabled: (): boolean => false,
      }));
  });

  /**
   * Property expanded
   * @readonly
   *
   * @description
   * Opens the popup only when the base combobox is open and there is a match or an empty-state message to display.
   *
   * @type {Signal<boolean>}
   */
  protected readonly expanded: Signal<boolean> = computed<boolean>(
    () => this.open() && (this.items().length > 0 || !!this.emptyText()),
  );

  /**
   * Property fieldClasses
   * @readonly
   *
   * @description
   * Adds the active expanded border treatment while retaining caller-provided classes.
   *
   * @type {Signal<string>}
   */
  protected override readonly fieldClasses: Signal<string> = computed<string>(() =>
    cn('aria-expanded:border-accent/55 aria-expanded:hover:border-accent/55', this.class()),
  );

  /**
   * Property optionClasses
   * @readonly
   *
   * @description
   * Uses menu-panel option styling at the inherited size without cascade indentation.
   *
   * @type {Signal<string>}
   */
  protected readonly optionClasses: Signal<string> = computed<string>(() =>
    menuOptionVariants({ size: this.size(), cascade: false }),
  );
  // #endregion

  // #region Methods
  /**
   * Method onInput
   * @method onInput
   *
   * @description
   * Stores the typed text, opens the suggestion popup, and clears active-option state so Enter preserves free text until an arrow selects an item.
   *
   * @param {string} text - Current native input value.
   *
   * @returns {void} Completes after updating the control state.
   */
  protected onInput(text: string): void {
    this.value.set(text);
    this.show();

    // Free text: Enter keeps what was typed until the arrows pick a suggestion.
    this.deactivate();
  }

  /**
   * Method commit
   * @method commit
   *
   * @description
   * Commits a selected option to both the model signal and native input element.
   *
   * @param {Suggestion} suggestion - Option selected from the listbox.
   *
   * @returns {void} Completes after the selected text is synchronized.
   */
  protected commit(suggestion: Suggestion): void {
    this.value.set(suggestion.value);
    this.field().nativeElement.value = suggestion.value;
  }

  /**
   * Method revert
   * @method revert
   *
   * @description
   * Leaves the typed text unchanged because free text is itself the control value.
   *
   * @returns {void} Completes without changing the field.
   */
  protected revert(): void {
    // The typed text is the value: nothing to restore.
  }

  /**
   * Method clear
   * @method clear
   *
   * @description
   * Clears both the model value and native input element after the base combobox handles its clear interaction.
   *
   * @returns {void} Completes after the field is empty.
   */
  protected clear(): void {
    this.value.set('');
    this.field().nativeElement.value = '';
  }
  // #endregion
}
