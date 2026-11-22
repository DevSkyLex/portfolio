import { CdkConnectedOverlay } from '@angular/cdk/overlay';
import {
  CdkFixedSizeVirtualScroll,
  CdkVirtualForOf,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  afterRenderEffect,
  computed,
  contentChild,
  contentChildren,
  forwardRef,
  input,
  linkedSignal,
  model,
  signal,
  viewChild,
  type InputSignal,
  type ModelSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { NgIcon } from '@ng-icons/core';
import { lucideCheck, lucideChevronDown } from '@ng-icons/lucide';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { InputDirective } from '@internal/ui/lib/input/input.directive';
import { menuOptionVariants } from '@internal/ui/lib/menu-panel/constants/menu-option.variants';
import { normalizeText } from '@internal/ui/lib/menu-panel/utils/menu-panel/menu-panel.utils';
import { ComboboxBase } from '@internal/ui/lib/combobox/directives/combobox-base/combobox-base';
import { ComboboxRowDirective } from '@internal/ui/lib/combobox/directives/combobox-row/combobox-row.directive';
import { ComboboxItemTemplateDirective } from '@internal/ui/lib/combobox/directives/combobox-item-template/combobox-item-template.directive';
import { ComboboxOptionComponent } from '@internal/ui/lib/combobox/components/combobox-option/combobox-option.component';
import { COMBOBOX_HOST } from '@internal/ui/lib/combobox/tokens/combobox/combobox.token';
import type { ComboboxChoice } from '@internal/ui/lib/combobox/models/combobox/combobox-choice.interface';
import type { ComboboxEntry } from '@internal/ui/lib/combobox/models/combobox/combobox-entry.interface';
import type { ComboboxHost } from '@internal/ui/lib/combobox/models/combobox/combobox-host.interface';
import type { ComboboxItem } from '@internal/ui/lib/combobox/models/combobox/combobox-item.interface';

/**
 * Constant ROW_HEIGHTS
 *
 * @description
 * Fixed height in pixels of a virtualized row per control size, the `min-h-*` of
 * `menuOptionVariants`, so the virtual scroll can place rows without measuring them.
 */
const ROW_HEIGHTS: Readonly<Record<'sm' | 'md' | 'lg', number>> = { sm: 32, md: 40, lg: 48 };

/**
 * Constant ROW_CLASSES
 *
 * @description
 * Literal height class of a virtualized row per control size (Tailwind needs whole class names).
 */
const ROW_CLASSES: Readonly<Record<'sm' | 'md' | 'lg', string>> = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-12',
};

/**
 * Class ComboboxComponent
 *
 * @description
 * Filters combobox options by label and keywords, ignoring case and accents, and exposes the chosen
 * option value as a form control. Options are projected `ui-combobox-option`s, or, for long lists,
 * `[entries]` given as data: the list is then virtualized (CDK virtual scroll), only the rows in view
 * exist, each drawn by the optional `ng-template uiComboboxItem`.
 *
 * @template T - Value type represented by each option.
 */
@Component({
  selector: 'ui-combobox',
  imports: [
    NgIcon,
    NgTemplateOutlet,
    CdkConnectedOverlay,
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
    CdkVirtualScrollViewport,
    ComboboxRowDirective,
    InputDirective,
  ],
  templateUrl: './combobox.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: COMBOBOX_HOST, useExisting: forwardRef(() => ComboboxComponent) }],
  host: { class: 'relative block', 'data-slot': 'combobox' },
})
export class ComboboxComponent<T = unknown>
  extends ComboboxBase<ComboboxChoice>
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

  /** Clears the selection after emitting it, for pickers that add items to a separate list. */
  public readonly clearOnSelect: InputSignal<boolean> = input<boolean>(false);

  /**
   * Options given as data: the list is virtualized and the projected options are ignored. `null`
   * (the default) keeps the projected `ui-combobox-option`s.
   */
  public readonly entries: InputSignal<readonly ComboboxEntry<T>[] | null> = input<
    readonly ComboboxEntry<T>[] | null
  >(null);

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
   * Supplies the chevron of the control and the check of a selected virtualized row.
   */
  protected readonly icons: {
    readonly chevron: typeof lucideChevronDown;
    readonly check: typeof lucideCheck;
  } = {
    chevron: lucideChevronDown,
    check: lucideCheck,
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

  /** Row template of the virtualized list, when the consumer gives one. */
  protected readonly itemTemplate: Signal<ComboboxItemTemplateDirective | undefined> =
    contentChild<ComboboxItemTemplateDirective>(ComboboxItemTemplateDirective);

  /** Whether the options come from `[entries]` and the list is virtualized. */
  protected readonly virtual: Signal<boolean> = computed<boolean>(() => this.entries() !== null);

  /** Rows built from `[entries]`, with ids stable for one list. */
  private readonly entryChoices: Signal<readonly ComboboxChoice[]> = computed<
    readonly ComboboxChoice[]
  >(() => {
    const prefix: string = `${this.listboxId()}-entry-`;
    return (this.entries() ?? []).map((entry: ComboboxEntry<T>, index: number): ComboboxChoice => ({
      id: `${prefix}${index}`,
      entry,
      value: (): unknown => entry.value,
      keywords: (): readonly string[] => entry.keywords ?? [],
      text: (): string => entry.label,
      isDisabled: (): boolean => !!entry.disabled,
    }));
  });

  /** Every option of the control, data rows or projected options. */
  private readonly choices: Signal<readonly ComboboxChoice[]> = computed<readonly ComboboxChoice[]>(
    () => (this.virtual() ? this.entryChoices() : this.options()),
  );

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
  private readonly selectedOption: Signal<ComboboxChoice | null> = computed<ComboboxChoice | null>(
    () => this.choices().find((option) => this.isSelected(option.value())) ?? null,
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
   * Provides the visible options in their order.
   */
  protected readonly items: Signal<ComboboxChoice[]> = computed<ComboboxChoice[]>(() =>
    this.choices().filter((option) => this.isVisible(option)),
  );

  /** Height of one virtualized row, by control size. */
  protected readonly rowHeight: Signal<number> = computed<number>(() => ROW_HEIGHTS[this.size()]);

  /**
   * Height of the virtual viewport: the rows it holds, capped below the panel's own limit (its 6 px of
   * padding and 2 px of border included); the panel does not scroll in this mode, the viewport does.
   */
  protected readonly viewportHeight: Signal<string> = computed<string>(
    () => `min(${this.items().length * this.rowHeight()}px, calc(min(20rem, 50dvh) - 8px))`,
  );

  /** Classes of a virtualized row: an option of the size of the control, at a fixed height. */
  protected readonly rowClasses: Signal<string> = computed<string>(() =>
    cn(menuOptionVariants({ size: this.size(), cascade: false }), ROW_CLASSES[this.size()]),
  );

  /** Virtual viewport of the open list, in `[entries]` mode. */
  private readonly viewport: Signal<CdkVirtualScrollViewport | undefined> =
    viewChild<CdkVirtualScrollViewport>(CdkVirtualScrollViewport);
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Keeps the active row of a virtualized list within the viewport, scrolling it by the least amount:
   * an off-screen row does not exist, so the base class cannot scroll it into view.
   */
  public constructor() {
    super();
    afterRenderEffect((): void => {
      const viewport: CdkVirtualScrollViewport | undefined = this.viewport();
      const active: ComboboxChoice | null = this.activeItem();
      if (!viewport || !active) return;
      const index: number = this.items().indexOf(active);
      if (index < 0) return;
      const height: number = this.rowHeight();
      const top: number = index * height;
      const offset: number = viewport.measureScrollOffset();
      const size: number = viewport.getViewportSize();
      if (top < offset) viewport.scrollToOffset(top);
      else if (top + height > offset + size) viewport.scrollToOffset(top + height - size);
    });
  }
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
    const option: ComboboxChoice = item as ComboboxChoice;
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

  /** Identity of a virtualized row for `cdkVirtualFor`. */
  protected trackChoice(_index: number, choice: ComboboxChoice): string {
    return choice.id;
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
   * @param {ComboboxChoice} option - Selected option.
   * @returns {void}
   */
  protected commit(option: ComboboxChoice): void {
    this.value.set(option.value() as T);
    if (this.clearOnSelect()) {
      this.clear();
      return;
    }
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
