import { FocusKeyManager } from '@angular/cdk/a11y';
import { type Direction, Directionality } from '@angular/cdk/bidi';
import {
  type InputSignal,
  type InputSignalWithTransform,
  type ModelSignal,
  type OutputEmitterRef,
  type WritableSignal,
  DestroyRef,
  Directive,
  ElementRef,
  Injector,
  type Signal,
  booleanAttribute,
  computed,
  contentChildren,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import {
  type ToggleSize,
  type ToggleVariant,
  toggleVariants,
} from '@internal/ui/lib/toggle/constants/toggle.variants';
import type { ToggleGroupOrientation } from '@internal/ui/lib/toggle-group/models/toggle-group/toggle-group-orientation.type';
import type { ToggleGroupType } from '@internal/ui/lib/toggle-group/models/toggle-group/toggle-group-type.type';
import type { ToggleGroupValue } from '@internal/ui/lib/toggle-group/models/toggle-group/toggle-group-value.type';

/**
 * Directive ToggleGroupItemDirective
 * @class ToggleGroupItemDirective
 *
 * @description
 * Connects a native button to its containing toggle group, exposing pressed state and participating in roving focus.
 */
@Directive({
  selector: 'button[uiToggleGroupItem]',
  host: {
    type: 'button',
    'data-slot': 'toggle-group-item',
    '[class]': 'classes()',
    '[attr.aria-pressed]': 'pressed()',
    '[tabIndex]': 'tabbable() ? 0 : -1',
    '[disabled]': 'isDisabled()',
    '(click)': 'onClick()',
    '(focus)': 'group.onItemFocus(this)',
  },
})
export class ToggleGroupItemDirective {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Required option value used by the group to compare selection state and update its model.
   *
   * @type {InputSignal<unknown>}
   */
  public readonly value: InputSignal<unknown> = input.required<unknown>();

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Locally disables the button in addition to the group's disabled state.
   *
   * @type {import('@angular/core').InputSignalWithTransform<boolean, unknown>}
   */
  public readonly disabled: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    {
      transform: booleanAttribute,
    },
  );

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional caller classes merged with group variant classes.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property group
   * @readonly
   *
   * @description
   * Containing group that owns item selection, availability and keyboard focus.
   *
   * @type {ToggleGroupDirective<unknown>}
   */
  protected readonly group: ToggleGroupDirective<unknown> =
    inject<ToggleGroupDirective>(ToggleGroupDirective);

  /**
   * Property element
   * @readonly
   *
   * @description
   * Native button used for direct focus and target identity checks.
   *
   * @type {HTMLButtonElement}
   */
  private readonly element: HTMLButtonElement =
    inject<ElementRef<HTMLButtonElement>>(ElementRef).nativeElement;

  /**
   * Property pressed
   * @readonly
   *
   * @description
   * Whether the group currently includes this item's value in its selection model.
   *
   * @type {Signal<boolean>}
   */
  public readonly pressed: Signal<boolean> = computed<boolean>((): boolean =>
    this.group.isPressed(this.value()),
  );

  /**
   * Property isDisabled
   * @readonly
   *
   * @description
   * Effective disabled state combining the item's input with its containing group's state.
   *
   * @type {Signal<boolean>}
   */
  public readonly isDisabled: Signal<boolean> = computed<boolean>(
    (): boolean => this.disabled() || this.group.disabled(),
  );

  /**
   * Property tabbable
   * @readonly
   *
   * @description
   * Whether this item is the group's single enabled tab stop.
   *
   * @type {Signal<boolean>}
   */
  protected readonly tabbable: Signal<boolean> = computed<boolean>(
    (): boolean => this.group.tabbableItem() === this,
  );

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Merged toggle variant and caller classes applied to the button.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(toggleVariants({ variant: this.group.variant(), size: this.group.size() }), this.class()),
  );
  // #endregion

  // #region Methods
  /**
   * Method focus
   * @method focus
   *
   * @description
   * Moves browser focus to the native toggle button.
   *
   * @param {FocusOptions} options - Optional browser focus configuration.
   * @returns {void}
   */
  public focus(options?: FocusOptions): void {
    this.element.focus(options);
  }

  /**
   * Method owns
   * @method owns
   *
   * @description
   * Checks whether an event target is this item's native button.
   *
   * @param {EventTarget | null} target - Event target to compare.
   * @returns {boolean} Whether the target is the item element.
   */
  public owns(target: EventTarget | null): boolean {
    return this.element === target;
  }

  /**
   * Method onClick
   * @method onClick
   *
   * @description
   * Delegates a click to the group only while the effective item state is enabled.
   *
   * @returns {void}
   */
  protected onClick(): void {
    if (!this.isDisabled()) {
      this.group.toggle(this.value());
    }
  }
  // #endregion
}

/**
 * Directive ToggleGroupDirective
 * @class ToggleGroupDirective
 * @template T
 *
 * @description
 * Provides a Signal Forms-compatible selection group with one tab stop and directional keyboard navigation. Single
 * mode stores one selected value or null; multiple mode stores a readonly value array.
 */
@Directive({
  selector: '[uiToggleGroup]',
  host: {
    role: 'group',
    'data-slot': 'toggle-group',
    '[class]': 'classes()',
    '[attr.data-orientation]': 'orientation()',
    '[attr.aria-disabled]': 'disabled() || null',
    '(keydown)': 'onKeydown($event)',
    '(focusout)': 'onFocusout($event)',
  },
})
export class ToggleGroupDirective<T = unknown> implements FormValueControl<ToggleGroupValue<T>> {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Writable selection model whose shape depends on the active selection mode.
   *
   * @type {ModelSignal<ToggleGroupValue<T>>}
   */
  public readonly value: ModelSignal<ToggleGroupValue<T>> = model<ToggleGroupValue<T>>(null);

  /**
   * Property type
   * @readonly
   *
   * @description
   * Chooses whether selection contains one value or a list of values.
   *
   * @type {InputSignal<ToggleGroupType>}
   */
  public readonly type: InputSignal<ToggleGroupType> = input<ToggleGroupType>('single');

  /**
   * Property required
   * @readonly
   *
   * @description
   * In single mode, keeps one value pressed: pressing the active item again does not clear the
   * selection, as a status filter or a segmented control expects.
   *
   * @type {import('@angular/core').InputSignalWithTransform<boolean, unknown>}
   */
  public readonly required: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    {
      transform: booleanAttribute,
    },
  );

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Disables the group and all its child items.
   *
   * @type {import('@angular/core').InputSignalWithTransform<boolean, unknown>}
   */
  public readonly disabled: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    {
      transform: booleanAttribute,
    },
  );

  /**
   * Property variant
   * @readonly
   *
   * @description
   * Toggle style applied consistently to each child item.
   *
   * @type {InputSignal<ToggleVariant>}
   */
  public readonly variant: InputSignal<ToggleVariant> = input<ToggleVariant>('default');

  /**
   * Property size
   * @readonly
   *
   * @description
   * Toggle size applied consistently to each child item.
   *
   * @type {InputSignal<ToggleSize>}
   */
  public readonly size: InputSignal<ToggleSize> = input<ToggleSize>('md');

  /**
   * Property orientation
   * @readonly
   *
   * @description
   * Layout orientation and matching arrow-key navigation axis.
   *
   * @type {InputSignal<ToggleGroupOrientation>}
   */
  public readonly orientation: InputSignal<ToggleGroupOrientation> =
    input<ToggleGroupOrientation>('horizontal');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged onto the group host.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property touch
   * @readonly
   *
   * @description
   * Emits when focus leaves the group so Signal Forms can mark the control as touched.
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly touch: OutputEmitterRef<void> = output<void>();

  /**
   * Property items
   * @readonly
   *
   * @description
   * Descendant toggle buttons participating in selection and roving focus.
   *
   * @type {Signal<readonly ToggleGroupItemDirective[]>}
   */
  public readonly items: Signal<readonly ToggleGroupItemDirective[]> =
    contentChildren<ToggleGroupItemDirective>(ToggleGroupItemDirective, { descendants: true });

  /**
   * Property tabbableItem
   * @readonly
   *
   * @description
   * Single enabled tab stop, preferring the last focused item, then a pressed item, then the first enabled item.
   *
   * @type {Signal<ToggleGroupItemDirective | undefined>}
   */
  public readonly tabbableItem: Signal<ToggleGroupItemDirective | undefined> = computed<
    ToggleGroupItemDirective | undefined
  >((): ToggleGroupItemDirective | undefined => {
    const enabled: ToggleGroupItemDirective[] = this.items().filter(
      (item: ToggleGroupItemDirective): boolean => !item.isDisabled(),
    );
    const focused: ToggleGroupItemDirective | null = this.focused();
    if (focused && enabled.includes(focused)) {
      return focused;
    }
    return enabled.find((item: ToggleGroupItemDirective): boolean => item.pressed()) ?? enabled[0];
  });

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Group layout classes adjusted for vertical orientation and caller additions.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>((): string =>
    cn(
      'inline-flex items-center gap-1',
      this.orientation() === 'vertical' && 'flex-col items-stretch',
      this.class(),
    ),
  );

  /**
   * Property focused
   * @readonly
   *
   * @description
   * Last focused child item used to retain the group's roving tab stop.
   *
   * @type {WritableSignal<ToggleGroupItemDirective | null>}
   */
  private readonly focused: WritableSignal<ToggleGroupItemDirective | null> =
    signal<ToggleGroupItemDirective | null>(null);

  /**
   * Property host
   * @readonly
   *
   * @description
   * Native group host used to detect when focus leaves the component boundary.
   *
   * @type {HTMLElement}
   */
  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Property direction
   * @readonly
   *
   * @description
   * Inherited text direction passed to horizontal keyboard navigation.
   *
   * @type {'ltr' | 'rtl'}
   */
  private readonly direction: Direction = inject<Directionality>(Directionality).value;

  /**
   * Property keyManager
   * @readonly
   *
   * @description
   * CDK manager that wraps focus among enabled items and supports Home/End navigation.
   *
   * @type {FocusKeyManager<{ focus: () => void; readonly disabled: boolean; }>}
   */
  private readonly keyManager: FocusKeyManager<{ focus: () => void; readonly disabled: boolean }> =
    new FocusKeyManager(
      computed<{ focus: () => void; readonly disabled: boolean }[]>(
        (): { focus: () => void; readonly disabled: boolean }[] =>
          this.items().map(
            (
              item: ToggleGroupItemDirective,
            ): { focus: () => void; readonly disabled: boolean } => ({
              focus: (): void => item.focus(),
              get disabled(): boolean {
                return item.isDisabled();
              },
            }),
          ),
      ),
      inject<Injector>(Injector),
    )
      .withWrap()
      .withHomeAndEnd();
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Destroys the CDK key manager with the directive's lifecycle.
   */
  public constructor() {
    inject<DestroyRef>(DestroyRef).onDestroy((): void => this.keyManager.destroy());
  }
  // #endregion

  // #region Methods
  /**
   * Method isPressed
   * @method isPressed
   *
   * @description
   * Checks the current selected value using scalar equality in single mode or array membership in multiple mode.
   *
   * @param {unknown} value - Candidate option value.
   * @returns {boolean} Whether the candidate is currently pressed.
   */
  public isPressed(value: unknown): boolean {
    const current: ToggleGroupValue<T> = this.value();
    return this.type() === 'multiple'
      ? Array.isArray(current) && current.includes(value)
      : current !== null && Object.is(current, value);
  }

  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Selects or clears a value in single mode (never clears when `required`), or adds/removes it from the readonly selection list in multiple mode.
   *
   * @param {T} value - Option value to toggle.
   * @returns {void}
   */
  public toggle(value: T): void {
    if (this.type() === 'single') {
      if (this.isPressed(value) && this.required()) {
        return;
      }
      this.value.set(this.isPressed(value) ? null : value);
      return;
    }
    const current: readonly T[] = Array.isArray(this.value()) ? (this.value() as readonly T[]) : [];
    this.value.set(
      current.includes(value)
        ? current.filter((item: T): boolean => item !== value)
        : [...current, value],
    );
  }

  /**
   * Method onItemFocus
   * @method onItemFocus
   *
   * @description
   * Remembers the focused child so it remains the group's tab stop when focus returns.
   *
   * @param {ToggleGroupItemDirective} item - Child item that received focus.
   * @returns {void}
   */
  public onItemFocus(item: ToggleGroupItemDirective): void {
    this.focused.set(item);
  }

  /**
   * Method focus
   * @method focus
   *
   * @description
   * Focuses the current tabbable item when an item is available.
   *
   * @param {FocusOptions} options - Optional browser focus configuration.
   * @returns {void}
   */
  public focus(options?: FocusOptions): void {
    this.tabbableItem()?.focus(options);
  }

  /**
   * Method onKeydown
   * @method onKeydown
   *
   * @description
   * Routes keyboard navigation through the CDK manager when the event originated from a group item, using the
   * configured orientation and text direction.
   *
   * @param {KeyboardEvent} event - Keyboard event from the group host.
   * @returns {void}
   */
  protected onKeydown(event: KeyboardEvent): void {
    const index: number = this.items().findIndex((item: ToggleGroupItemDirective): boolean =>
      item.owns(event.target),
    );
    if (index < 0) {
      return;
    }
    const vertical: boolean = this.orientation() === 'vertical';
    this.keyManager
      .withVerticalOrientation(vertical)
      .withHorizontalOrientation(vertical ? null : this.direction);
    this.keyManager.updateActiveItem(index);
    this.keyManager.onKeydown(event);
  }

  /**
   * Method onFocusout
   * @method onFocusout
   *
   * @description
   * Emits the touch event only when focus moves outside the group host.
   *
   * @param {FocusEvent} event - Focus transition from the group host.
   * @returns {void}
   */
  protected onFocusout(event: FocusEvent): void {
    if (!this.host.contains(event.relatedTarget as Node | null)) {
      this.touch.emit();
    }
  }
  // #endregion
}
