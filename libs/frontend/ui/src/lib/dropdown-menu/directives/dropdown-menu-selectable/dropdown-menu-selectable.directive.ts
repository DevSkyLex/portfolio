import { CdkMenuGroup, CdkMenuItemCheckbox, CdkMenuItemRadio } from '@angular/cdk/menu';
import {
  Directive,
  computed,
  effect,
  inject,
  input,
  model,
  type InputSignal,
  type ModelSignal,
  type Signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import { menuOptionVariants } from '@internal/ui/lib/menu-panel/constants/menu-option.variants';
import { injectCascadeIndex } from '@internal/ui/lib/menu-panel/injection/menu-row/menu-row';

/**
 * Class DropdownMenuCheckboxItemDirective
 * @class DropdownMenuCheckboxItemDirective
 *
 * @description
 * Binds a checkbox menu item to a two-way checked model, toggling its value while leaving the menu
 * open as the CDK checkbox item behavior requires.
 */
@Directive({
  selector: '[uiDropdownMenuCheckboxItem]',
  hostDirectives: [
    {
      directive: CdkMenuItemCheckbox,
      inputs: ['cdkMenuItemDisabled: disabled'],
      outputs: ['cdkMenuItemTriggered: triggered'],
    },
  ],
  host: { '[class]': 'classes()', 'data-slot': 'dropdown-menu-checkbox-item' },
})
export class DropdownMenuCheckboxItemDirective {
  // #region Properties
  /**
   * Property checked
   * @readonly
   *
   * @description
   * Two-way checked state synchronized with the CDK checkbox menu item.
   *
   * @type {ModelSignal<boolean>}
   */
  public readonly checked: ModelSignal<boolean> = model<boolean>(false);

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the inset checkbox-row appearance.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Inset menu option styling combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(menuOptionVariants({ inset: true }), this.class()),
  );
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Synchronizes the checked model with the CDK item and flips that model on activation.
   */
  public constructor() {
    const item: CdkMenuItemCheckbox = inject<CdkMenuItemCheckbox>(CdkMenuItemCheckbox, {
      self: true,
    });
    effect(() => {
      item.checked = this.checked();
    });
    item.triggered.pipe(takeUntilDestroyed()).subscribe(() => this.checked.update((on) => !on));
    injectCascadeIndex();
  }
  // #endregion
}

/**
 * Class DropdownMenuRadioGroupDirective
 * @class DropdownMenuRadioGroupDirective
 *
 * @description
 * Holds the selected value shared by mutually exclusive radio menu rows.
 *
 * @template T - Value type selected by the group's radio items.
 */
@Directive({
  selector: '[uiDropdownMenuRadioGroup]',
  hostDirectives: [CdkMenuGroup],
  host: { 'data-slot': 'dropdown-menu-radio-group' },
})
export class DropdownMenuRadioGroupDirective<T = unknown> {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Two-way selected value shared by radio rows in this group.
   *
   * @type {ModelSignal<T | undefined>}
   */
  public readonly value: ModelSignal<T | undefined> = model<T>();
  // #endregion
}

/**
 * Class DropdownMenuRadioItemDirective
 * @class DropdownMenuRadioItemDirective
 *
 * @description
 * Connects a radio menu item to its optional parent group's selected value and shared indicator.
 */
@Directive({
  selector: '[uiDropdownMenuRadioItem]',
  hostDirectives: [
    {
      directive: CdkMenuItemRadio,
      inputs: ['cdkMenuItemDisabled: disabled'],
      outputs: ['cdkMenuItemTriggered: triggered'],
    },
  ],
  host: { '[class]': 'classes()', 'data-slot': 'dropdown-menu-radio-item' },
})
export class DropdownMenuRadioItemDirective {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Required choice value compared with and written to the parent radio group.
   *
   * @type {InputSignal<unknown>}
   */
  public readonly value: InputSignal<unknown> = input.required<unknown>();

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the radio-row appearance.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property group
   * @readonly
   *
   * @description
   * Optional parent group that owns the shared selected value.
   *
   * @type {DropdownMenuRadioGroupDirective<unknown> | null}
   */
  private readonly group: DropdownMenuRadioGroupDirective<unknown> | null =
    inject<DropdownMenuRadioGroupDirective>(DropdownMenuRadioGroupDirective, { optional: true });

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Radio option styling (no start inset: the check sits at the end) combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(menuOptionVariants(), this.class()),
  );

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Mirrors the parent group's value into the CDK radio item and writes back on activation.
   */
  public constructor() {
    const item: CdkMenuItemRadio = inject<CdkMenuItemRadio>(CdkMenuItemRadio, { self: true });
    effect(() => {
      item.checked = this.group?.value() === this.value();
    });
    item.triggered.pipe(takeUntilDestroyed()).subscribe(() => this.group?.value.set(this.value()));
    injectCascadeIndex();
  }
  // #endregion
}
