import { CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import {
  Directive,
  computed,
  inject,
  input,
  type InputSignal,
  type InputSignalWithTransform,
  type Signal,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import {
  type MenuItemVariant,
  menuOptionVariants,
} from '@internal/ui/lib/menu-panel/constants/menu-option.variants';
import { submenuPositions } from '@internal/ui/lib/menu-panel/constants/menu-panel.constants';
import { injectCascadeIndex } from '@internal/ui/lib/menu-panel/injection/menu-row/menu-row';

/**
 * Class DropdownMenuItemDirective
 * @class DropdownMenuItemDirective
 *
 * @description
 * Applies shared menu-row styling to a CDK menu item and exposes its visual variant and inset state.
 */
@Directive({
  selector: '[uiDropdownMenuItem]',
  hostDirectives: [
    {
      directive: CdkMenuItem,
      inputs: ['cdkMenuItemDisabled: disabled'],
      outputs: ['cdkMenuItemTriggered: triggered'],
    },
  ],
  host: {
    '[class]': 'classes()',
    'data-slot': 'dropdown-menu-item',
    '[attr.data-variant]': 'variant()',
  },
})
export class DropdownMenuItemDirective {
  // #region Properties
  /**
   * Property variant
   * @readonly
   *
   * @description
   * Menu row appearance, including the danger treatment for destructive actions.
   *
   * @type {InputSignal<MenuItemVariant>}
   */
  public readonly variant: InputSignal<MenuItemVariant> = input<MenuItemVariant>('default');

  /**
   * Property inset
   * @readonly
   *
   * @description
   * Reserves leading space so the label aligns with rows that display a check or radio indicator.
   *
   * @type {InputSignalWithTransform<boolean, boolean | ''>}
   */
  public readonly inset: InputSignalWithTransform<boolean, boolean | ''> = input<
    boolean,
    boolean | ''
  >(false, {
    transform: (value: boolean | '') => value === '' || value,
  });

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the shared menu option variant.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Shared option styles computed from variant and inset inputs, combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(menuOptionVariants({ variant: this.variant(), inset: this.inset() }), this.class()),
  );
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Assigns the row's cascade index so its entrance animation follows its order in the panel.
   */
  public constructor() {
    injectCascadeIndex();
  }
  // #endregion
}

/**
 * Class DropdownMenuSubTriggerDirective
 * @class DropdownMenuSubTriggerDirective
 *
 * @description
 * Styles a CDK submenu trigger and places its nested panel beside the parent row.
 */
@Directive({
  selector: '[uiDropdownMenuSubTrigger]',
  hostDirectives: [
    { directive: CdkMenuTrigger, inputs: ['cdkMenuTriggerFor: uiDropdownMenuSubTrigger'] },
    { directive: CdkMenuItem, inputs: ['cdkMenuItemDisabled: disabled'] },
  ],
  host: { '[class]': 'classes()', 'data-slot': 'dropdown-menu-sub-trigger' },
})
export class DropdownMenuSubTriggerDirective {
  // #region Properties
  /**
   * Property inset
   * @readonly
   *
   * @description
   * Reserves the leading indicator column used by aligned menu rows.
   *
   * @type {InputSignalWithTransform<boolean, boolean | ''>}
   */
  public readonly inset: InputSignalWithTransform<boolean, boolean | ''> = input<
    boolean,
    boolean | ''
  >(false, {
    transform: (value: boolean | '') => value === '' || value,
  });

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the submenu row styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Shared option style, expanded state treatment and caller classes merged for the trigger.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      menuOptionVariants({ inset: this.inset() }),
      'aria-expanded:bg-star/5 aria-expanded:text-star',
      this.class(),
    ),
  );

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Places the child panel beside its parent row and sets the row's cascade animation index.
   */
  public constructor() {
    inject<CdkMenuTrigger>(CdkMenuTrigger, { self: true }).menuPosition = submenuPositions;
    injectCascadeIndex();
  }
  // #endregion
}
