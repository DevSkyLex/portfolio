import type { ConnectedPosition } from '@angular/cdk/overlay';
import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import { DOCUMENT } from '@angular/common';
import {
  Directive,
  type ElementRef,
  type Signal,
  afterRenderEffect,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import type { InputSize } from '@internal/ui/lib/input/constants/input.variants';
import {
  panelPositions,
  stepItem,
} from '@internal/ui/lib/menu-panel/utils/menu-panel/menu-panel.utils';
import { menuPanelVariants } from '@internal/ui/lib/menu-panel/constants/menu-panel.variants';
import type { ComboboxItem } from '@internal/ui/lib/combobox/models/combobox/combobox-item.interface';

/**
 * Class ComboboxBase
 *
 * @description
 * Shares editable listbox interaction between combobox and autocomplete controls. Focus stays in the field; keyboard selection is exposed through its active descendant.
 *
 * @template I - Item type represented by the list.
 */
@Directive()
export abstract class ComboboxBase<I extends ComboboxItem> {
  // #region Properties
  /**
   * Property disabled
   *
   * @description
   * Prevents opening the popup and interacting with its options.
   */
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property invalid
   *
   * @description
   * Exposes validation state to the field host.
   */
  public readonly invalid: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property required
   *
   * @description
   * Exposes required state to the field host.
   */
  public readonly required: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property touch
   *
   * @description
   * Notifies the value control when the field loses focus.
   */
  public readonly touch: OutputEmitterRef<void> = output<void>();

  /**
   * Property size
   *
   * @description
   * Selects the field size used by the control.
   */
  public readonly size: InputSignal<InputSize> = input<InputSize>('md');

  /**
   * Property placeholder
   *
   * @description
   * Supplies placeholder text for the field.
   */
  public readonly placeholder: InputSignal<string> = input<string>('');

  /**
   * Property inputId
   *
   * @description
   * Supplies the field id used by associated labels and field descriptions.
   */
  public readonly inputId: InputSignal<string> = input<string>(
    inject<RenderIdService>(RenderIdService).next('ui-combobox-'),
  );

  /**
   * Property ariaLabel
   *
   * @description
   * Supplies an accessible name when no visible label is associated.
   */
  public readonly ariaLabel: InputSignal<string | undefined> = input<string>();

  /**
   * Property ariaLabelledby
   *
   * @description
   * References elements that name the field.
   */
  public readonly ariaLabelledby: InputSignal<string | undefined> = input<string>();

  /**
   * Property ariaDescribedby
   *
   * @description
   * References elements that describe the field.
   */
  public readonly ariaDescribedby: InputSignal<string | undefined> = input<string>();

  /**
   * Property class
   *
   * @description
   * Adds caller-provided classes to the text field.
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property panelClass
   *
   * @description
   * Adds caller-provided classes to the popup panel.
   */
  public readonly panelClass: InputSignal<string> = input<string>('');
  // #endregion

  // #region Traits
  /**
   * Property items
   *
   * @description
   * Supplies visible rows in their original order.
   */
  protected abstract readonly items: Signal<readonly I[]>;

  /**
   * Method commit
   *
   * @description
   * Commits a chosen row to the concrete control's value model.
   *
   * @param {I} item - Row to commit.
   * @returns {void}
   */
  protected abstract commit(item: I): void;

  /**
   * Method revert
   * @method revert
   *
   * @description
   * Restores the text corresponding to the selected value when the user leaves the list.
   *
   * @returns {void}
   */
  protected abstract revert(): void;

  /**
   * Method clear
   *
   * @description
   * Clears the concrete control's value and displayed text.
   *
   * @returns {void}
   */
  protected abstract clear(): void;

  /**
   * Property positions
   *
   * @description
   * Supplies the connected overlay's placement state.
   */
  protected readonly positions: ConnectedPosition[] = panelPositions();

  /**
   * Property listboxId
   *
   * @description
   * Derives the popup id from the field id for ARIA control association.
   */
  protected readonly listboxId: Signal<string> = computed<string>(
    () => `${this.inputId()}-listbox`,
  );

  /**
   * Property open
   *
   * @description
   * Tracks whether the popup is expanded.
   */
  protected readonly open: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property minWidth
   *
   * @description
   * Stores the field width used to size the popup.
   */
  protected readonly minWidth: WritableSignal<number> = signal<number>(0);

  /**
   * Property activeKey
   *
   * @description
   * Tracks the active row id independently of the selected value.
   */
  private readonly activeKey: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property activeItem
   *
   * @description
   * Resolves the active id only while the popup is open.
   */
  protected readonly activeItem: Signal<I | null> = computed<I | null>(() =>
    this.open() ? (this.items().find((item) => item.id === this.activeKey()) ?? null) : null,
  );

  /**
   * Property field
   *
   * @description
   * References the required native input used for focus and keyboard interaction.
   */
  protected readonly field: Signal<ElementRef<HTMLInputElement>> =
    viewChild.required<ElementRef<HTMLInputElement>>('field');

  /**
   * Property panelClasses
   *
   * @description
   * Combines shared popup styles with caller-provided panel classes.
   */
  protected readonly panelClasses: Signal<string> = computed<string>(() =>
    cn(menuPanelVariants({ scroll: true }), 'min-w-0', this.panelClass()),
  );

  /**
   * Property fieldClasses
   *
   * @description
   * Combines shared field interaction styles with caller-provided classes.
   */
  protected readonly fieldClasses: Signal<string> = computed<string>(() =>
    cn('pr-10 aria-expanded:border-signal/55 aria-expanded:hover:border-signal/55', this.class()),
  );
  // #endregion

  // #region Constructor
  /**
   * Constructor
   *
   * @description
   * Registers post-render scrolling so a newly active row remains visible in the popup.
   */
  public constructor() {
    const document: Document = inject<Document>(DOCUMENT);
    afterRenderEffect(() => {
      const id: string | undefined = this.activeItem()?.id;
      if (id) document.getElementById(id)?.scrollIntoView?.({ block: 'nearest' });
    });
  }
  // #endregion

  // #region Methods
  /**
   * Method isActive
   *
   * @description
   * Reports whether a row is the current active descendant.
   *
   * @param {ComboboxItem} item - Row to inspect.
   * @returns {boolean} Whether the row is active.
   */
  public isActive(item: ComboboxItem): boolean {
    return this.activeItem()?.id === item.id;
  }

  /**
   * Method activate
   *
   * @description
   * Activates an enabled row without changing the selected value.
   *
   * @param {ComboboxItem} item - Row to activate.
   * @returns {void}
   */
  public activate(item: ComboboxItem): void {
    if (!item.isDisabled()) this.activeKey.set(item.id);
  }

  /**
   * Method choose
   *
   * @description
   * Commits an enabled row and closes the popup.
   *
   * @param {ComboboxItem} item - Row to choose.
   * @returns {void}
   */
  public choose(item: ComboboxItem): void {
    if (item.isDisabled()) return;
    this.commit(item as I);
    this.close();
  }

  /**
   * Method focus
   *
   * @description
   * Moves focus to the field while forwarding native focus options.
   *
   * @param {FocusOptions} options - Native focus options.
   * @returns {void}
   */
  public focus(options?: FocusOptions): void {
    this.field().nativeElement.focus(options);
  }

  /**
   * Method show
   *
   * @description
   * Opens the popup and records the field width unless the control is disabled or already open.
   *
   * @returns {void}
   */
  protected show(): void {
    if (this.disabled() || this.open()) return;
    this.minWidth.set(this.field().nativeElement.offsetWidth);
    this.open.set(true);
  }

  /**
   * Method close
   *
   * @description
   * Closes the popup and clears its active descendant.
   *
   * @returns {void}
   */
  protected close(): void {
    this.open.set(false);
    this.deactivate();
  }

  /**
   * Method deactivate
   *
   * @description
   * Clears the active descendant without changing selection.
   *
   * @returns {void}
   */
  protected deactivate(): void {
    this.activeKey.set(null);
  }

  /**
   * Method move
   *
   * @description
   * Moves the active descendant to the next, previous, first, or last enabled row.
   *
   * @param {1 | -1 | 'first' | 'last'} step - Navigation direction or endpoint.
   * @returns {void}
   */
  protected move(step: 1 | -1 | 'first' | 'last'): void {
    this.activeKey.set(stepItem(this.items(), this.activeItem(), step)?.id ?? null);
  }

  /**
   * Method onTyped
   * @method onTyped
   *
   * @description
   * Opens the list after text input and makes its first matching item active.
   *
   * @returns {void}
   */
  protected onTyped(): void {
    this.show();
    this.move('first');
  }

  /**
   * Method onKeydown
   *
   * @description
   * Implements listbox keyboard behavior while preserving focus in the field.
   *
   * @param {KeyboardEvent} event - Key event from the field.
   * @returns {void}
   */
  protected onKeydown(event: KeyboardEvent): void {
    const active: I | null = this.activeItem();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.open()) {
          this.show();
          if (event.altKey) return;
        }
        this.move(this.activeItem() ? 1 : 'first');
        return;
      case 'ArrowUp':
        event.preventDefault();
        if (!this.open()) this.show();
        if (!event.altKey) this.move(this.activeItem() ? -1 : 'last');
        return;
      case 'Enter':
        if (active) {
          event.preventDefault();
          this.choose(active);
        }
        return;
      case 'Escape':
        if (this.open()) {
          event.preventDefault();
          this.close();
        } else if (this.field().nativeElement.value) {
          event.preventDefault();
          this.clear();
        }
        return;
      case 'Tab':
        this.close();
        break;
      default:
        break;
    }
  }

  /**
   * Method onBlur
   *
   * @description
   * Marks the control touched, closes the popup, and restores or clears its value.
   *
   * @returns {void}
   */
  protected onBlur(): void {
    this.touch.emit();
    this.close();
    this.revert();
  }

  /**
   * Method onOutsideClick
   *
   * @description
   * Closes the popup when a click occurs outside the field.
   *
   * @param {MouseEvent} event - Document click event to inspect.
   * @returns {void}
   */
  protected onOutsideClick(event: MouseEvent): void {
    const target: EventTarget | null = event.target;
    if (target instanceof Node && this.field().nativeElement.contains(target)) return;
    this.close();
  }
  // #endregion
}
