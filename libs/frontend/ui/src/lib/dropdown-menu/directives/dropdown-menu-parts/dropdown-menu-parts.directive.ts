import { CdkMenuGroup } from '@angular/cdk/menu';
import {
  Directive,
  computed,
  input,
  type InputSignal,
  type InputSignalWithTransform,
  type Signal,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import {
  menuLabelClasses,
  menuSeparatorClasses,
  menuShortcutClasses,
} from '@internal/ui/lib/menu-panel/constants/menu-panel.constants';

/**
 * Class DropdownMenuLabelDirective
 * @class DropdownMenuLabelDirective
 *
 * @description
 * Styles a non-interactive heading that names a related section of menu rows.
 */
@Directive({
  selector: '[uiDropdownMenuLabel]',
  host: { '[class]': 'classes()', 'data-slot': 'dropdown-menu-label' },
})
export class DropdownMenuLabelDirective {
  // #region Properties
  /**
   * Property inset
   * @readonly
   *
   * @description
   * Reserves leading space to align the label with menu rows carrying an indicator.
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
   * Additional classes merged with the shared menu label style.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Shared menu label typography with optional indicator alignment and caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(menuLabelClasses, this.inset() && 'pl-8', this.class()),
  );
  // #endregion
}

/**
 * Class DropdownMenuGroupDirective
 * @class DropdownMenuGroupDirective
 *
 * @description
 * Groups related CDK menu rows so they are exposed as one accessible group.
 */
@Directive({
  selector: '[uiDropdownMenuGroup]',
  hostDirectives: [CdkMenuGroup],
  host: { 'data-slot': 'dropdown-menu-group' },
})
export class DropdownMenuGroupDirective {}

/**
 * Class DropdownMenuSeparatorDirective
 * @class DropdownMenuSeparatorDirective
 *
 * @description
 * Renders a decorative horizontal separator between related groups of menu rows.
 */
@Directive({
  selector: '[uiDropdownMenuSeparator]',
  host: {
    role: 'separator',
    'aria-orientation': 'horizontal',
    '[class]': 'classes()',
    'data-slot': 'dropdown-menu-separator',
  },
})
export class DropdownMenuSeparatorDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the shared menu divider style.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Shared separator treatment combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(menuSeparatorClasses, this.class()),
  );
  // #endregion
}

/**
 * Class DropdownMenuShortcutDirective
 * @class DropdownMenuShortcutDirective
 *
 * @description
 * Styles a trailing keyboard shortcut label within a menu row.
 */
@Directive({
  selector: '[uiDropdownMenuShortcut]',
  host: { '[class]': 'classes()', 'data-slot': 'dropdown-menu-shortcut' },
})
export class DropdownMenuShortcutDirective {
  // #region Properties
  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the shared keyboard shortcut style.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Shared shortcut typography combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(menuShortcutClasses, this.class()),
  );
  // #endregion
}
